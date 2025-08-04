# ACCESS-CI Software Discovery Service MCP server

ACCESS-CI Software Discovery Service MCP server

## Installation

### Download & Run

1. Download the [latest release](https://github.com/necyberteam/access-mcp/releases)
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
      "command": "npx",
      "args": ["@access-mcp/software-discovery"]
    }
  }
}
```

## Usage Examples

<!-- TODO: Extract examples from server code -->

## Development

# ACCESS-CI Software Discovery MCP Server

MCP server providing software discovery and search capabilities for ACCESS-CI resources.

## Overview

This server enables searching and discovering software packages available across ACCESS-CI compute resources using the Software Discovery Service (SDS) API.

## Tools

### search_software

Search for software packages across ACCESS-CI resources.

**Parameters:**

- `query` (string): Search query for software names or descriptions
- `resource_filter` (string, optional): Filter results by specific resource ID

### list_software_by_resource

List all available software packages for a specific ACCESS-CI resource.

**Parameters:**

- `resource_id` (string): The resource ID (e.g., "expanse.sdsc.xsede.org")
- `limit` (number, optional): Maximum number of results (default: 100)

### get_software_details

Get detailed information about a specific software package on a resource.

**Parameters:**

- `software_name` (string): Name of the software package
- `resource_id` (string): The resource ID where the software is installed

### search_software_by_category

Search for software packages by category or domain.

**Parameters:**

- `category` (string): Software category (e.g., "bioinformatics", "chemistry", "physics")
- `resource_filter` (string, optional): Filter by specific resource

## Resources

- `accessci://software-catalog`: Comprehensive catalog of available software across all resources

## Installation

```bash
npm install -g @access-mcp/software-discovery
```

## Usage

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "access-software-discovery": {
      "command": "access-mcp-software-discovery",
      "env": {
        "SDS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Environment Variables

- `SDS_API_KEY`: API key for the Software Discovery Service (required)

## API Endpoints

This server connects to the ACCESS-CI Software Discovery Service at `https://ara-db.ccs.uky.edu`

## License

MIT

---

**Package:** `@access-mcp/software-discovery`  
**Version:** v0.2.3  
**Main:** `dist/index.js`
