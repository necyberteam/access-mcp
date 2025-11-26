# NSF Awards MCP Server

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

## Installation

```bash
npm install -g @access-mcp/nsf-awards
```

### Configuration

The NSF Awards server runs in **HTTP mode** (not stdio mode) to enable inter-server communication with the Allocations server.

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "access-nsf-awards": {
      "command": "npx",
      "args": ["@access-mcp/nsf-awards"],
      "env": {
        "PORT": "3007"
      }
    }
  }
}
```

**Important:**
- The `PORT` environment variable is **required** to run the server in HTTP mode
- Port 3007 is the standard port for NSF Awards server
- This allows the Allocations server to make HTTP requests for NSF funding cross-referencing

### Enable NSF Integration in Allocations Server

To enable NSF award cross-referencing in the Allocations server, add this configuration:

```json
{
  "mcpServers": {
    "access-nsf-awards": {
      "command": "npx",
      "args": ["@access-mcp/nsf-awards"],
      "env": {
        "PORT": "3007"
      }
    },
    "access-allocations": {
      "command": "npx",
      "args": ["@access-mcp/allocations"],
      "env": {
        "ACCESS_MCP_SERVICES": "nsf-awards=http://localhost:3007"
      }
    }
  }
}
```

This enables features like:
- Institutional funding profiles (ACCESS + NSF)
- PI/Co-PI award history
- Funding vs. computational usage analysis

## Data Source

This server uses the official NSF Awards API:
- **API Base URL**: https://api.nsf.gov/services/v1/awards.json
- **Rate Limits**: Respects NSF API rate limits
- **Data Coverage**: Comprehensive NSF awards database

## Example Queries

1. **Get specific award details**:
   ```
   search_nsf_awards: {"award_number": "2138259"}
   ```

2. **Find awards by researcher**:
   ```
   search_nsf_awards: {"pi": "John Smith", "limit": 10}
   ```

3. **Search by institution**:
   ```
   search_nsf_awards: {"institution": "Stanford University", "limit": 20}
   ```

4. **Search by research area**:
   ```
   search_nsf_awards: {"keywords": "machine learning", "limit": 10}
   ```

5. **Find all projects involving a researcher (PI or Co-PI)**:
   ```
   search_nsf_awards: {"personnel": "Jane Doe", "limit": 15}
   ```

## Integration with Other Servers

This server is designed to work alongside:
- **xdmod-python**: Cross-reference NSF awards with computational usage data
- **xdmod-visualization**: Create visual reports combining funding and usage information

Use NSF award information to:
- Identify potential computational research projects
- Analyze funding vs. computational usage patterns  
- Track research impact and productivity
- Find collaboration opportunities

## Error Handling

The server includes robust error handling for:
- Invalid award numbers
- Network timeouts
- API rate limiting
- Malformed responses

## Contributing

See the main ACCESS-MCP repository for contribution guidelines.

## License

MIT License - see LICENSE file for details.