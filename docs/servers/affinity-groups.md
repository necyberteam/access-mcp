# MCP server for ACCESS-CI Affinity Groups API

MCP server for ACCESS-CI Affinity Groups API

## Installation

### Download & Run
1. Download the [latest release](https://github.com/your-repo/releases)
2. Extract and locate the `affinity-groups/index.js` file
3. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "affinity-groups": {
      "command": "/path/to/affinity-groups/index.js"
    }
  }
}
```

### npm Package
```bash
npm install -g @access-mcp/affinity-groups
```

```json
{
  "mcpServers": {
    "affinity-groups": {
      "command": "access-mcp-affinity-groups"
    }
  }
}
```

## Usage Examples

<!-- TODO: Extract examples from server code -->

## Development

# ACCESS-CI Affinity Groups MCP Server

MCP server providing access to ACCESS-CI Affinity Groups API endpoints.

## API Endpoints Covered

- **Affinity Groups**: `/api/1.0/affinity_groups/{group_id}`
- **Events & Trainings**: `/api/1.1/events/ag/{group_id}`
- **Knowledge Base**: `/api/1.0/kb/{group_id}`

## Tools

### get_affinity_group
Get basic information about a specific affinity group.

**Parameters:**
- `group_id` (string): The affinity group identifier (e.g., "bridges2.psc.access-ci.org")

### get_affinity_group_events
Get events and trainings for a specific affinity group.

**Parameters:**
- `group_id` (string): The affinity group identifier

### get_affinity_group_kb
Get knowledge base resources for a specific affinity group.

**Parameters:**
- `group_id` (string): The affinity group identifier

## Usage

```bash
# Install and build
npm install
npm run build

# Start the server
npm start
```

The server runs on stdio transport and can be integrated with MCP-compatible clients.

---

**Package:** `@access-mcp/affinity-groups`  
**Version:** v0.1.0  
**Main:** `dist/index.js`
