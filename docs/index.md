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

features:
  - title: 🏛️ Affinity Groups
    details: Connect with ACCESS-CI communities, discover events, and access knowledge base resources
  - title: 💻 Compute Resources
    details: Query hardware specifications, capabilities, and availability across ACCESS resources
  - title: 📊 System Status
    details: Monitor outages, maintenance schedules, and system announcements in real-time
  - title: 🔧 Software Discovery
    details: Search and explore software packages available on ACCESS-CI resources
---

## What is MCP?

The Model Context Protocol (MCP) enables AI assistants to securely access external data sources. ACCESS-CI MCP servers provide structured access to:

- **Community data** from affinity groups and events
- **Resource information** about compute systems and capabilities
- **Real-time status** of system health and maintenance
- **Software catalogs** across different ACCESS resources

## Quick Example

With ACCESS-CI MCP servers, you can ask Claude:

> "What GPU resources are available on ACCESS-CI and what machine learning software do they have?"

Claude will query multiple MCP servers to provide comprehensive information about:

- Available GPU-enabled systems
- Hardware specifications
- Installed ML frameworks and libraries
- Current system status and availability

## Installation

### 📦 Recommended: npm packages

Install all ACCESS-CI MCP servers with one command (requires Node.js 18+):

```bash
npm install -g @access-mcp/affinity-groups @access-mcp/compute-resources @access-mcp/system-status @access-mcp/software-discovery
```

Then add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "access-affinity-groups": {
      "command": "npx",
      "args": ["@access-mcp/affinity-groups"]
    },
    "access-compute-resources": {
      "command": "npx",
      "args": ["@access-mcp/compute-resources"]
    },
    "access-system-status": {
      "command": "npx",
      "args": ["@access-mcp/system-status"]
    },
    "access-software-discovery": {
      "command": "npx",
      "args": ["@access-mcp/software-discovery"],
      "env": {
        "SDS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 🔧 For Developers

Install locally for custom integrations:

```bash
npm install @access-mcp/affinity-groups
```

## Supported by ACCESS-CI

These MCP servers are built to work with official ACCESS-CI APIs and are designed to help researchers more effectively discover and utilize cyberinfrastructure resources.
