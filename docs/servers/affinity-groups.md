# MCP server for ACCESS-CI Affinity Groups API

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

---

**Package:** `@access-mcp/affinity-groups`  
**Version:** v0.3.1  
**Main:** `dist/index.js`
