# Software Discovery MCP Server

MCP server for discovering software packages across ACCESS-CI compute resources. Features global software search across all resources, resource-specific browsing, AI-enhanced metadata, advanced filtering capabilities, and detailed package information using the Software Discovery Service (SDS) API.

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
"Available filter values for research areas"
```

## Tools

### search_software

Comprehensive software search and filtering with support for global search, resource-specific queries, AI metadata filtering, package details, and filter discovery.

**Parameters:**

- `query` (string, optional): Search query for software names/descriptions (e.g., 'python', 'tensorflow', 'gromacs'). Omit to list all software.
- `software_name` (string, optional): Get details for a specific software package by exact name
- `resource_id` (string, optional): Filter by specific resource ID (e.g., 'delta.ncsa.access-ci.org'). Use `access-compute-resources:search_resources` with `include_resource_ids: true` to discover resource IDs.
- `filter_research_area` (string, optional): Filter by AI-identified research area (partial match)
- `filter_tags` (array, optional): Filter by AI tags (matches any provided tag)
- `filter_software_type` (string, optional): Filter by AI-identified software type
- `include_ai_metadata` (boolean, optional): Include AI-generated metadata. Default: true
- `discover_filters` (boolean, optional): Return available filter values. Default: false
- `limit` (number, optional): Maximum results. Default: 100

**Usage Examples:**

```javascript
// Browse all available software (no search required!)
search_software({ limit: 100 })

// Search for Python packages
search_software({ query: "python", limit: 20 })

// List all software on Delta
search_software({ resource_id: "delta.ncsa.access-ci.org", limit: 50 })

// Find machine learning software
search_software({ filter_tags: ["machine-learning", "deep-learning"], limit: 30 })

// Get TensorFlow details
search_software({ software_name: "tensorflow", resource_id: "delta.ncsa.access-ci.org" })

// Discover available filters
search_software({ discover_filters: true, limit: 200 })
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
- `SDS_API_KEY`: API key for the Software Discovery Service (required)

**Resource ID Compatibility:** Supports both ACCESS-CI format (`anvil.purdue.access-ci.org`) and legacy XSEDE format (automatically converted).

## Resources

- `accessci://software-discovery`: ACCESS-CI Software Discovery Service
- `accessci://software/categories`: Browse software by category and domain

## API Endpoints

This server connects to the ACCESS-CI Software Discovery Service at `https://ara-db.ccs.uky.edu`

## License

MIT