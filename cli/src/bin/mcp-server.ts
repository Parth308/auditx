#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { resolve } from "path";

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { runAll } from '../runners/index.js';
import { aggregate, filterBySeverity, buildSummary } from '../aggregate.js';
import { formatAgent } from '../formatters/agent.js';
import { detectStack, stackLabels } from '../detect.js';
import type { Config, Severity } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const VERSION = pkg.version;

const server = new Server(
  {
    name: "auditx-mcp",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "audit_codebase",
      description: "Run security/quality/AI-pattern audit on a directory. Returns structured findings an agent can act on.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute or relative path to the directory to scan. Defaults to current directory." },
          severity: { type: "string", enum: ["critical", "high", "medium", "low", "info"], description: "Minimum severity level to include." },
          skip: { type: "string", description: "Comma-separated list of scanner categories to skip (e.g., 'secrets,deps')." }
        }
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === "audit_codebase") {
    const args = req.params.arguments as { path?: string; severity?: string; skip?: string };
    const target = resolve(args.path || ".");
    
    const validSeverities = ["critical", "high", "medium", "low", "info"];
    const severity: Severity = validSeverities.includes(args.severity ?? "") ? (args.severity as Severity) : "info";
    const skip = args.skip ? args.skip.split(',').map(s => s.trim()) : [];

    const config: Config = {
      target,
      output: 'agent',
      outputFile: 'audit-report.md',
      severity,
      skip: skip as any[],
      ci: false,
      ai: false,
      fix: false,
      watch: false,
      checkDeps: false,
      sbom: false
    };

    try {
      const stack = detectStack(config.target);
      const labels = stackLabels(stack);
      
      const scanStart = Date.now();
      const TIMEOUT_MS = 120_000;
      const scanPromise = runAll(config.target, stack, config, () => {});
      const results = await Promise.race([
        scanPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('auditx scan timed out after 120s')), TIMEOUT_MS))
      ]) as Awaited<typeof scanPromise>;
      
      const totalDuration = Date.now() - scanStart;
      let findings = aggregate(results);
      findings = filterBySeverity(findings, config.severity);

      const report = {
        meta: {
          target: config.target,
          scannedAt: new Date().toISOString(),
          durationMs: totalDuration,
          stack: labels,
          scanners: results.filter((r) => r.ok).map((r) => r.scanner),
        },
        summary: buildSummary(findings),
        findings,
      };

      const content = formatAgent(report);
      
      return {
        content: [{ type: "text", text: content }],
      };
    } catch (e: any) {
      return {
        content: [{ type: "text", text: `Error running auditx: ${e.message}` }],
        isError: true,
      };
    }
  }

  throw new Error("Tool not found");
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("auditx MCP server running on stdio");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
