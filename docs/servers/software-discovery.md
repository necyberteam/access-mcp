# ACCESS-CI Software Discovery Service MCP server

ACCESS-CI Software Discovery Service MCP server

## Installation

### Download & Run
1. Download the [latest release](https://github.com/your-repo/releases)
2. Extract and locate the `software-discovery/index.js` file
3. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "software-discovery": {
      "command": "/path/to/software-discovery/index.js"
    }
  }
}
```

### npm Package
```bash
npm install -g @access-mcp/software-discovery
```

```json
{
  "mcpServers": {
    "software-discovery": {
      "command": "@access-mcp/software-discovery"
    }
  }
}
```

## Usage Examples

<!-- TODO: Extract examples from server code -->

## Development

See the package README for development information.

---

**Package:** `@access-mcp/software-discovery`  
**Version:** v0.1.0  
**Main:** `dist/index.js`
