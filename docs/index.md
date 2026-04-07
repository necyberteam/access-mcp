---
layout: home

hero:
  name: "ACCESS-CI MCP Servers"
  text: "Connect your AI assistant to ACCESS-CI resources, communities, and data."
  tagline: "Public Model Context Protocol servers — query compute resources, check system status, search software, explore allocations, and more through natural conversation."
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/necyberteam/access-mcp

---

## What is MCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is an open standard that lets AI assistants securely interact with external tools, systems, and data sources. It provides a universal interface for AI to read data, call functions, and reason over real-world context. MCP is supported by Claude and a growing number of AI tools.

## What You Can Do

With ACCESS-CI MCP servers connected, you can ask your AI questions like:

- *"What GPU resources are available on ACCESS-CI?"*
- *"Are there any current outages or upcoming maintenance on Delta?"*
- *"Show me upcoming workshops on parallel computing"*
- *"What machine learning software is available on Anvil?"*
- *"What NSF-funded projects are doing work in quantum computing?"*

Your AI queries the relevant ACCESS services and gives you a synthesized answer — no need to navigate multiple websites or APIs.

## Available Servers

ACCESS-CI MCP servers provide structured access to:

- **Compute Resources** — Hardware specifications, GPU availability, system capabilities
- **System Status** — Outages, maintenance schedules, and incidents
- **Software Discovery** — Software packages available across ACCESS resources
- **XDMoD** — Usage statistics, visualizations, and resource utilization
- **Allocations** — Research projects, allocation trends, and collaboration discovery
- **NSF Awards** — NSF funding data and cross-referencing
- **Events** — Workshops, webinars, and training sessions
- **Announcements** — Community news and updates
- **Affinity Groups** — Communities, events, and knowledge base resources

A tenth server, **XDMoD Data Analytics**, provides per-user job and usage data via Claude Code (it requires API headers that aren't supported by Claude.ai connectors). [Details →](/getting-started#optional-xdmod-data-analytics)

## Quick Start

Most tools work without authentication — adding a server takes about a minute.

### Claude Desktop / claude.ai

1. Open **Customize** > **Connectors** > **Add custom connector**
2. Paste a server URL — start with `https://mcp.access-ci.org/compute-resources/sse`
3. Authorize when prompted

You can add as many or as few servers as you need. See the [**Getting Started guide**](/getting-started) for all server URLs.

### Claude Code

See the [**Getting Started guide**](/getting-started#claude-code-cli) for CLI commands and configuration.

### Other MCP Clients

The Model Context Protocol is supported by a growing number of AI tools. ACCESS MCP servers should work with any client that supports remote MCP servers — see the [**Other MCP Clients**](/getting-started#other-mcp-clients) section for details. We'd love to hear about your experience: [open a support ticket](https://support.access-ci.org/help-ticket) so we can expand our documentation.

---

## Self-Hosting

Want to run the servers yourself? See the [**setup guide**](/getting-started#self-hosting-docker) for Docker deployment instructions.

## Supported by ACCESS-CI

These MCP servers are built to work with official ACCESS-CI APIs and are designed to help researchers more effectively discover and utilize cyberinfrastructure resources.
