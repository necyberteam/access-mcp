# Affinity Groups MCP Server

MCP server providing access to ACCESS-CI Affinity Groups API endpoints. Access community resources, events and trainings, and knowledge base content for affinity groups across the ACCESS-CI ecosystem.

## Usage Examples

### **Discover Community Resources**

```
"What affinity groups are available for machine learning?"
"Show me information about the GPU computing affinity group"
"Find affinity groups related to bioinformatics"
```

### **Find Events and Trainings**

```
"What upcoming events are there for the bridges2.psc.access-ci.org group?"
"Show me training opportunities for GPU computing"
"Find workshops about parallel computing"
```

### **Access Knowledge Base**

```
"Get knowledge base resources for quantum computing"
"What documentation is available for the Anvil cluster?"
"Find tutorials for the Delta GPU system"
```

## Tools

### get_affinity_group

Get basic information about a specific affinity group.

**Parameters:**

- `group_id` (string): The affinity group identifier (e.g., "bridges2.psc.access-ci.org")

### get_affinity_group_events

Get events and trainings for a specific affinity group.

**Parameters:**

- `group_id` (string): The affinity group identifier

### get_affinity_group_kb

Get knowledge base resources for a specific affinity group.

**Parameters:**

- `group_id` (string): The affinity group identifier

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
const groupInfo = await get_affinity_group({
  group_id: "bridges2.psc.access-ci.org",
});
```

**Returns**: Group details including description, members, resources, and contact information.

### Finding Events and Trainings

**Natural Language**: "What events are coming up for GPU computing?"

**Tool Call**:

```typescript
const events = await get_affinity_group_events({
  group_id: "gpu-computing.access-ci.org",
});
```

**Returns**: List of upcoming workshops, training sessions, and community events.

### Accessing Knowledge Base Resources

**Natural Language**: "Find documentation for the Delta system"

**Tool Call**:

```typescript
const resources = await get_affinity_group_kb({
  group_id: "delta.ncsa.access-ci.org",
});
```

**Returns**: Documentation, tutorials, best practices, and user guides.
