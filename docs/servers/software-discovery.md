# ACCESS-CI Software Discovery Service MCP server

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


## Installation

```bash
npm install -g @access-mcp/software-discovery
```

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "software-discovery": {
      "command": "npx",
      "args": ["@access-mcp/software-discovery"]
    }
  }
}
```



---

**Package:** `@access-mcp/software-discovery`  
**Version:** v0.3.0  
**Main:** `dist/index.js`
