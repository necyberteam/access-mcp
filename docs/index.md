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

Want to try ACCESS-CI MCP servers without installing anything? Connect Claude Desktop to our hosted servers in seconds.

### 1. Install Claude Desktop

Download [Claude Desktop](https://claude.ai/download) for macOS or Windows.

### 2. Add This Configuration

Open your Claude Desktop config file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Copy and paste this configuration:

```json
{
  "mcpServers": {
    "access-compute-resources": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3002/sse"]
    },
    "access-system-status": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3003/sse"]
    },
    "access-software-discovery": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3004/sse"]
    },
    "access-xdmod-charts": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3005/sse"]
    },
    "access-allocations": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3006/sse"]
    },
    "access-nsf-awards": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3007/sse"]
    },
    "access-xdmod-data": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3008/sse"]
    },
    "access-announcements": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3009/sse"]
    },
    "access-events": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3010/sse"]
    },
    "access-affinity-groups": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3011/sse"]
    }
  }
}
```

### 3. Restart Claude Desktop

Restart the app and ask: *"What GPU resources are available on ACCESS-CI?"*

::: tip No Installation Required
The hosted servers handle everything. You just need Claude Desktop and npm (for the `mcp-remote` bridge).
:::

---

## Install Locally

For better performance or offline use, install the servers locally:

[**📖 Complete Installation Guide →**](/getting-started)

## Supported by ACCESS-CI

These MCP servers are built to work with official ACCESS-CI APIs and are designed to help researchers more effectively discover and utilize cyberinfrastructure resources.
