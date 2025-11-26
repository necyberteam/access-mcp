# MCP server for NSF awards and funding integration

A Model Context Protocol (MCP) server for accessing NSF awards and funding information. Provides comprehensive access to the National Science Foundation's awards database with award search, detailed information, flexible search strategies, and funding analysis capabilities.

## Usage Examples

### **Search & Discovery**

```
"Awards for PI Dr. Jane Smith"
"Award #2138259 details"
"Computer science awards at MIT since 2020"
"Awards with 'quantum computing' keywords"
"Personnel search for Dr. Johnson (PI or Co-PI)"
```

### **Analysis & Filtering**

```
"Stanford awards over $500K"
"Largest materials science awards, 2020-2024"
"All Co-PIs on award #1947282"
"Physics awards by funding amount"
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

## Tools

### `search_nsf_awards`

Comprehensive search for NSF awards and funding information. Search by award number, principal investigator, personnel (PI/Co-PI), institution, or research keywords. Returns detailed award information including funding amounts, project dates, abstracts, and team members.

**Parameters:**

- `id` (string, optional): Get specific NSF award by award number. Returns complete award details with full abstract
- `pi` (string, optional): Search for awards where this person is the Principal Investigator. Use for tracking researcher's grant history
- `institution` (string, optional): Search for all awards granted to this institution. Use to discover institutional research portfolio
- `query` (string, optional): Search awards by keywords in titles and abstracts. Use to find projects in specific research domains
- `primary_only` (boolean, optional): When searching by institution, only return awards where the institution is the PRIMARY recipient (excludes collaborative/co-PI awards from other institutions). Default: false
- `limit` (number, optional): Maximum number of awards to return (default: 10, max: 100)

**Examples:**

```typescript
// Get specific award details
search_nsf_awards({ id: "2138259" })

// Find awards by PI
search_nsf_awards({ pi: "John Smith", limit: 10 })

// Find awards by institution (all awards including collaborations)
search_nsf_awards({ institution: "Stanford University", limit: 20 })

// Find awards where institution is PRIMARY recipient only
search_nsf_awards({ institution: "Stanford University", primary_only: true, limit: 20 })

// Search awards by keywords
search_nsf_awards({ query: "machine learning", limit: 10 })
```

**Returns:** Award information including award number, title, PI/Co-PIs, institution, funding amounts, project dates, program details, and abstract.

---

**Package:** `@access-mcp/nsf-awards`  
**Version:** v0.2.0  
**Main:** `dist/index.js`
