# ACCESS-CI System Status MCP Server

MCP server providing real-time system status information for ACCESS-CI resources.

## Overview

This server provides critical operational information about ACCESS-CI systems, including current outages, scheduled maintenance, and system-wide announcements.

## Tools

### get_current_outages
Get current system outages and issues affecting ACCESS-CI resources.

**Parameters:**
- `resource_filter` (string, optional): Filter by specific resource name or ID

### get_scheduled_maintenance
Get scheduled maintenance and future outages for ACCESS-CI resources.

**Parameters:**
- `resource_filter` (string, optional): Filter by specific resource name or ID

### get_system_announcements
Get all system announcements (current and scheduled).

**Parameters:**
- `limit` (number, optional): Maximum number of announcements to return (default: 50)

### get_resource_status
Get the current operational status of a specific resource.

**Parameters:**
- `resource_id` (string): The resource ID to check status for

## Resources

- `accessci://system-status`: Current operational status of all ACCESS-CI resources

## Installation

```bash
npm install -g @access-mcp/system-status
```

## Usage

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "access-system-status": {
      "command": "access-mcp-system-status"
    }
  }
}
```

## API Endpoints

This server connects to the ACCESS-CI Operations API at `https://operations-api.access-ci.org`

## License

MIT