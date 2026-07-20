import { createHash } from 'crypto';
import {
  readdirSync, readFileSync, writeFileSync,
  existsSync, statSync
} from 'fs';
import { join, relative, extname, basename } from 'path';
import type { Finding, Severity } from './types.js';

// ─── Public Types ─────────────────────────────────────────────────────────────

export type NodeType = 'file' | 'function' | 'class' | 'import';
export type EdgeType = 'calls' | 'imports' | 'inheritance';

export interface RiskFlag {
  rule:     string;
  severity: Severity;
  line?:    number;
  message:  string;
  scanner:  string;
}

export interface GraphNode {
  id:         string;   // deterministic: "<relFile>::<type>::<name>"
  type:       NodeType;
  file:       string;   // relative path
  name:       string;
  line?:      number;
  endLine?:   number;
  risk_flags: RiskFlag[];
}

export interface GraphEdge {
  from: string; // node id
  to:   string; // node id (may be unresolved external)
  type: EdgeType;
}

export interface CodeGraph {
  generatedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Internal cache types ─────────────────────────────────────────────────────

interface FileCacheEntry {
  hash:  string;
  nodes: Omit<GraphNode, 'risk_flags'>[];
  edges: GraphEdge[];
}

interface GraphCache {
  version: number;
  files: Record<string, FileCacheEntry>;
}

const CACHE_VERSION = 1;
const CACHE_PATH_NAME = '.auditx-graph-cache.json';

// ─── File extension sets ──────────────────────────────────────────────────────

const TS_EXTS  = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const PY_EXTS  = new Set(['.py']);
const GO_EXTS  = new Set(['.go']);

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'vendor',
  '.cache', 'coverage', '.turbo', '.nx', '__pycache__', '.venv',
  'venv', 'env', '.env', 'target', 'out', '.output',
]);

// ─── ID helpers ───────────────────────────────────────────────────────────────

function makeNodeId(relFile: string, type: NodeType, name: string): string {
  return `${relFile}::${type}::${name}`;
}

function fileNodeId(relFile: string): string {
  return makeNodeId(relFile, 'file', relFile);
}

function fileHash(absPath: string): string {
  try {
    return createHash('md5').update(readFileSync(absPath)).digest('hex');
  } catch {
    return '';
  }
}

// ─── TypeScript / JavaScript AST extractor ───────────────────────────────────

interface RawSymbol {
  type:    NodeType;
  name:    string;
  line:    number;
  endLine: number;
}

interface RawEdge {
  fromName: string;
  fromType: NodeType;
  toName:   string;
  edgeType: EdgeType;
}

