# MCP server for ACCESS-CI Compute Resources API

MCP server providing access to ACCESS-CI compute resources information including hardware specifications, resource status, and detailed configurations. Get comprehensive information about supercomputers, clusters, and their technical capabilities.

## Usage Examples

### **Discover Resources**

```
"What compute resources are available on ACCESS-CI?"
"List all available supercomputers and clusters"
"Show me information about high-performance computing resources"
```

### **Get Resource Details**

```
"Tell me about the Expanse supercomputer"
"What are the specifications of Delta?"
"Show me details about Bridges-2"
```

### **Hardware Specifications**

```
"What are the hardware specs for Anvil?"
"How many GPUs does Delta have?"
"What's the memory configuration on Frontera?"
```


## Installation

```bash
npm install -g @access-mcp/compute-resources
```

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "compute-resources": {
      "command": "npx",
      "args": ["@access-mcp/compute-resources"]
    }
  }
}
```

## Tools

### list_compute_resources

List all available ACCESS-CI compute resources.

**Parameters:** None

### get_compute_resource

Get detailed information about a specific compute resource.

**Parameters:**

- `resource_id` (string): The resource ID or info_groupid (e.g., "expanse.sdsc.xsede.org")

### get_resource_hardware

Get hardware specifications for a compute resource.

**Parameters:**

- `resource_id` (string): The resource ID or info_groupid

## Resources

- `accessci://compute-resources`: Comprehensive information about all compute resources

---

**Package:** `@access-mcp/compute-resources`  
**Version:** v0.3.0  
**Main:** `dist/index.js`
