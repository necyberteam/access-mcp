# MCP server for ACCESS-CI Allocations and Research Projects API

MCP server for ACCESS-CI Allocations and Research Projects API

## Installation

### Download & Run
1. Download the [latest release](https://github.com/necyberteam/access-mcp/releases)
2. Extract and locate the `allocations/index.js` file
3. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "allocations": {
      "command": "/path/to/allocations/index.js"
    }
  }
}
```

### npm Package
```bash
npm install -g @access-mcp/allocations
```

```json
{
  "mcpServers": {
    "allocations": {
      "command": "npx",
      "args": ["@access-mcp/allocations"]
    }
  }
}
```

## Usage Examples

<!-- TODO: Extract examples from server code -->

## Development

# ACCESS-CI Allocations MCP Server

MCP server providing access to ACCESS-CI allocations and research projects data.

## Overview

This server provides comprehensive access to active research projects and allocations across the ACCESS-CI ecosystem, enabling project discovery, collaboration opportunities, and resource allocation analysis.

## Tools

### search_projects

Search ACCESS-CI research projects by keyword, PI name, or institution.

**Parameters:**

- `query` (string): Search query for project titles, abstracts, PI names, or institutions
- `field_of_science` (string, optional): Filter by field of science
- `allocation_type` (string, optional): Filter by allocation type
- `limit` (number, optional): Maximum number of results to return (default: 20)

### get_project_details

Get detailed information about a specific research project.

**Parameters:**

- `project_id` (number): The project ID number

### list_projects_by_field

List projects by field of science.

**Parameters:**

- `field_of_science` (string): Field of science to filter by
- `limit` (number, optional): Maximum number of results to return (default: 20)

### list_projects_by_resource

Find projects using specific computational resources.

**Parameters:**

- `resource_name` (string): Resource name to search for
- `limit` (number, optional): Maximum number of results to return (default: 20)

### get_allocation_statistics

Get statistics about resource allocations and research trends.

**Parameters:**

- `pages_to_analyze` (number, optional): Number of pages to analyze for statistics (default: 5, max: 20)

### find_similar_projects

Find projects with similar research focus or abstracts.

**Parameters:**

- `project_id` (number, optional): Reference project ID to find similar projects
- `keywords` (string, optional): Keywords to find similar projects
- `limit` (number, optional): Maximum number of similar projects to return (default: 10)

## Resources

- `accessci://allocations`: ACCESS-CI Research Projects and Allocations data

## Installation

```bash
npm install -g @access-mcp/allocations
```

## Usage

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "access-allocations": {
      "command": "npx",
      "args": ["@access-mcp/allocations"]
    }
  }
}
```

## API Endpoints

This server connects to the ACCESS-CI Allocations portal at `https://allocations.access-ci.org`

**Important Note:** ACCESS Credits are computational resource credits, NOT monetary currency.

## License

MIT

---

**Package:** `@access-mcp/allocations`  
**Version:** v0.1.0  
**Main:** `dist/index.js`
