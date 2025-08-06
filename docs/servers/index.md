# MCP Servers Overview

ACCESS-CI provides 6 MCP servers for different aspects of cyberinfrastructure:


## MCP server for ACCESS-CI Affinity Groups API

**Package:** `@access-mcp/affinity-groups`  
**Version:** v0.2.3

MCP server for ACCESS-CI Affinity Groups API

[View Details](/servers/affinity-groups){.btn-primary}

```bash
# Install
npm install -g @access-mcp/affinity-groups

# Configure
{
  "mcpServers": {
    "affinity-groups": {
      "command": "npx",
      "args": ["@access-mcp/affinity-groups"]
    }
  }
}
```

## MCP server for ACCESS-CI Compute Resources API

**Package:** `@access-mcp/compute-resources`  
**Version:** v0.2.3

MCP server for ACCESS-CI Compute Resources API

[View Details](/servers/compute-resources){.btn-primary}

```bash
# Install
npm install -g @access-mcp/compute-resources

# Configure
{
  "mcpServers": {
    "compute-resources": {
      "command": "npx",
      "args": ["@access-mcp/compute-resources"]
    }
  }
}
```

## MCP server for ACCESS-CI System Status and Outages API

**Package:** `@access-mcp/system-status`  
**Version:** v0.2.3

MCP server for ACCESS-CI System Status and Outages API

[View Details](/servers/system-status){.btn-primary}

```bash
# Install
npm install -g @access-mcp/system-status

# Configure
{
  "mcpServers": {
    "system-status": {
      "command": "npx",
      "args": ["@access-mcp/system-status"]
    }
  }
}
```

## ACCESS-CI Software Discovery Service MCP server

**Package:** `@access-mcp/software-discovery`  
**Version:** v0.2.3

ACCESS-CI Software Discovery Service MCP server

[View Details](/servers/software-discovery){.btn-primary}

```bash
# Install
npm install -g @access-mcp/software-discovery

# Configure
{
  "mcpServers": {
    "software-discovery": {
      "command": "npx",
      "args": ["@access-mcp/software-discovery"]
    }
  }
}
```

## MCP server for XDMoD Metrics and Usage Analytics API

**Package:** `@access-mcp/xdmod-metrics`  
**Version:** v0.3.0

MCP server for XDMoD Metrics and Usage Analytics API

[View Details](/servers/xdmod-metrics){.btn-primary}

```bash
# Install
npm install -g @access-mcp/xdmod-metrics

# Configure
{
  "mcpServers": {
    "xdmod-metrics": {
      "command": "npx",
      "args": ["@access-mcp/xdmod-metrics"]
    }
  }
}
```

## MCP server for ACCESS-CI Allocations and Research Projects API

**Package:** `@access-mcp/allocations`  
**Version:** v0.2.0

MCP server for ACCESS-CI Allocations and Research Projects API

[View Details](/servers/allocations){.btn-primary}

```bash
# Install
npm install -g @access-mcp/allocations

# Configure
{
  "mcpServers": {
    "allocations": {
      "command": "npx",
      "args": ["@access-mcp/allocations"]
    }
  }
}
```


## Installation Methods

Choose the method that works best for you:

### 📥 Download & Run (Recommended for end users)
- Pre-built executables
- No Node.js knowledge required  
- [Download latest release](https://github.com/necyberteam/access-mcp/releases)

### 🔧 npm Packages (For developers)
- Install individual servers
- Integrate into your applications
- Full development workflow

[Get Started →](/getting-started)
