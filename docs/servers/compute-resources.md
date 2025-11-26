# MCP server for ACCESS-CI Compute Resources API

MCP server providing access to ACCESS-CI compute resources information including hardware specifications, resource status, and detailed configurations. Get comprehensive information about supercomputers, clusters, and their technical capabilities.

## Usage Examples

### **Discovery & Search**

```
"List all GPU resources"
"Resources at NCSA"
"Cloud computing systems"
"Expanse details"
"Delta hardware specifications"
```

### **Advanced Queries**

```
"GPU count and models on Delta"
"Compute resources with A100 GPUs"
"Memory configuration on Frontera"
"All resources at SDSC"
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

### search_resources

Comprehensive search for ACCESS-CI compute resources. Supports listing all resources, getting details for specific resources, and advanced filtering by type/GPU capability. Returns resource IDs needed for other ACCESS-CI services.

**Parameters:**

- `resource_id` (string, optional): Get detailed information for specific resource by ID or info_groupid (e.g., "expanse.sdsc.xsede.org")
- `query` (string, optional): Search term to match against resource names, descriptions, and organizations
- `resource_type` (string, optional): Filter by resource type (compute, storage, cloud, gpu, cpu)
- `has_gpu` (boolean, optional): Filter for resources with GPU capabilities
- `include_resource_ids` (boolean, optional): Include resource IDs needed for other ACCESS-CI services (default: true for cross-service workflows)
- `limit` (number, optional): Maximum number of results to return (default: 50)

**Examples:**

```typescript
// List all resources
search_resources({})

// Get specific resource details
search_resources({ resource_id: "expanse.sdsc.xsede.org" })

// Find GPU resources
search_resources({ has_gpu: true, limit: 20 })

// Search by query
search_resources({ query: "NCSA", limit: 10 })

// Filter by type
search_resources({ resource_type: "compute", include_resource_ids: true })
```

### get_resource_hardware

Get detailed hardware specifications for a specific compute resource including CPU models, GPU configurations, memory, interconnect, and storage details.

**Parameters:**

- `resource_id` (string): The resource ID or info_groupid (e.g., "delta.ncsa.xsede.org")

## Resources

- `accessci://compute-resources`: Comprehensive information about all compute resources

---

**Package:** `@access-mcp/compute-resources`  
**Version:** v0.6.0  
**Main:** `dist/index.js`
