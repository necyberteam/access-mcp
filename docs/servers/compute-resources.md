# MCP server for ACCESS-CI Compute Resources API

MCP server for ACCESS-CI Compute Resources API

## Installation

### Download & Run
1. Download the [latest release](https://github.com/your-repo/releases)
2. Extract and locate the `compute-resources/index.js` file
3. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "compute-resources": {
      "command": "/path/to/compute-resources/index.js"
    }
  }
}
```

### npm Package
```bash
npm install -g @access-mcp/compute-resources
```

```json
{
  "mcpServers": {
    "compute-resources": {
      "command": "access-mcp-compute-resources"
    }
  }
}
```

## Usage Examples

<!-- TODO: Extract examples from server code -->

## Development

See the package README for development information.

---

**Package:** `@access-mcp/compute-resources`  
**Version:** v0.1.0  
**Main:** `dist/index.js`
