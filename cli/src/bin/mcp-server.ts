#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { resolve } from "path";

import { runAll } from '../runners/index.js';
import { aggregate, filterBySeverity, buildSummary } from '../aggregate.js';
import { formatAgent } from '../formatters/agent.js';
import { detectStack, stackLabels } from '../detect.js';
import type { Config, Severity } from '../types.js';

const server = new Server(
  {
    name: "auditx-mcp",
    version: "0.1.16",
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
          severity: { type: "string", enum: ["critical", "high", "medium", "low", "info"], description: "Minimum severity level to include." }
        }
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === "audit_codebase") {
    const args = req.params.arguments as { path?: string; severity?: string };
    const target = resolve(args.path || ".");
    const severity = (args.severity as Severity) || "info";

    const config: Config = {
      target,
      output: 'agent',
      outputFile: 'audit-report.md',
      severity,
      skip: [],
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
      const results = await runAll(config.target, stack, config, () => {});
      
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
