# Software Discovery MCP Server

MCP server providing software discovery and search capabilities for ACCESS-CI resources.

## Overview

This server enables searching and discovering software packages available across ACCESS-CI compute resources using the Software Discovery Service (SDS) API.

## Tools

### search_software

Search for software packages across ACCESS-CI resources.

**Parameters:**

- `query` (string): Search query for software names or descriptions
- `resource_filter` (string, optional): Filter results by specific resource ID

### list_software_by_resource

List all available software packages for a specific ACCESS-CI resource.

**Parameters:**

- `resource_id` (string): The resource ID (e.g., "expanse.sdsc.xsede.org")
- `limit` (number, optional): Maximum number of results (default: 100)

### get_software_details

Get detailed information about a specific software package on a resource.

**Parameters:**

- `software_name` (string): Name of the software package
- `resource_id` (string): The resource ID where the software is installed

### search_software_by_category

Search for software packages by category or domain.

**Parameters:**

- `category` (string): Software category (e.g., "bioinformatics", "chemistry", "physics")
- `resource_filter` (string, optional): Filter by specific resource

## Resources

- `accessci://software-catalog`: Comprehensive catalog of available software across all resources

## Installation

```bash
npm install -g @access-mcp/software-discovery
```

## Configuration

Add to your Claude Desktop configuration:

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

## Environment Variables

- `SDS_API_KEY`: API key for the Software Discovery Service (required)

## Usage Examples

### 🔍 **Search for Software**

- "Is TensorFlow available on ACCESS-CI resources?"
- "Find all Python packages on Delta"
- "What versions of GROMACS are available?"

### 📦 **Browse by Resource**

- "What software is available on Expanse?"
- "List all bioinformatics tools on Bridges-2"
- "Show me GPU-optimized software on Delta"

### 🏷️ **Category-Based Discovery**

- "Find all chemistry software packages"
- "What machine learning frameworks are available?"
- "Show me computational fluid dynamics tools"

### 📋 **Software Details**

- "Tell me about the PyTorch installation on Delta"
- "What modules do I need to load for VASP on Expanse?"
- "How do I use MATLAB on Anvil?"

## Detailed Usage Examples

### Searching for Specific Software

**Natural Language**: "Is PyTorch available on any ACCESS resources?"

**Tool Call**:
```typescript
const results = await search_software({
  query: "PyTorch"
});
```

**Returns**: List of resources with PyTorch installed, including:
- Available versions
- Module names
- Installation paths
- Dependencies

### Listing Software on a Resource

**Natural Language**: "What software is available on Delta?"

**Tool Call**:
```typescript
const software = await list_software_by_resource({
  resource_id: "delta.ncsa.xsede.org",
  limit: 50
});
```

**Returns**: Comprehensive software inventory including:
- Application names and versions
- Module load commands
- Software categories
- License information

### Getting Software Details

**Natural Language**: "How do I use GROMACS on Expanse?"

**Tool Call**:
```typescript
const details = await get_software_details({
  software_name: "GROMACS",
  resource_id: "expanse.sdsc.xsede.org"
});
```

**Returns**: Detailed usage information:
- Module load commands
- Environment setup
- Example job scripts
- Documentation links
- Performance tips

### Searching by Category

**Natural Language**: "What bioinformatics tools are available?"

**Tool Call**:
```typescript
const biotools = await search_software_by_category({
  category: "bioinformatics"
});
```

**Returns**: Category-specific software across all resources:
- Popular packages in the domain
- Resource availability
- Version compatibility
- Community usage statistics

## API Endpoints

This server connects to the ACCESS-CI Software Discovery Service at `https://ara-db.ccs.uky.edu`

## License

MIT
