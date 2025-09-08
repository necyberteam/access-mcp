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
  - title: Compute Resources
    details: Query hardware specifications, capabilities, and availability across ACCESS resources
  - title: System Status
    details: Monitor outages, maintenance schedules, and system announcements in real-time
  - title: Software Discovery
    details: Search and explore software packages available on ACCESS-CI resources
  - title: XDMoD Charts
    details: Access usage analytics, generate charts, and explore computational resource utilization data
  - title: Affinity Groups
    details: Connect with ACCESS-CI communities, discover events, and access knowledge base resources
  - title: Research Allocations
    details: Discover active research projects, find collaborations, and analyze resource allocation trends
  - title: Events
    details: Find workshops, webinars, and training events with comprehensive filtering by date, type, skill level, and tags
---

## What is MCP?

The Model Context Protocol (MCP) allows AI assistants to securely interact with external data sources.

ACCESS-CI MCP servers offer structured access to:

- **Resource information** about compute systems and capabilities
- **Real-time status** of system health and maintenance
- **Software catalogs** across different ACCESS resources
- **Usage analytics** and computational resource utilization metrics
- **Community data** from affinity groups and knowledge bases
- **Research projects** and allocation data for collaboration discovery
- **Training events** with workshops, webinars, and learning opportunities

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
- **npm** (Node Package Manager) - Comes with Node.js for easy installation

### Quick Install
```bash
npm install -g @access-mcp/affinity-groups @access-mcp/compute-resources @access-mcp/system-status @access-mcp/software-discovery @access-mcp/xdmod-charts @access-mcp/xdmod-data @access-mcp/allocations @access-mcp/nsf-awards @access-mcp/events
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

### Docker Deployment
For production deployments, Docker containers are available:
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
    "access-xdmod-metrics": {
      "command": "npx",
      "args": ["@access-mcp/xdmod-metrics"],
      "env": {
        "XDMOD_API_TOKEN": "your-xdmod-api-token"
      }
    },
    "access-allocations": {
      "command": "npx",
      "args": ["@access-mcp/allocations"]
    },
    "access-events": {
      "command": "npx",
      "args": ["@access-mcp/events"]
    }
  }
}
```

[**📖 Complete Installation Guide →**](/getting-started)

## Supported by ACCESS-CI

These MCP servers are built to work with official ACCESS-CI APIs and are designed to help researchers more effectively discover and utilize cyberinfrastructure resources.
