#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { resolve } from "path";

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { runAll } from '../runners/index.js';
import { aggregate, filterBySeverity, buildSummary } from '../aggregate.js';
import { formatAgent } from '../formatters/agent.js';
import { detectStack, stackLabels } from '../detect.js';
import { detectWorkspaces } from '../workspace.js';
import {
  buildCodeGraph, loadGraph,
  queryContext, queryCallers, queryCallees, queryRiskFlags,
} from '../graph.js';
import type { Config, Severity } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgPath = existsSync(join(__dirname, '../package.json'))
  ? join(__dirname, '../package.json')
  : join(__dirname, '../../package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const VERSION = pkg.version;

const server = new Server(
  { name: "auditx-mcp", version: VERSION },
  { capabilities: { tools: {} } }
);

// ─── Tool list ────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "audit_codebase",
      description: "Run security/quality/AI-pattern audit on a directory. Returns structured findings an agent can act on.",
      inputSchema: {
        type: "object",
        properties: {
          path:     { type: "string",  description: "Absolute or relative path to the directory to scan. Defaults to current directory." },
          severity: { type: "string",  enum: ["critical","high","medium","low","info"], description: "Minimum severity level to include." },
          skip:     { type: "string",  description: "Comma-separated list of scanner categories to skip (e.g., 'secrets,deps')." },
          emitGraph:{ type: "boolean", description: "Also build/update the code knowledge graph after scanning." },
        }
      }
    },
    {
      name: "get_context",
      description: "Get a symbol's graph node, immediate incoming/outgoing edges, and attached risk_flags (security findings). Pass a function name, class name, or file path.",
      inputSchema: {
        type: "object",
        required: ["symbol"],
        properties: {
          path:   { type: "string", description: "Root directory where auditx-graph.json lives. Defaults to current directory." },
          symbol: { type: "string", description: "Function name, class name, node id, or relative file path to look up." },
        }
      }
    },
    {
      name: "get_callers",
      description: "Return all nodes that call the given function/symbol (i.e., find usages). Useful for impact analysis before refactoring or fixing a vulnerability.",
      inputSchema: {
        type: "object",
        required: ["symbol"],
        properties: {
          path:   { type: "string", description: "Root directory where auditx-graph.json lives. Defaults to current directory." },
          symbol: { type: "string", description: "Function or class name to find callers of." },
        }
      }
    },
    {
      name: "get_callees",
      description: "Return all nodes called by the given function/symbol (i.e., dependencies). Useful for tracing data flow from a vulnerable entry point.",
      inputSchema: {
        type: "object",
        required: ["symbol"],
        properties: {
          path:   { type: "string", description: "Root directory where auditx-graph.json lives. Defaults to current directory." },
          symbol: { type: "string", description: "Function or class name to find callees of." },
        }
      }
    },
    {
      name: "get_risk_flags",
      description: "Return all graph nodes that have security/quality findings attached. Optionally filter to a specific file. Use after audit_codebase to see which exact functions/classes are risky.",
      inputSchema: {
        type: "object",
        properties: {
          path:     { type: "string", description: "Root directory where auditx-graph.json lives. Defaults to current directory." },
          filePath: { type: "string", description: "Relative file path to filter findings to (optional). Omit to get all files with findings." },
        }
      }
    },
  ]
}));

