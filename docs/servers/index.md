# MCP Servers Overview

ACCESS-CI provides 4 MCP servers for different aspects of cyberinfrastructure:


## MCP server for ACCESS-CI Affinity Groups API

**Package:** `@access-mcp/affinity-groups`  
**Version:** v0.1.0

MCP server for ACCESS-CI Affinity Groups API

[View Details](/servers/affinity-groups)

```bash
# Install
npm install -g @access-mcp/affinity-groups

# Configure
{
  "mcpServers": {
    "affinity-groups": {
      "command": "access-mcp-affinity-groups"
    }
  }
}
```

## MCP server for ACCESS-CI Compute Resources API

**Package:** `@access-mcp/compute-resources`  
**Version:** v0.1.0

MCP server for ACCESS-CI Compute Resources API

[View Details](/servers/compute-resources)

```bash
# Install
npm install -g @access-mcp/compute-resources

# Configure
{
  "mcpServers": {
    "compute-resources": {
      "command": "access-mcp-compute-resources"
    }
  }
}
```

## MCP server for ACCESS-CI System Status and Outages API

**Package:** `@access-mcp/system-status`  
**Version:** v0.1.0

MCP server for ACCESS-CI System Status and Outages API

[View Details](/servers/system-status)

```bash
# Install
npm install -g @access-mcp/system-status

# Configure
{
  "mcpServers": {
    "system-status": {
      "command": "access-mcp-system-status"
    }
  }
}
```

## ACCESS-CI Software Discovery Service MCP server

**Package:** `@access-mcp/software-discovery`  
**Version:** v0.1.0

ACCESS-CI Software Discovery Service MCP server

[View Details](/servers/software-discovery)

```bash
# Install
npm install -g @access-mcp/software-discovery

# Configure
{
  "mcpServers": {
    "software-discovery": {
      "command": "access-mcp-software-discovery"
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