function extractTS(content: string, relFile: string): { symbols: RawSymbol[]; rawEdges: RawEdge[] } {
  const symbols: RawSymbol[] = [];
  const rawEdges: RawEdge[] = [];
  const lines = content.split('\n');

  // We use regex-based extraction (no actual TS compiler dep at runtime)
  // This gives us 90% accuracy without pulling in typescript as a prod dep.

  // ── Imports ──────────────────────────────────────────────────────────────
  const importRe = /^(?:import\s+(?:type\s+)?(?:\{[^}]*\}|\w+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\))/gm;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(content)) !== null) {
    const src = m[1] ?? m[2];
    if (!src) continue;
    const lineNo = content.slice(0, m.index).split('\n').length;
    const importName = `import:${src}`;
    symbols.push({ type: 'import', name: importName, line: lineNo, endLine: lineNo });
    rawEdges.push({ fromName: relFile, fromType: 'file', toName: src, edgeType: 'imports' });
  }

  // ── Classes ───────────────────────────────────────────────────────────────
  const classRe = /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/gm;
  while ((m = classRe.exec(content)) !== null) {
    const className = m[1];
    const lineNo = content.slice(0, m.index).split('\n').length;
    const endLine = findBlockEnd(lines, lineNo - 1);
    symbols.push({ type: 'class', name: className, line: lineNo, endLine });

    if (m[2]) {
      rawEdges.push({ fromName: className, fromType: 'class', toName: m[2], edgeType: 'inheritance' });
    }
    if (m[3]) {
      for (const iface of m[3].split(',').map(s => s.trim()).filter(Boolean)) {
        rawEdges.push({ fromName: className, fromType: 'class', toName: iface, edgeType: 'inheritance' });
      }
    }
  }

  // ── Functions / methods ───────────────────────────────────────────────────
  const fnRe = /(?:^|\s)(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(|(?:^|\s)(?:public|private|protected|static|async|\s)+\s+(\w+)\s*\([^)]*\)\s*(?::\s*\S+\s*)?\{/gm;
  while ((m = fnRe.exec(content)) !== null) {
    const fnName = m[1] ?? m[2];
    if (!fnName || /^(if|for|while|switch|catch)$/.test(fnName)) continue;
    const lineNo = content.slice(0, m.index).split('\n').length;
    const endLine = findBlockEnd(lines, lineNo - 1);
    symbols.push({ type: 'function', name: fnName, line: lineNo, endLine });
  }

  // ── Arrow function assignments ────────────────────────────────────────────
  const arrowRe = /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*\S+\s*)?\s*=>/gm;
  while ((m = arrowRe.exec(content)) !== null) {
    const fnName = m[1];
    const lineNo = content.slice(0, m.index).split('\n').length;
    const endLine = findBlockEnd(lines, lineNo - 1);
    symbols.push({ type: 'function', name: fnName, line: lineNo, endLine });
  }

  // ── Call expressions (lightweight: identifier followed by `(`) ────────────
  const callRe = /\b(\w+)\s*\(/g;
  const BUILTINS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return',
    'typeof', 'instanceof', 'new', 'console', 'Math', 'Object', 'Array',
    'String', 'Number', 'Boolean', 'Promise', 'require', 'import']);
  while ((m = callRe.exec(content)) !== null) {
    const callee = m[1];
    if (BUILTINS.has(callee) || callee[0] === callee[0].toLowerCase() === false) continue;
    if (callee.length < 3) continue;
    rawEdges.push({ fromName: relFile, fromType: 'file', toName: callee, edgeType: 'calls' });
  }

  return { symbols, rawEdges };
}

// ─── Python extractor ─────────────────────────────────────────────────────────

function extractPython(content: string, relFile: string): { symbols: RawSymbol[]; rawEdges: RawEdge[] } {
  const symbols: RawSymbol[] = [];
  const rawEdges: RawEdge[] = [];
  const lines = content.split('\n');

  // imports
  const importRe = /^(?:from\s+([\w.]+)\s+import|import\s+([\w.,\s]+))/gm;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(content)) !== null) {
    const src = m[1] ?? m[2].split(',')[0].trim();
    const lineNo = content.slice(0, m.index).split('\n').length;
    symbols.push({ type: 'import', name: `import:${src}`, line: lineNo, endLine: lineNo });
    rawEdges.push({ fromName: relFile, fromType: 'file', toName: src, edgeType: 'imports' });
  }

  // classes
  const classRe = /^class\s+(\w+)(?:\((\w+)\))?:/gm;
  while ((m = classRe.exec(content)) !== null) {
    const lineNo = content.slice(0, m.index).split('\n').length;
    const endLine = findIndentedBlockEnd(lines, lineNo - 1);
    symbols.push({ type: 'class', name: m[1], line: lineNo, endLine });
    if (m[2]) rawEdges.push({ fromName: m[1], fromType: 'class', toName: m[2], edgeType: 'inheritance' });
  }

  // functions/methods
  const fnRe = /^(?:    )?def\s+(\w+)\s*\(/gm;
  while ((m = fnRe.exec(content)) !== null) {
    const lineNo = content.slice(0, m.index).split('\n').length;
    const endLine = findIndentedBlockEnd(lines, lineNo - 1);
    symbols.push({ type: 'function', name: m[1], line: lineNo, endLine });
  }

  return { symbols, rawEdges };
}

