# MCP server for ACCESS-CI Compute Resources API

MCP server providing access to ACCESS-CI compute resources information including hardware specifications, resource status, and detailed configurations. Get comprehensive information about supercomputers, clusters, and their technical capabilities.

## Usage Examples

### **Discover Resources**

```
"What compute resources are available on ACCESS-CI?"
"List all available supercomputers and clusters"
"Show me information about high-performance computing resources"
"Search for GPU resources on ACCESS-CI"
"Find resources at NCSA"
"Show me cloud computing resources"
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

### search_resources

**CRITICAL TOOL**: Search for compute resources and discover resource IDs needed by other ACCESS-CI services.

**Parameters:**

- `query` (string, optional): Search term to match against resource names, descriptions, and organizations
- `resource_type` (string, optional): Filter by resource type (compute, storage, cloud, gpu, cpu)
- `has_gpu` (boolean, optional): Filter for resources with GPU capabilities
- `include_resource_ids` (boolean): Include resource IDs needed for other ACCESS-CI services (set to true for cross-service workflows)

## Resources

- `accessci://compute-resources`: Comprehensive information about all compute resources

---

**Package:** `@access-mcp/compute-resources`  
**Version:** v0.5.1  
**Main:** `dist/index.js`
