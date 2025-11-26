# MCP server for ACCESS-CI System Status and Outages API

MCP server providing real-time system status information for ACCESS-CI resources. Provides critical operational information about ACCESS-CI systems, including current outages, scheduled maintenance, and system-wide announcements.

## Usage Examples

### **Current Status**

```
"Current ACCESS-CI outages"
"Delta operational status"
"Systems experiencing issues"
"GPU systems status check"
```

### **Maintenance & Incidents**

```
"Scheduled maintenance this week"
"Next Expanse maintenance window"
"Past outages for Bridges-2"
"All infrastructure news for Delta"
```


## Installation

```bash
npm install -g @access-mcp/system-status
```

Add to your Claude Desktop configuration:

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

## Tools

### get_infrastructure_news

Comprehensive ACCESS-CI infrastructure status and outage information. Get current outages, scheduled maintenance, past incidents, and operational status for ACCESS-CI resources. Provides real-time monitoring of system health and availability.

**Parameters:**

- `resource` (string, optional): Filter by specific resource name or ID (e.g., 'delta', 'bridges2')
- `time` (string, optional): Time period for infrastructure news: 'current' (active outages), 'scheduled' (future maintenance), 'past' (historical incidents), 'all' (comprehensive overview). Default: 'current'
- `resource_ids` (array of strings, optional): Check operational status for specific resource IDs (returns 'operational' or 'affected' status). Use instead of 'resource' parameter for status checking
- `limit` (number, optional): Maximum number of items to return (default: 50 for 'all', 100 for 'past')
- `use_group_api` (boolean, optional): Use resource group API for status checking (only with resource_ids parameter, default: false)

**Examples:**

```typescript
// Get current outages across all resources
get_infrastructure_news({})

// Get scheduled maintenance
get_infrastructure_news({ time: "scheduled" })

// Get comprehensive overview of all infrastructure news
get_infrastructure_news({ time: "all" })

// Check current status for specific resource
get_infrastructure_news({ resource: "delta", time: "current" })

// Get all news for specific resource
get_infrastructure_news({ resource: "delta", time: "all" })

// Check operational status of specific resources
get_infrastructure_news({
  resource_ids: ["delta.ncsa.access-ci.org", "bridges2.psc.access-ci.org"]
})

// Get past outages with limit
get_infrastructure_news({ time: "past", limit: 50 })
```

## Resources

- `accessci://system-status`: Current operational status of all ACCESS-CI resources

---

**Package:** `@access-mcp/system-status`  
**Version:** v0.5.0  
**Main:** `dist/index.js`
