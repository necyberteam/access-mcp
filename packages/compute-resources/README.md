# Compute Resources MCP Server

MCP server providing access to ACCESS-CI compute resources information.

## Overview

This server provides comprehensive information about compute resources available through ACCESS-CI, including hardware specifications, resource status, and detailed configurations.

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
const resources = await list_compute_resources();
```

**Returns**: Complete list of all compute resources with names, organizations, and basic specs.

### Getting Detailed Resource Information

**Natural Language**: "Tell me everything about the Expanse cluster"

**Tool Call**:
```typescript
const details = await get_compute_resource({
  resource_id: "expanse.sdsc.xsede.org"
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
  resource_id: "delta.ncsa.xsede.org"
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
