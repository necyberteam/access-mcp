# MCP server for ACCESS-CI Affinity Groups API

MCP server for ACCESS-CI Affinity Groups API

## Installation

### Download & Run
1. Download the [latest release](https://github.com/necyberteam/access-mcp/releases)
2. Extract and locate the `affinity-groups/index.js` file
3. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "affinity-groups": {
      "command": "/path/to/affinity-groups/index.js"
    }
  }
}
```

### npm Package
```bash
npm install -g @access-mcp/affinity-groups
```

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

## Usage Examples

<!-- TODO: Extract examples from server code -->

## Development

# Affinity Groups MCP Server

MCP server providing access to ACCESS-CI Affinity Groups API endpoints.

## API Endpoints Covered

- **Affinity Groups**: `/api/1.0/affinity_groups/{group_id}`
- **Events & Trainings**: `/api/1.1/events/ag/{group_id}`
- **Knowledge Base**: `/api/1.0/kb/{group_id}`

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

## Usage Examples

### 🔍 **Discover Community Resources**

- "What affinity groups are available for machine learning?"
- "Show me information about the GPU computing affinity group"
- "Find affinity groups related to bioinformatics"

### 📅 **Find Events and Trainings**

- "What upcoming events are there for the bridges2.psc.access-ci.org group?"
- "Show me training opportunities for GPU computing"
- "Find workshops about parallel computing"

### 📚 **Access Knowledge Base**

- "Get knowledge base resources for quantum computing"
- "What documentation is available for the Anvil cluster?"
- "Find tutorials for the Delta GPU system"

## Detailed Usage Examples

### Getting Affinity Group Information

**Natural Language**: "Tell me about the Bridges-2 affinity group"

**Tool Call**:
```typescript
const groupInfo = await get_affinity_group({
  group_id: "bridges2.psc.access-ci.org"
});
```

**Returns**: Group details including description, members, resources, and contact information.

### Finding Events and Trainings

**Natural Language**: "What events are coming up for GPU computing?"

**Tool Call**:
```typescript
const events = await get_affinity_group_events({
  group_id: "gpu-computing.access-ci.org"
});
```

**Returns**: List of upcoming workshops, training sessions, and community events.

### Accessing Knowledge Base Resources

**Natural Language**: "Find documentation for the Delta system"

**Tool Call**:
```typescript
const resources = await get_affinity_group_kb({
  group_id: "delta.ncsa.access-ci.org"
});
```

**Returns**: Documentation, tutorials, best practices, and user guides.


---

**Package:** `@access-mcp/affinity-groups`  
**Version:** v0.3.0  
**Main:** `dist/index.js`
