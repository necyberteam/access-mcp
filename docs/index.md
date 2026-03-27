---
layout: home

hero:
  name: "ACCESS-CI MCP Servers"
  text: "Connect AI assistants to ACCESS-CI resources, communities, and data with these Model Context Protocol servers."
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/necyberteam/access-mcp

---

## What is MCP?

The Model Context Protocol (MCP) is an open standard and open-source framework introduced by Anthropic that allows AI assistants to securely interact with external tools, systems, and data sources. It provides a universal interface for reading files, executing functions, and handling contextual prompts, creating a standardized way for large language models (LLMs) to integrate and share data. MCP has been widely adopted by major AI providers and the broader community.


## ACCESS MCP Servers offer structured access to:

- **Infrastructure Resources** Query hardware specifications, system capabilities, and availability across ACCESS resources.
- **System Status** Track outages, maintenance schedules, and system announcements in real time.
- **Software Discovery** Search and browse software packages available on ACCESS-CI resources.
- **XDMoD Metrics** Access usage analytics, visualize trends with charts, and review resource utilization data.
- **Affinity Groups** Connect with communities, discover events, and access knowledge base resources.
- **Allocations** Browse active research projects, identify collaboration opportunities, and analyze allocation trends.
- **Events** Find workshops, webinars, and training sessions, with filters for date, type, skill level, and topic.
- **Announcements** Announcements from the community.

## Quick Example

With ACCESS-CI MCP servers, you can ask Claude:

> "What GPU resources are available on ACCESS-CI and what machine learning software do they have?"

Claude will query multiple MCP servers to provide comprehensive information about:

- Available GPU-enabled systems
- Hardware specifications
- Installed ML frameworks and libraries
- Current system status and availability

## Try It Now

Connect your AI assistant to ACCESS-CI services in seconds. These servers work with any MCP-compatible client — Claude Desktop, VS Code, Cursor, Windsurf, and more.

### Claude Code (CLI)

Add all servers with one command per server:

```bash
claude mcp add access-compute-resources --transport http https://mcp.access-ci.org/compute-resources/mcp -s user
claude mcp add access-system-status --transport http https://mcp.access-ci.org/system-status/mcp -s user
claude mcp add access-software-discovery --transport http https://mcp.access-ci.org/software-discovery/mcp -s user
claude mcp add access-xdmod --transport http https://mcp.access-ci.org/xdmod/mcp -s user
claude mcp add access-allocations --transport http https://mcp.access-ci.org/allocations/mcp -s user
claude mcp add access-nsf-awards --transport http https://mcp.access-ci.org/nsf-awards/mcp -s user
claude mcp add access-announcements --transport http https://mcp.access-ci.org/announcements/mcp -s user
claude mcp add access-events --transport http https://mcp.access-ci.org/events/mcp -s user
claude mcp add access-affinity-groups --transport http https://mcp.access-ci.org/affinity-groups/mcp -s user
```

### Claude Desktop

See the [**Getting Started guide**](/getting-started) for Claude Desktop configuration.

### Restart and Ask

Restart your AI tool and ask: *"What GPU resources are available on ACCESS-CI?"*

::: tip No Server Installation Required
The hosted servers handle everything — you just need an MCP-compatible AI client. No additional software required for Claude Code.
:::

---

## Install Locally

Prefer to run the servers yourself? Install them locally for more control or to customize:

[**📖 Complete Installation Guide →**](/getting-started)

## Supported by ACCESS-CI

These MCP servers are built to work with official ACCESS-CI APIs and are designed to help researchers more effectively discover and utilize cyberinfrastructure resources.
