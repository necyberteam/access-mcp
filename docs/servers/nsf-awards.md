# MCP server for NSF awards and funding integration

A Model Context Protocol (MCP) server for accessing NSF awards and funding information. Provides comprehensive access to the National Science Foundation's awards database with award search, detailed information, flexible search strategies, and funding analysis capabilities.

## Usage Examples

### **Search by Principal Investigator**

```
"Find NSF awards for Dr. Jane Smith"
"Show me all awards where John Doe is the PI"
"What grants has Maria Garcia received from NSF?"
```

### **Search by Personnel**

```
"Find awards where Dr. Smith is PI or Co-PI"
"Show me all NSF funding for researchers at MIT"
"What awards include Dr. Johnson as personnel?"
```

### **Get Award Details**

```
"Tell me about NSF award 2138259"
"Show me the details of grant number 1947282"
"What is the funding amount for award 2045674?"
```

### **Funding Analysis**

```
"How much NSF funding does Stanford receive annually?"
"What's the average award size in computer science?"
"Show me the largest NSF awards in the last 5 years"
```


## Installation

```bash
npm install -g @access-mcp/nsf-awards
```

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "nsf-awards": {
      "command": "npx",
      "args": ["@access-mcp/nsf-awards"]
    }
  }
}
```



---

**Package:** `@access-mcp/nsf-awards`  
**Version:** v0.1.1  
**Main:** `dist/index.js`
