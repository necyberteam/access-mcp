# Software Discovery MCP Server

MCP server for discovering software packages across ACCESS-CI compute resources. Features global software search across all resources, resource-specific browsing, and detailed package information using the Software Discovery Service (SDS) API.

## Usage Examples

### **Global Software Search**

```
"Is TensorFlow available on ACCESS-CI resources?"
"Find Python across all ACCESS systems"
"What versions of GROMACS are available?"
"Search for MATLAB on ACCESS-CI"
```

### **Browse by Resource**

```
"What software is available on Expanse?"
"List all bioinformatics tools on Bridges-2"
"Show me GPU-optimized software on Delta"
"What modules are available on Anvil?"
```

### **Category-Based Discovery**

```
"Find all chemistry software packages"
"What machine learning frameworks are available?"
"Show me computational fluid dynamics tools"
"List physics simulation software"
```

### **Software Details**

```
"Tell me about the PyTorch installation on Delta"
"What modules do I need to load for VASP on Expanse?"
"How do I use MATLAB on Anvil?"
"Show me installation details for GROMACS on Bridges-2"
```

## Installation & Configuration

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

## Tools

### search_software

Search for software packages across ACCESS-CI resources. Supports both global search (across all resources) and resource-specific search.

**Parameters:**

- `query` (string): Search query for software names (e.g., 'python', 'tensorflow', 'gromacs')
- `resource_filter` (string, optional): Filter results by specific resource ID. If omitted, searches across all ACCESS-CI resources.

**Examples:**
- Global search: `search_software({query: "tensorflow"})` - finds TensorFlow across all resources
- Resource-specific: `search_software({query: "python", resource_filter: "delta.ncsa.access-ci.org"})` - finds Python packages only on Delta

### list_software_by_resource

List all available software packages for a specific ACCESS-CI resource.

**Parameters:**

- `resource_id` (string): The resource ID (e.g., "expanse.sdsc.access-ci.org", legacy XSEDE format also supported)
- `limit` (number, optional): Maximum number of results (default: 100)

### get_software_details

Get detailed information about a specific software package on a resource.

**Parameters:**

- `software_name` (string): Name of the software package
- `resource_id` (string): The resource ID where the software is installed

### get_software_categories

Get available software categories and domains.

**Parameters:**

- `resource_id` (string, optional): Filter categories by specific resource

## Resources

- `accessci://software-discovery`: ACCESS-CI Software Discovery Service
- `accessci://software/categories`: Browse software by category and domain

## API Endpoints

This server connects to the ACCESS-CI Software Discovery Service at `https://ara-db.ccs.uky.edu`

## License

MIT