// ─── Go extractor ─────────────────────────────────────────────────────────────

function extractGo(content: string, relFile: string): { symbols: RawSymbol[]; rawEdges: RawEdge[] } {
  const symbols: RawSymbol[] = [];
  const rawEdges: RawEdge[] = [];
  const lines = content.split('\n');

  const importRe = /import\s+"([\w./]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(content)) !== null) {
    const lineNo = content.slice(0, m.index).split('\n').length;
    symbols.push({ type: 'import', name: `import:${m[1]}`, line: lineNo, endLine: lineNo });
    rawEdges.push({ fromName: relFile, fromType: 'file', toName: m[1], edgeType: 'imports' });
  }

  const structRe = /^type\s+(\w+)\s+struct\s*\{/gm;
  while ((m = structRe.exec(content)) !== null) {
    const lineNo = content.slice(0, m.index).split('\n').length;
    const endLine = findBlockEnd(lines, lineNo - 1);
    symbols.push({ type: 'class', name: m[1], line: lineNo, endLine });
  }

  const fnRe = /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/gm;
  while ((m = fnRe.exec(content)) !== null) {
    const lineNo = content.slice(0, m.index).split('\n').length;
    const endLine = findBlockEnd(lines, lineNo - 1);
    symbols.push({ type: 'function', name: m[1], line: lineNo, endLine });
  }

  return { symbols, rawEdges };
}

// ─── Block end helpers ────────────────────────────────────────────────────────

function findBlockEnd(lines: string[], startIdx: number): number {
  let depth = 0;
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return i + 1;
      }
    }
    if (i === startIdx && depth === 0) break;
  }
  return Math.min(startIdx + 50, lines.length);
}

function findIndentedBlockEnd(lines: string[], startIdx: number): number {
  const baseIndent = (lines[startIdx] ?? '').match(/^(\s*)/)?.[1]?.length ?? 0;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
    if (indent <= baseIndent) return i;
  }
  return lines.length;
}

// ─── Per-file extractor dispatcher ───────────────────────────────────────────

