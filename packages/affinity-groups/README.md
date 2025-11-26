# Affinity Groups MCP Server

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

## Installation

```bash
npm install -g @access-mcp/affinity-groups
```

## Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "access-affinity-groups": {
      "command": "npx",
      "args": ["@access-mcp/affinity-groups"]
    }
  }
}
```


## Detailed Usage Examples

### Getting Affinity Group Information

**Natural Language**: "Tell me about the Bridges-2 affinity group"

**Tool Call**:

```typescript
const groupInfo = await search_affinity_groups({
  group_id: "bridges2.psc.access-ci.org",
});
```

**Returns**: Group details including description, members, resources, and contact information.

### Finding Events and Trainings

**Natural Language**: "What events are coming up for GPU computing?"

**Tool Call**:

```typescript
const events = await search_affinity_groups({
  group_id: "gpu-computing.access-ci.org",
  include: "events",
  upcoming_events_only: true
});
```

**Returns**: List of upcoming workshops, training sessions, and community events.

### Accessing Knowledge Base Resources

**Natural Language**: "Find documentation for the Delta system"

**Tool Call**:

```typescript
const resources = await search_affinity_groups({
  group_id: "delta.ncsa.access-ci.org",
  include: "kb"
});
```

**Returns**: Documentation, tutorials, best practices, and user guides.

### Getting Complete Group Information

**Natural Language**: "Give me everything about the Anvil group"

**Tool Call**:

```typescript
const complete = await search_affinity_groups({
  group_id: "anvil.purdue.access-ci.org",
  include: "all"
});
```

**Returns**: Complete group profile including basic info, events, and knowledge base resources (fetched in parallel for optimal performance).
