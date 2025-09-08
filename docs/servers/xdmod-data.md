# Python MCP server for XDMoD data access and analytics

A Python-based Model Context Protocol server for accessing XDMoD (XD Metrics on Demand) data using Python's data analytics capabilities for better data manipulation and user-specific queries. Features pandas integration, clean data structures, enhanced filtering, and framework integration with XDMoD's Python data analytics framework.

## Usage Examples

### **Authentication & Debug**

```
"Debug my XDMoD data authentication and check what frameworks are available"
"Test if the official XDMoD data framework is working"
```

### **Personal Usage Data**

```
"Get usage data for my ACCESS ID using the data server"
"Show me CPU hours for my ACCESS ID from January to June 2025"
"What's my computational usage for my ACCESS ID?"
```

### **Data Analytics**

```
"Get my usage data using the official data framework instead of REST API"
"Analyze the team's computational patterns using ACCESS IDs"
"Show me my usage trends for my ACCESS ID over the past 6 months"
```

### **Framework Integration**

```
"Test the XDMoD data analytics framework integration"
"Use pandas to analyze my computational usage patterns"
"Get clean structured data for my research usage"
```


## Installation

```bash
pipx install xdmod-mcp-data
```

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "xdmod-data": {
      "command": "xdmod-mcp-data"
    }
  }
}
```



---

**Package:** `xdmod-mcp-data`  
**Version:** v0.1.0  
**Main:** `src/server.py`
