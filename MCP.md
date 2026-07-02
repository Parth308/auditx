# auditx MCP Server

auditx provides a built-in [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server to allow AI assistants (like Claude Desktop, Claude Code, Cursor, or your own agents) to run full security, dependency, and SAST audits natively.

## For Claude Desktop / Claude Code

To add `auditx` to your Claude Desktop or Claude Code configuration, add the following to your MCP settings file (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "auditx": {
      "command": "npx",
      "args": ["-y", "--package", "auditx", "auditx-mcp"]
    }
  }
}
```
*(Note: You can also use `npx -y auditx-mcp@latest` if installing the dedicated MCP package directly).*

## Capabilities

The server exposes an `audit_codebase` tool that the AI can call with the following arguments:

- `path` (optional): Absolute or relative path to the directory to scan. Defaults to the current directory.
- `severity` (optional): Minimum severity level to include (`critical`, `high`, `medium`, `low`, `info`). Defaults to `info`.
- `skip` (optional): Comma-separated list of scanner categories to skip (e.g., `secrets,deps`).

The server runs all 18 parallel scanners, aggregates the results, and returns a token-efficient JSON response designed specifically for LLM context windows.

## Troubleshooting

- **Timeout**: The server has a built-in 120-second timeout to prevent the LLM from hanging indefinitely on massive codebases. Use the `skip` argument to ignore slow scanners if you hit this limit.
- **Node Version**: Ensure `npx` resolves to a recent Node.js version (v18+) in the environment where the MCP server runs.
