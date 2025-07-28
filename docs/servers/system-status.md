# MCP server for ACCESS-CI System Status and Outages API

MCP server for ACCESS-CI System Status and Outages API

## Installation

### Download & Run
1. Download the [latest release](https://github.com/your-repo/releases)
2. Extract and locate the `system-status/index.js` file
3. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "system-status": {
      "command": "/path/to/system-status/index.js"
    }
  }
}
```

### npm Package
```bash
npm install -g @access-mcp/system-status
```

```json
{
  "mcpServers": {
    "system-status": {
      "command": "access-mcp-system-status"
    }
  }
}
```

## Usage Examples

<!-- TODO: Extract examples from server code -->

## Development

See the package README for development information.

---

**Package:** `@access-mcp/system-status`  
**Version:** v0.1.0  
**Main:** `dist/index.js`
