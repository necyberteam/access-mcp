# Allocations MCP Server

Advanced research project discovery with NSF funding integration and enterprise-grade search capabilities. Provides comprehensive access to active research projects and allocations across the ACCESS-CI ecosystem with boolean search operators, smart similarity matching, cross-platform funding analysis, and institutional research profiling.

## Usage Examples

### **Search & Discovery**

```
"Machine learning projects on ACCESS"
"GPU computing allocations from 2024"
"Projects using 'deep learning' NOT 'computer vision'"
"Quantum computing projects with >100K SUs"
"All projects at Stanford"
```

### **Similarity & Analysis**

```
"Projects similar to climate modeling research"
"Similar projects to NSF award #2138259"
"Bioinformatics allocations over 500K SUs"
"Projects by PI Dr. Smith sorted by allocation size"
```

## Tools

### search_projects

Comprehensive ACCESS-CI research project search and discovery. Supports free-text search, field/resource filtering, similarity matching, and detailed project information retrieval.

**Parameters:**

- `query` (string, optional): Search query supporting operators: `"term1 AND term2"`, `"term1 OR term2"`, `"term1 NOT term2"`, exact phrases with quotes. Omit when using `project_id` or `similar_to`
- `project_id` (number, optional): Get detailed information for a specific project ID. Returns full project details including complete abstract
- `field_of_science` (string, optional): Filter by field of science (e.g., 'Computer Science', 'Physics')
- `resource_name` (string, optional): Filter projects using specific computational resources (e.g., 'NCSA Delta GPU', 'Purdue Anvil')
- `allocation_type` (string, optional): Filter by allocation type (e.g., 'Discover', 'Explore', 'Accelerate')
- `date_range` (object, optional): Filter by project date range with `start_date` and `end_date` in YYYY-MM-DD format
- `min_allocation` (number, optional): Minimum allocation amount filter
- `similar_to` (number, optional): Find projects similar to this project ID using semantic matching
- `similarity_keywords` (string, optional): Find projects similar to these keywords/research terms
- `similarity_threshold` (number, optional): Minimum similarity score (0.0-1.0, default: 0.3)
- `include_same_field` (boolean, optional): Prioritize projects in same field for similarity search (default: true)
- `show_similarity_scores` (boolean, optional): Display similarity scores in results (default: true)
- `sort_by` (string, optional): Sort by 'relevance', 'date_desc', 'date_asc', 'allocation_desc', 'allocation_asc', 'pi_name' (default: relevance)
- `limit` (number, optional): Maximum results (default: 20, max: 100)

**Examples:**
```typescript
// Search for projects
search_projects({ query: '"machine learning" AND gpu', limit: 10 })

// Get specific project details
search_projects({ project_id: 12345 })

// List by field of science
search_projects({ field_of_science: "Computer Science", limit: 20 })

// Find projects using specific resource
search_projects({ resource_name: "NCSA Delta GPU", limit: 15 })

// Find similar projects
search_projects({ similar_to: 12345, similarity_threshold: 0.7, limit: 10 })
```

**Returns**: JSON format `{total: number, items: Project[]}` where each Project contains:
- `projectId`, `requestNumber`, `requestTitle`
- `pi`, `piInstitution`
- `fos` (field of science)
- `abstract`
- `allocationType`, `beginDate`, `endDate`
- `resources[]` (array of allocation resources with names, units, and amounts)
- `relevance_score` (when searching with query)
- `similarity_score` (when searching with similarity)

### analyze_funding

Comprehensive NSF funding analysis for ACCESS projects and institutions. Cross-references ACCESS allocations with NSF awards to show funding connections, institutional research profiles, and funded project discovery.

**Parameters:**

- `project_id` (number, optional): Analyze funding for specific ACCESS project. Returns NSF awards connected to PI and institution
- `institution` (string, optional): Generate comprehensive funding profile for institution. Shows ACCESS allocations, NSF awards, top researchers, and trends
- `pi_name` (string, optional): Find funded projects by principal investigator name. Cross-references ACCESS and NSF data
- `has_nsf_funding` (boolean, optional): Filter to only ACCESS projects with corresponding NSF funding
- `field_of_science` (string, optional): Filter funded projects by field of science
- `limit` (number, optional): Maximum projects/awards to return (default: 20 for institution, 10 for others)

