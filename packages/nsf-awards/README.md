# NSF Awards MCP Server

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

## Available Tools

### `find_nsf_awards_by_pi`
Search for NSF awards where a specific person is the Principal Investigator.

**Parameters:**
- `pi_name` (string): Principal investigator name to search for
- `limit` (number, optional): Maximum number of awards to return (default: 10)

### `find_nsf_awards_by_personnel`
Search for NSF awards where a person is listed as PI or Co-PI.

**Parameters:**
- `person_name` (string): Person name to search for in award personnel
- `limit` (number, optional): Maximum number of awards to return (default: 10)

### `get_nsf_award`
Get detailed information about a specific NSF award by award number.

**Parameters:**
- `award_number` (string): NSF award number (e.g., '2138259')

### `find_nsf_awards_by_institution`
Search for NSF awards by institution name.

**Parameters:**
- `institution_name` (string): Institution name to search for
- `limit` (number, optional): Maximum number of awards to return (default: 10)

### `search_nsf_awards_by_keywords`
Search NSF awards by keywords in titles and abstracts.

**Parameters:**
- `keywords` (string): Keywords to search for in award titles and abstracts
- `limit` (number, optional): Maximum number of awards to return (default: 10)

## Installation

```bash
cd packages/nsf-awards
npm install
npm run build
```

## Usage

### Direct execution:
```bash
npm start
```

### As MCP Server:
Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "nsf-awards": {
      "command": "access-mcp-nsf-awards"
    }
  }
}
```

## Data Source

This server uses the official NSF Awards API:
- **API Base URL**: https://api.nsf.gov/services/v1/awards.json
- **Rate Limits**: Respects NSF API rate limits
- **Data Coverage**: Comprehensive NSF awards database

## Example Queries

1. **Find awards by researcher**:
   ```
   find_nsf_awards_by_pi: {"pi_name": "John Smith"}
   ```

2. **Get specific award details**:
   ```
   get_nsf_award: {"award_number": "2138259"}
   ```

3. **Search by institution**:
   ```
   find_nsf_awards_by_institution: {"institution_name": "Stanford University"}
   ```

4. **Search by research area**:
   ```
   search_nsf_awards_by_keywords: {"keywords": "machine learning"}
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