# @access-mcp/discovery

MCP discovery meta-server for the ACCESS-CI tool catalog. Implements Pillar 3 of the tool-catalog architecture (`docs/2026-05-12-tool-catalog-architecture.md`).

## Purpose

Reduces per-turn schema overhead in the agent's tool-calling loop by exposing the catalog through three progressive-disclosure tools instead of registering all ~24 tools up-front.

| Today (Pillar 1 + 2) | With discovery (Pillar 3) |
|---|---|
| Agent registers ~24 tool schemas at loop entry every turn (~7.2k tokens) | Agent registers 3 tools at loop entry; describes specific tools on demand |

## Tools

| Tool | Purpose |
|---|---|
| `list_capabilities(query?, category?, limit?)` | Browse the catalog. Returns tool names + one-line summaries + server tags. No schemas. |
| `describe_tools(names)` | Full JSON schemas + example invocations for the named tools. |
| `execute_tool(name, args, fields?)` | Uniform dispatch to the underlying server. Forwards `fields` projection (Pillar 2). |

## Build status

Scaffold only. Tool handlers return `{error: "Not yet implemented", stage: "scaffold"}` until the introspection commit lands. See the architecture doc for the full plan.
