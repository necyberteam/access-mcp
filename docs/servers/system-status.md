# System Status MCP Server

MCP server for real-time ACCESS-CI system status including current outages, scheduled maintenance, and operational status.

## Usage Examples

### Current Status
```
"Current ACCESS-CI outages"
"Delta operational status"
"Systems experiencing issues"
"GPU systems status check"
```

### Maintenance & Incidents
```
"Scheduled maintenance this week"
"Next Expanse maintenance window"
"Past outages for Bridges-2"
"All infrastructure news for Delta"
```

## Tools

### `get_infrastructure_news`

Get infrastructure status, outages, and maintenance information for ACCESS-CI resources.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `resource` | string | Filter by resource name (e.g., "delta", "bridges2") |
| `time` | enum | Time period: `current`, `scheduled`, `past`, `all` (default: "current") |
| `resource_ids` | array | Check status for specific resource IDs |
| `limit` | number | Max results (default: 50 for "all", 100 for "past") |
| `use_group_api` | boolean | Use resource group API for status checking (default: false) |

**Examples:**
```javascript
// Get current outages across all resources
get_infrastructure_news({})

// Get scheduled maintenance
get_infrastructure_news({ time: "scheduled" })

// Get comprehensive overview
get_infrastructure_news({ time: "all" })

// Check current status for specific resource
get_infrastructure_news({ resource: "delta", time: "current" })

// Check operational status of specific resources
get_infrastructure_news({
  resource_ids: ["delta.ncsa.access-ci.org", "bridges2.psc.access-ci.org"]
})

// Get past outages with limit
get_infrastructure_news({ time: "past", limit: 50 })
```

## Installation

```bash
npm install -g @access-mcp/system-status
```

## Configuration

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

## Resources

- `accessci://system-status` - Current operational status of all ACCESS-CI resources

---

**Package:** `@access-mcp/system-status`
**Version:** v0.5.0
**Main:** `dist/index.js`
