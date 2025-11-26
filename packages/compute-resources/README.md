# Compute Resources MCP Server

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

## Installation

```bash
npm install -g @access-mcp/compute-resources
```

## Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "access-compute-resources": {
      "command": "npx",
      "args": ["@access-mcp/compute-resources"]
    }
  }
}
```

## Usage Examples

### 🖥️ **Discover Available Resources**

- "What compute resources are available on ACCESS-CI?"
- "Show me all GPU-enabled systems"
- "Which systems have the most CPU cores?"

### 🔍 **Get Resource Details**

- "Tell me about the Expanse cluster at SDSC"
- "What are the specifications of the Delta system?"
- "Show me details about Bridges-2 at PSC"

### 💻 **Hardware Specifications**

- "What GPUs are available on Delta?"
- "How much memory does Anvil have per node?"
- "What's the interconnect on Frontera?"

## Detailed Usage Examples

### Listing All Compute Resources

**Natural Language**: "Show me all available ACCESS-CI compute resources"

**Tool Call**:

```typescript
const resources = await search_resources({});
```

**Returns**: Complete list of all compute resources with names, organizations, and basic specs.

### Getting Detailed Resource Information

**Natural Language**: "Tell me everything about the Expanse cluster"

**Tool Call**:

```typescript
const details = await search_resources({
  resource_id: "expanse.sdsc.xsede.org",
});
```

**Returns**: Comprehensive information including:

- System architecture and configuration
- Node types and counts
- Storage systems
- Software environment
- Access methods
- Support information

### Querying Hardware Specifications

**Natural Language**: "What hardware does Delta have?"

**Tool Call**:

```typescript
const hardware = await get_resource_hardware({
  resource_id: "delta.ncsa.xsede.org",
});
```

**Returns**: Detailed hardware specifications:

- CPU models and core counts
- GPU models and configurations
- Memory per node
- Interconnect technology
- Storage specifications

## API Endpoints

This server connects to the ACCESS-CI Operations API at `https://operations-api.access-ci.org`

## License

MIT
