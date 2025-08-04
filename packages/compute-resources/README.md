# ACCESS-CI Compute Resources MCP Server

MCP server providing access to ACCESS-CI compute resources information.

## Overview

This server provides comprehensive information about compute resources available through ACCESS-CI, including hardware specifications, resource status, and detailed configurations.

## Tools

### list_compute_resources

List all available ACCESS-CI compute resources.

**Parameters:** None

### get_compute_resource

Get detailed information about a specific compute resource.

**Parameters:**

- `resource_id` (string): The resource ID or info_groupid (e.g., "expanse.sdsc.xsede.org")

### get_resource_hardware

Get hardware specifications for a compute resource.

**Parameters:**

- `resource_id` (string): The resource ID or info_groupid

## Resources

- `accessci://compute-resources`: Comprehensive information about all compute resources

## Installation

```bash
npm install -g @access-mcp/compute-resources
```

## Usage

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "access-compute-resources": {
      "command": "access-mcp-compute-resources"
    }
  }
}
```

## API Endpoints

This server connects to the ACCESS-CI Operations API at `https://operations-api.access-ci.org`

## License

MIT