function extractFile(
  absPath: string,
  relFile: string,
): { nodes: Omit<GraphNode, 'risk_flags'>[]; edges: GraphEdge[] } {
  const ext = extname(absPath).toLowerCase();
  let content = '';
  try {
    content = readFileSync(absPath, 'utf-8');
  } catch {
    return { nodes: [], edges: [] };
  }

  const fileId = fileNodeId(relFile);
  const fileNode: Omit<GraphNode, 'risk_flags'> = {
    id:   fileId,
    type: 'file',
    file: relFile,
    name: basename(absPath),
  };

  let symbols: RawSymbol[] = [];
  let rawEdges: RawEdge[] = [];

  if (TS_EXTS.has(ext)) {
    ({ symbols, rawEdges } = extractTS(content, relFile));
  } else if (PY_EXTS.has(ext)) {
    ({ symbols, rawEdges } = extractPython(content, relFile));
  } else if (GO_EXTS.has(ext)) {
    ({ symbols, rawEdges } = extractGo(content, relFile));
  } else {
    // Unknown: file node only
    return { nodes: [fileNode], edges: [] };
  }

  // Deduplicate symbols by type+name (keep first occurrence)
  const seen = new Set<string>();
  const nodes: Omit<GraphNode, 'risk_flags'>[] = [fileNode];
  for (const sym of symbols) {
    const key = `${sym.type}::${sym.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    nodes.push({
      id:      makeNodeId(relFile, sym.type, sym.name),
      type:    sym.type,
      file:    relFile,
      name:    sym.name,
      line:    sym.line,
      endLine: sym.endLine,
    });
  }

  // Resolve raw edges → GraphEdges using node ids in this file
  const nameToId = new Map<string, string>();
  for (const n of nodes) nameToId.set(n.name, n.id);

  const edges: GraphEdge[] = [];
  const edgeSeen = new Set<string>();

  for (const re of rawEdges) {
    const fromId = nameToId.get(re.fromName) ?? fileId;
    // toId: may be external (unresolved); use best-effort file-local lookup
    const toId = nameToId.get(re.toName) ?? `external::${re.toName}`;
    const edgeKey = `${fromId}→${toId}:${re.edgeType}`;
    if (edgeSeen.has(edgeKey)) continue;
    edgeSeen.add(edgeKey);
    edges.push({ from: fromId, to: toId, type: re.edgeType });
  }

  return { nodes, edges };
}

// ─── Directory walker ─────────────────────────────────────────────────────────

const GRAPH_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go',
]);

function walkDir(
  dir: string,
  rootDir: string,
  excludes: string[],
  result: string[] = [],
): string[] {
  let entries: import('fs').Dirent[] = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as unknown as import('fs').Dirent[];
  } catch { return result; }

  for (const entry of entries) {
    const abs = join(dir, entry.name);
    const rel = relative(rootDir, abs).replace(/\\/g, '/');

    if (excludes.some(ex => rel.includes(ex.replace(/\\/g, '/')))) continue;

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walkDir(abs, rootDir, excludes, result);
    } else if (GRAPH_EXTS.has(extname(entry.name).toLowerCase())) {
      result.push(abs);
    }
  }
  return result;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function loadCache(rootDir: string): GraphCache {
  const cachePath = join(rootDir, CACHE_PATH_NAME);
  if (!existsSync(cachePath)) return { version: CACHE_VERSION, files: {} };
  try {
    const parsed = JSON.parse(readFileSync(cachePath, 'utf-8')) as GraphCache;
    if (parsed.version !== CACHE_VERSION) return { version: CACHE_VERSION, files: {} };
    return parsed;
  } catch {
    return { version: CACHE_VERSION, files: {} };
  }
}

function saveCache(rootDir: string, cache: GraphCache): void {
  try {
    writeFileSync(join(rootDir, CACHE_PATH_NAME), JSON.stringify(cache), 'utf-8');
  } catch { /* best-effort */ }
}

// ─── Finding → Node attachment ────────────────────────────────────────────────

function attachFindings(
  nodes: GraphNode[],
  findings: Finding[],
  rootDir: string,
): void {
  // Build a lookup: relFile → nodes (sorted by line so we can binary-search)
  const byFile = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const list = byFile.get(n.file) ?? [];
    list.push(n);
    byFile.set(n.file, list);
  }

  for (const finding of findings) {
    if (!finding.file) continue;

    // Normalise to relative path (findings may carry absolute paths)
    let rel = finding.file.replace(/\\/g, '/');
    const rootRel = relative(rootDir, finding.file).replace(/\\/g, '/');
    if (existsSync(finding.file)) rel = rootRel; // use relative form when path is absolute

    const fileNodes = byFile.get(rel);
    if (!fileNodes) continue;

    const flag: RiskFlag = {
      rule:     finding.rule ?? finding.scanner,
      severity: finding.severity,
      line:     finding.line,
      message:  finding.title,
      scanner:  finding.scanner,
    };

    // Find deepest node whose line range covers the finding line
    const fLine = finding.line ?? 0;
    let best: GraphNode | undefined;
    for (const n of fileNodes) {
      if (n.type === 'file') continue; // file is fallback
      if (n.line !== undefined && n.endLine !== undefined) {
        if (fLine >= n.line && fLine <= n.endLine) {
          // Pick the deepest (most specific) covering node
          if (!best || (n.endLine - n.line < (best.endLine! - best.line!))) {
            best = n;
          }
        }
      }
    }

    // Fall back to file node
    if (!best) {
      best = fileNodes.find(n => n.type === 'file');
    }

    if (best) {
      best.risk_flags.push(flag);
    }
  }
}

// ─── Main public API ──────────────────────────────────────────────────────────

/**
 * Build (or incrementally update) the code knowledge graph for `rootDir`.
 * Attaches `findings` as `risk_flags` on owning AST nodes.
 * Writes `auditx-graph.json` and updates `.auditx-graph-cache.json`.
 */
export async function buildCodeGraph(
  rootDir: string,
  findings: Finding[],
  excludes: string[] = [],
): Promise<CodeGraph> {
  const cache = loadCache(rootDir);
  const allFiles = walkDir(rootDir, rootDir, excludes);

  const allNodes: GraphNode[] = [];
  const allEdges: GraphEdge[] = [];

  let parsedCount = 0;
  let cachedCount = 0;

  for (const absPath of allFiles) {
    const rel = relative(rootDir, absPath).replace(/\\/g, '/');
    const hash = fileHash(absPath);

    // Try cache first
    const cached = cache.files[rel];
    if (cached && cached.hash === hash) {
      for (const n of cached.nodes) {
        allNodes.push({ ...n, risk_flags: [] });
      }
      allEdges.push(...cached.edges);
      cachedCount++;
      continue;
    }

    // Parse fresh
    const { nodes, edges } = extractFile(absPath, rel);
    cache.files[rel] = { hash, nodes, edges };
    for (const n of nodes) {
      allNodes.push({ ...n, risk_flags: [] });
    }
    allEdges.push(...edges);
    parsedCount++;
  }

  // Clean up stale cache entries for deleted files
  for (const rel of Object.keys(cache.files)) {
    const abs = join(rootDir, rel);
    if (!existsSync(abs)) delete cache.files[rel];
  }

  saveCache(rootDir, cache);

  // Attach findings as risk_flags
  attachFindings(allNodes, findings, rootDir);

  const graph: CodeGraph = {
    generatedAt: new Date().toISOString(),
    nodes: allNodes,
    edges: allEdges,
  };

  // Write output
  const outPath = join(rootDir, 'auditx-graph.json');
  writeFileSync(outPath, JSON.stringify(graph, null, 2), 'utf-8');

  return graph;
}

// ─── Graph query helpers (used by MCP server) ─────────────────────────────────

export function loadGraph(rootDir: string): CodeGraph | null {
  const p = join(rootDir, 'auditx-graph.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as CodeGraph;
  } catch {
    return null;
  }
}

export function queryContext(graph: CodeGraph, symbol: string): {
  node: GraphNode | null;
  incoming: GraphEdge[];
  outgoing: GraphEdge[];
} {
  const node = graph.nodes.find(
    n => n.name === symbol || n.id === symbol || n.id.endsWith(`::${symbol}`)
  ) ?? null;

  if (!node) return { node: null, incoming: [], outgoing: [] };

  const outgoing = graph.edges.filter(e => e.from === node.id);
  const incoming = graph.edges.filter(e => e.to === node.id);

  return { node, incoming, outgoing };
}

export function queryCallers(graph: CodeGraph, symbol: string): GraphNode[] {
  const callerIds = graph.edges
    .filter(e => e.type === 'calls' && (e.to === symbol || e.to.endsWith(`::${symbol}`)))
    .map(e => e.from);

  return graph.nodes.filter(n => callerIds.includes(n.id));
}

export function queryCallees(graph: CodeGraph, symbol: string): GraphNode[] {
  const node = graph.nodes.find(
    n => n.name === symbol || n.id === symbol || n.id.endsWith(`::${symbol}`)
  );
  if (!node) return [];

  const calleeIds = graph.edges
    .filter(e => e.type === 'calls' && e.from === node.id)
    .map(e => e.to);

  return graph.nodes.filter(n => calleeIds.includes(n.id));
}

export function queryRiskFlags(graph: CodeGraph, filePath?: string): GraphNode[] {
  let nodes = graph.nodes.filter(n => n.risk_flags.length > 0);
  if (filePath) {
    const norm = filePath.replace(/\\/g, '/');
    nodes = nodes.filter(n => n.file === norm || n.file.endsWith(norm));
  }
  return nodes;
}
