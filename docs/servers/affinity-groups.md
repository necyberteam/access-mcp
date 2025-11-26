# MCP server for ACCESS-CI Affinity Groups API

MCP server providing access to ACCESS-CI Affinity Groups API endpoints. Access community resources, events and trainings, and knowledge base content for affinity groups across the ACCESS-CI ecosystem.

## Usage Examples

### **Discovery**

```
"List all affinity groups"
"Machine learning affinity groups"
"Bridges-2 group details"
"Groups related to bioinformatics"
```

### **Events & Trainings**

```
"Upcoming events for delta.ncsa.access-ci.org"
"GPU computing training opportunities"
"Workshops about parallel computing"
"All events and knowledge base for bridges2.psc.access-ci.org"
```


## Installation

```bash
npm install -g @access-mcp/affinity-groups
```

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "affinity-groups": {
      "command": "npx",
      "args": ["@access-mcp/affinity-groups"]
    }
  }
}
```

## Tools

### search_affinity_groups

Comprehensive affinity groups search and discovery. Get information about affinity groups, their events, and knowledge base content with a single unified tool.

**Parameters:**

- `group_id` (string, optional): Get information for specific affinity group by identifier (e.g., "bridges2.psc.access-ci.org"). Omit to list all affinity groups
- `include` (string, optional): What to include in response - "events", "kb" (knowledge base), or "all" for complete group information. Default: "basic" (group info only)
- `query` (string, optional): Search term to filter groups by name or description
- `upcoming_events_only` (boolean, optional): When include="events", filter to upcoming events only (default: true)
- `limit` (number, optional): Maximum number of items to return (default: 50)

**Examples:**

```typescript
// List all affinity groups
search_affinity_groups({})

// Get specific group details
search_affinity_groups({ group_id: "bridges2.psc.access-ci.org" })

// Get group with events
search_affinity_groups({
  group_id: "bridges2.psc.access-ci.org",
  include: "events"
})

// Get complete group information (parallel fetching)
search_affinity_groups({
  group_id: "delta.ncsa.access-ci.org",
  include: "all"
})

// Search for groups by query
search_affinity_groups({ query: "GPU", limit: 10 })
```

---

**Package:** `@access-mcp/affinity-groups`  
**Version:** v0.4.0  
**Main:** `dist/index.js`