**Examples:**
```typescript
// Analyze specific project funding
analyze_funding({ project_id: 12345 })

// Generate institutional funding profile
analyze_funding({ institution: "University of Illinois", limit: 20 })

// Find funded projects by PI
analyze_funding({ pi_name: "John Smith", has_nsf_funding: true })

// Find NSF-funded projects in field
analyze_funding({ field_of_science: "Computer Science", has_nsf_funding: true })
```

**Returns**: Funding connections, institutional profiles, or funded project lists with ACCESS and NSF data.

### get_allocation_statistics

Get aggregate statistics across ACCESS allocations including top 10 fields of science, top 10 most-requested resources, top 10 institutions, and allocation type breakdown. Use for overview/trend questions like 'What are the most popular research areas?' NOT for finding specific projects (use `search_projects` instead).

**Parameters:**

- `pages_to_analyze` (number, optional): Number of pages to analyze for statistics (default: 5, max: 20)

**Examples:**
```typescript
// Get allocation statistics
get_allocation_statistics({ pages_to_analyze: 5 })

// Get comprehensive statistics
get_allocation_statistics({ pages_to_analyze: 10 })
```

**Returns**: Aggregate statistics including top fields, resources, institutions, and allocation types.

## Resources

- `accessci://allocations`: ACCESS-CI Research Projects and Allocations data

## Advanced Search Syntax

### Boolean Operators
- **AND**: `"machine learning AND gpu"` - Both terms must be present
- **OR**: `"climate OR weather"` - Either term can be present  
- **NOT**: `"modeling NOT simulation"` - First term present, second absent

### Exact Phrases
- **Quoted strings**: `"deep learning"` - Exact phrase match
- **Complex queries**: `"neural networks" AND gpu NOT tensorflow`

### Filters & Sorting
- **Date ranges**: `date_range: {start_date: "2024-01-01", end_date: "2024-12-31"}`
- **Allocation threshold**: `min_allocation: 50000`
- **Sort options**: `sort_by: "allocation_desc"` for largest allocations first

## API Integration

This server connects to:
- **ACCESS-CI Allocations portal**: `https://allocations.access-ci.org`
- **NSF Awards MCP server**: HTTP communication for enriched funding data
- **Inter-server architecture**: Enables complex cross-platform analysis

**Important Note:** ACCESS Credits are computational resource credits, NOT monetary currency.

## License

MIT

## Installation

```bash
npm install -g @access-mcp/allocations
```

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "access-allocations": {
      "command": "npx",
      "args": ["@access-mcp/allocations"]
    }
  }
}
```

## NSF Integration

The allocations server integrates with the NSF awards server to provide comprehensive funding analysis by cross-referencing ACCESS projects with NSF awards data.

### How It Works

The allocations server uses **cross-server communication** to fetch NSF awards:

1. **Allocations Server** queries ACCESS projects from `allocations.access-ci.org`
2. **Allocations Server** calls **NSF Awards Server** via HTTP to cross-reference
3. **NSF Awards Server** queries the official NSF API at `api.nsf.gov`
4. Results are combined into institutional funding profiles

### Local Development Setup

To enable NSF awards cross-referencing in local development, configure both servers in Claude Desktop:

```json
{
  "mcpServers": {
    "nsf-awards": {
      "command": "npx",
      "args": ["-y", "@access-mcp/nsf-awards"],
      "env": {
        "PORT": "3007"
      }
    },
    "allocations": {
      "command": "npx",
      "args": ["-y", "@access-mcp/allocations"],
      "env": {
        "ACCESS_MCP_SERVICES": "nsf-awards=http://localhost:3007"
      }
    }
  }
}
```

**Note**: The allocations server works with or without NSF integration:
- **With NSF server**: Shows comprehensive funding profile (ACCESS + NSF)
- **Without NSF server**: Shows ACCESS projects only (gracefully degrades)

Production server configuration will be documented in a future update.