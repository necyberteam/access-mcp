# MCP server for ACCESS-CI System Status and Outages API

MCP server for ACCESS-CI System Status and Outages API

## Installation

### Download & Run

1. Download the [latest release](https://github.com/necyberteam/access-mcp/releases)
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
      "command": "npx",
      "args": ["@access-mcp/system-status"]
    }
  }
}
```

## Usage Examples

<!-- TODO: Extract examples from server code -->

## Development

# System Status MCP Server

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

## Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "access-system-status": {
      "command": "npx",
      "args": ["@access-mcp/system-status"]
    }
  }
}
```

## Usage Examples

### 🚨 **Monitor Current Issues**

- "Are there any current outages on ACCESS-CI?"
- "Is Delta currently operational?"
- "What systems are experiencing issues right now?"

### 🔧 **Track Maintenance Windows**

- "When is the next maintenance for Expanse?"
- "Show me all scheduled maintenance for this week"
- "Is there upcoming maintenance on Bridges-2?"

### 📢 **System Announcements**

- "What are the latest system announcements?"
- "Are there any important notices for ACCESS users?"
- "Show me recent updates about system changes"

### ✅ **Check Resource Status**

- "What's the current status of Anvil?"
- "Is Frontera available for job submission?"
- "Check if all GPU systems are operational"

## Detailed Usage Examples

### Checking Current Outages

**Natural Language**: "Are there any systems down right now?"

**Tool Call**:

```typescript
const outages = await get_current_outages();
```

**Returns**: List of active outages with:

- Affected resources
- Start time and expected resolution
- Impact description
- Workaround information if available

### Finding Scheduled Maintenance

**Natural Language**: "When is Delta scheduled for maintenance?"

**Tool Call**:

```typescript
const maintenance = await get_scheduled_maintenance({
  resource_filter: "delta",
});
```

**Returns**: Upcoming maintenance windows including:

- Scheduled start and end times
- Systems affected
- Type of maintenance
- Expected impact on users

### Getting System Announcements

**Natural Language**: "What are the latest announcements?"

**Tool Call**:

```typescript
const announcements = await get_system_announcements({
  limit: 10,
});
```

**Returns**: Recent announcements about:

- Policy changes
- New features or services
- Important deadlines
- System-wide updates

### Checking Specific Resource Status

**Natural Language**: "Is Expanse available?"

**Tool Call**:

```typescript
const status = await get_resource_status({
  resource_id: "expanse.sdsc.xsede.org",
});
```

**Returns**: Current operational status:

- Overall system health
- Service availability
- Performance metrics
- Any active issues or limitations

## API Endpoints

This server connects to the ACCESS-CI Operations API at `https://operations-api.access-ci.org`

## License

MIT

---

**Package:** `@access-mcp/system-status`  
**Version:** v0.3.0  
**Main:** `dist/index.js`
