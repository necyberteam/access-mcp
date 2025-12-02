# Software Discovery MCP Server

MCP server for discovering software packages across ACCESS-CI compute resources. Features global software search across all resources, resource-specific browsing, AI-enhanced metadata, fuzzy matching, software comparison, and detailed package information using the Software Discovery Service (SDS) API v1.

## What's New in v0.6.0

- **New API Backend**: Uses the new SDS API v1 at `sds-ara-api.access-ci.org`
- **Fuzzy Search**: Fuzzy matching for both software names and resource providers
- **Improved Tools**: Reorganized tools for clearer use cases
- **Software Comparison**: New tool to compare software availability across resources

## Usage Examples

### **Search & Browse**

```
"TensorFlow availability across ACCESS-CI"
"All software on Expanse"
"Python versions on Delta"
"GROMACS installation on Bridges-2"
```

### **AI-Enhanced Discovery**

```
"Machine learning software on Delta"
"Quantum chemistry tools (all resources)"
"Computational biology packages"
"GPU-optimized software by category"
```

### **Comparison Queries**

```
"Compare CUDA and OpenMPI availability"
"Which resources have TensorFlow and PyTorch?"
```

## Tools

### search_software

Search software packages on ACCESS-CI resources with fuzzy matching support.

**Parameters:**

- `query` (string, optional): Software name to search for (e.g., 'python', 'gcc', 'tensorflow'). Supports fuzzy matching.
- `resource` (string, optional): Resource provider name or ID to filter by (e.g., 'anvil', 'expanse', 'delta.ncsa.access-ci.org'). Supports fuzzy matching.
- `fuzzy` (boolean, optional): Enable fuzzy matching for software and resource names. Default: true
- `include_ai_metadata` (boolean, optional): Include AI-generated metadata (tags, research area, software type, etc.). Default: true
- `limit` (number, optional): Max results to return. Default: 100

**Usage Examples:**

```javascript
// Search for Python packages with fuzzy matching
search_software({ query: "python", limit: 20 })

// Find TensorFlow on Anvil
search_software({ query: "tensorflow", resource: "anvil" })

// Exact search (no fuzzy matching)
search_software({ query: "gcc", fuzzy: false })
```

### list_all_software

List all software packages available across ACCESS-CI resources.

**Parameters:**

- `resource` (string, optional): Filter to a specific resource provider (e.g., 'anvil', 'expanse')
- `include_ai_metadata` (boolean, optional): Include AI-generated metadata. Default: false
- `limit` (number, optional): Max results to return. Default: 100

**Usage Examples:**

```javascript
// List all available software
list_all_software({ limit: 100 })

// List software on Delta
list_all_software({ resource: "delta", limit: 50 })
```

### get_software_details

Get detailed information about a specific software package.

**Parameters:**

- `software_name` (string, required): Exact or partial software name
- `resource` (string, optional): Filter to a specific resource provider
- `fuzzy` (boolean, optional): Enable fuzzy matching for software name. Default: true

**Usage Examples:**

```javascript
// Get TensorFlow details
get_software_details({ software_name: "tensorflow" })

// Get GCC details on Expanse
get_software_details({ software_name: "gcc", resource: "expanse" })
```

### compare_software_availability

Compare software availability across multiple resources.

**Parameters:**

- `software_names` (array, required): List of software names to check
- `resources` (array, optional): List of resources to compare (compares all if not specified)

**Usage Examples:**

```javascript
// Compare CUDA and OpenMPI availability
compare_software_availability({
  software_names: ["cuda", "openmpi"]
})

// Compare on specific resources
compare_software_availability({
  software_names: ["tensorflow", "pytorch"],
  resources: ["anvil", "delta", "expanse"]
})
```

## Installation

```bash
npm install -g @access-mcp/software-discovery
```

Add to Claude Desktop configuration:

```json
{
  "mcpServers": {
    "access-software-discovery": {
      "command": "npx",
      "args": ["@access-mcp/software-discovery"],
      "env": {
        "SDS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Environment Variables:**
- `SDS_API_KEY`: API key for the Software Discovery Service (required). Contact the ACCESS-CI team to request an API key.

**Resource ID Compatibility:** Supports both ACCESS-CI format (`anvil.purdue.access-ci.org`) and legacy XSEDE format (automatically converted). Also supports simple resource names (e.g., 'anvil', 'delta') with fuzzy matching.

## Resources

- `accessci://software-discovery`: ACCESS-CI Software Discovery Service
- `accessci://software/categories`: Discover available filter values from actual software data

## API Endpoints

This server connects to the ACCESS-CI Software Discovery Service API v1 at `https://sds-ara-api.access-ci.org`

## License

MIT
