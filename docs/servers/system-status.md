# MCP server for ACCESS-CI System Status and Outages API

MCP server providing real-time system status information for ACCESS-CI resources. Provides critical operational information about ACCESS-CI systems, including current outages, scheduled maintenance, and system-wide announcements.

## Usage Examples

### **Monitor Current Issues**

```
"Are there any current outages on ACCESS-CI?"
"Is Delta currently operational?"
"What systems are experiencing issues right now?"
"Show me all systems that are down"
```

### **Track Maintenance Windows**

```
"When is the next maintenance for Expanse?"
"Show me all scheduled maintenance for this week"
"Is there upcoming maintenance on Bridges-2?"
"What maintenance is planned for GPU systems?"
```

### **System Announcements**

```
"What are the latest system announcements?"
"Are there any important notices for ACCESS users?"
"Show me recent updates about system changes"
"Any policy updates I should know about?"
```

### **Check Resource Status**

```
"What's the current status of Anvil?"
"Is Frontera available for job submission?"
"Check if all GPU systems are operational"
"Get status for all TACC resources"
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

### get_current_outages

Get current system outages and issues affecting ACCESS-CI resources.

**Parameters:**

- `resource_filter` (string, optional): Filter by specific resource name or ID

**Example:**
```typescript
// User: "Are there any current outages on Delta?"
const outages = await get_current_outages({
  resource_filter: "delta"
});
```

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

---

**Package:** `@access-mcp/system-status`  
**Version:** v0.4.2  
**Main:** `dist/index.js`