// ─── Tool handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (req) => {

  // ── audit_codebase ─────────────────────────────────────────────────────────
  if (req.params.name === "audit_codebase") {
    const args = req.params.arguments as { path?: string; severity?: string; skip?: string; emitGraph?: boolean };
    const target = resolve(args.path || ".");

    const validSeverities = ["critical","high","medium","low","info"];
    const severity: Severity = validSeverities.includes(args.severity ?? "") ? (args.severity as Severity) : "info";
    const skip = args.skip ? args.skip.split(',').map(s => s.trim()) : [];

    const config: Config = {
      target,
      output: 'agent',
      outputFile: 'audit-report.md',
      severity,
      skip: skip as any[],
      ci: false, ai: false, fix: false, watch: false, checkDeps: false, sbom: false,
    };

    try {
      const stack = detectStack(config.target);
      const labels = stackLabels(stack);
      const TIMEOUT_MS = 120_000;
      const workspaces = detectWorkspaces(config.target, stack);
      const scanPromise = runAll(config.target, stack, workspaces, config, () => {});
      const results = await Promise.race([
        scanPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('auditx scan timed out after 120s')), TIMEOUT_MS))
      ]) as Awaited<typeof scanPromise>;

      const totalDuration = Date.now();
      let findings = aggregate(results, config.target);
      findings = filterBySeverity(findings, config.severity);

      const report = {
        meta: {
          target: config.target,
          scannedAt: new Date().toISOString(),
          durationMs: totalDuration,
          stack: labels,
          scanners: results.filter(r => r.ok).map(r => r.scanner),
        },
        summary: buildSummary(findings),
        findings,
      };

      const content = formatAgent(report);

      // Optionally build graph
      if (args.emitGraph) {
        await buildCodeGraph(config.target, findings);
      }

      return { content: [{ type: "text", text: content }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error running auditx: ${e.message}` }], isError: true };
    }
  }

  // ── Helper: load graph or error ────────────────────────────────────────────
  const loadOrError = async (path?: string, symbol?: string, buildOnMissing = false): Promise<
    { graph: Awaited<ReturnType<typeof loadGraph>> & {}; rootDir: string } | { error: string }
  > => {
    const rootDir = resolve(path || ".");
    let graph = loadGraph(rootDir);

    if (!graph && buildOnMissing) {
      // Auto-build if missing — run a quick full scan
      try {
        const stack = detectStack(rootDir);
        const workspaces = detectWorkspaces(rootDir, stack);
        const config: Config = {
          target: rootDir, output: 'agent', outputFile: 'audit-report.md',
          severity: 'info', skip: [], ci: false, ai: false, fix: false, watch: false,
          checkDeps: false, sbom: false,
        };
        const results = await runAll(rootDir, stack, workspaces, config, () => {});
        const findings = aggregate(results, rootDir);
        graph = await buildCodeGraph(rootDir, findings);
      } catch (e: any) {
        return { error: `Graph not found and auto-build failed: ${e.message}` };
      }
    }

    if (!graph) {
      return { error: `No auditx-graph.json found at ${rootDir}. Run \`npx auditx . --emit-graph\` first, or call audit_codebase with emitGraph:true.` };
    }

    return { graph: graph as NonNullable<typeof graph>, rootDir };
  };

  // ── get_context ────────────────────────────────────────────────────────────
  if (req.params.name === "get_context") {
    const args = req.params.arguments as { path?: string; symbol: string };
    const result = await loadOrError(args.path, args.symbol, true);
    if ('error' in result) return { content: [{ type: "text", text: result.error }], isError: true };

    const ctx = queryContext(result.graph, args.symbol);
    if (!ctx.node) {
      return { content: [{ type: "text", text: `Symbol '${args.symbol}' not found in graph.` }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(ctx, null, 2) }] };
  }

  // ── get_callers ────────────────────────────────────────────────────────────
  if (req.params.name === "get_callers") {
    const args = req.params.arguments as { path?: string; symbol: string };
    const result = await loadOrError(args.path, args.symbol, true);
    if ('error' in result) return { content: [{ type: "text", text: result.error }], isError: true };

    const callers = queryCallers(result.graph, args.symbol);
    return { content: [{ type: "text", text: JSON.stringify({ symbol: args.symbol, callers }, null, 2) }] };
  }

  // ── get_callees ────────────────────────────────────────────────────────────
  if (req.params.name === "get_callees") {
    const args = req.params.arguments as { path?: string; symbol: string };
    const result = await loadOrError(args.path, args.symbol, true);
    if ('error' in result) return { content: [{ type: "text", text: result.error }], isError: true };

    const callees = queryCallees(result.graph, args.symbol);
    return { content: [{ type: "text", text: JSON.stringify({ symbol: args.symbol, callees }, null, 2) }] };
  }

  // ── get_risk_flags ─────────────────────────────────────────────────────────
  if (req.params.name === "get_risk_flags") {
    const args = req.params.arguments as { path?: string; filePath?: string };
    const result = await loadOrError(args.path, undefined, true);
    if ('error' in result) return { content: [{ type: "text", text: result.error }], isError: true };

    const nodes = queryRiskFlags(result.graph, args.filePath);
    return { content: [{ type: "text", text: JSON.stringify({ filePath: args.filePath ?? 'all', nodes }, null, 2) }] };
  }

  throw new Error("Tool not found");
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("auditx MCP server running on stdio");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
