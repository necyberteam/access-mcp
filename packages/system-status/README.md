# System Status MCP Server

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
const outages = await get_infrastructure_news({});
// or explicitly: get_infrastructure_news({ time: "current" })
```

**Returns**: List of active outages with:
- Affected resources
- Severity categorization (high/medium/low)
- Start time and expected resolution
- Impact description
- Summary statistics (total outages, affected resources)

### Finding Scheduled Maintenance

**Natural Language**: "When is Delta scheduled for maintenance?"

**Tool Call**:
```typescript
const maintenance = await get_infrastructure_news({
  resource: "delta",
  time: "scheduled"
});
```

**Returns**: Upcoming maintenance windows including:
- Scheduled start and end times
- Systems affected
- Duration in hours
- Hours until maintenance starts
- Summary (upcoming in 24h, upcoming this week)

### Getting Comprehensive System Overview

**Natural Language**: "What are the latest announcements?"

**Tool Call**:
```typescript
const announcements = await get_infrastructure_news({
  time: "all",
  limit: 10
});
```

**Returns**: Comprehensive overview including:
- Current outages
- Scheduled maintenance
- Recent past outages (last 30 days)
- Category breakdown
- Sorted by relevance (current issues first)

### Checking Specific Resource Status

**Natural Language**: "Is Expanse available?"

**Tool Call**:
```typescript
const status = await get_infrastructure_news({
  resource_ids: ["expanse.sdsc.access-ci.org"]
});
```

**Returns**: Current operational status:
- Overall status ("operational" or "affected")
- Severity level if affected
- Number of active outages
- Outage details with subjects
- Timestamp of status check

## API Endpoints

This server connects to the ACCESS-CI Operations API at `https://operations-api.access-ci.org`

## License

MIT
