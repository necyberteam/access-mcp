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

## Getting Started

Ready to explore ACCESS-CI resources with AI assistance? Get started in just a few minutes:

### What You'll Need
- **Claude Desktop** - Free AI assistant app with MCP support
- **npm** (Node Package Manager) - Comes with Node.js for TypeScript servers
- **pipx** - Python package installer for the Python MCP server

### Quick Install

**TypeScript Servers:**
```bash
npm install -g @access-mcp/affinity-groups @access-mcp/compute-resources @access-mcp/system-status @access-mcp/software-discovery @access-mcp/xdmod-charts @access-mcp/allocations @access-mcp/nsf-awards @access-mcp/events @access-mcp/announcements
```

**Python Server:**
```bash
pipx install xdmod-mcp-data
```

### Quick Setup
1. **Install Prerequisites** - Claude Desktop and npm
2. **Install MCP Servers** - One command installs all ACCESS-CI servers  
3. **Configure Claude** - Add servers to your configuration file
4. **Start Exploring** - Ask Claude about ACCESS-CI resources

### Authentication
- **Most servers work immediately** with no setup required
- **Some servers** may need API keys for full functionality
- Get started right away and add API keys as needed

### Example Configuration
Here's a complete configuration example for Claude Desktop:
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
    },
    "access-xdmod-charts": {
      "command": "npx",
      "args": ["@access-mcp/xdmod-charts"]
    },
    "access-allocations": {
      "command": "npx",
      "args": ["@access-mcp/allocations"]
    },
    "access-nsf-awards": {
      "command": "npx",
      "args": ["@access-mcp/nsf-awards"]
    },
    "access-events": {
      "command": "npx",
      "args": ["@access-mcp/events"]
    },
    "access-announcements": {
      "command": "npx",
      "args": ["@access-mcp/announcements"]
    },
    "xdmod-mcp-data": {
      "command": "xdmod-mcp-data",
      "env": {
        "XDMOD_API_TOKEN": "your-xdmod-token-here"
      }
    }
  }
}
```

[**📖 Complete Installation Guide →**](/getting-started)

## Supported by ACCESS-CI

These MCP servers are built to work with official ACCESS-CI APIs and are designed to help researchers more effectively discover and utilize cyberinfrastructure resources.
