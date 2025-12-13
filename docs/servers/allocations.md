# Allocations MCP Server

MCP server for ACCESS-CI research projects and allocations with NSF funding integration, boolean search, and similarity matching.

## Usage Examples

### Search & Discovery
```
"Machine learning projects on ACCESS"
"GPU computing allocations from 2024"
"Projects using 'deep learning' NOT 'computer vision'"
"All projects at Stanford"
```

### Funding Analysis
```
"Analyze funding for project 12345"
"NSF-funded projects at University of Illinois"
"Institutional funding profile for MIT"
```

## Tools

### `search_projects`

Search ACCESS-CI research projects with boolean operators and similarity matching.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search with operators: `AND`, `OR`, `NOT`, exact phrases in quotes |
| `project_id` | number | Get specific project details |
| `field_of_science` | string | Filter by field (e.g., "Computer Science") |
| `resource_name` | string | Filter by resource (e.g., "NCSA Delta GPU") |
| `allocation_type` | string | Filter: `Discover`, `Explore`, `Accelerate` |
| `date_range` | object | `{start_date: "YYYY-MM-DD", end_date: "YYYY-MM-DD"}` |
| `min_allocation` | number | Minimum allocation amount |
| `similar_to` | number | Find projects similar to this project ID |
| `similarity_keywords` | string | Find projects similar to these terms |
| `similarity_threshold` | number | Min similarity score (0.0-1.0, default: 0.3) |
| `sort_by` | enum | `relevance`, `date_desc`, `date_asc`, `allocation_desc`, `allocation_asc`, `pi_name` |
| `limit` | number | Max results (default: 20, max: 100) |

**Examples:**
```javascript
// Boolean search
search_projects({ query: '"machine learning" AND gpu', limit: 10 })

// Get project details
search_projects({ project_id: 12345 })

// Find similar projects
search_projects({ similar_to: 12345, similarity_threshold: 0.7 })

// Filter by field and resource
search_projects({ field_of_science: "Computer Science", resource_name: "Delta" })
```

### `analyze_funding`

Cross-reference ACCESS allocations with NSF awards for funding analysis.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `project_id` | number | Analyze funding for specific project |
| `institution` | string | Generate institutional funding profile |
| `pi_name` | string | Find funded projects by PI name |
| `has_nsf_funding` | boolean | Filter to only NSF-funded projects |
| `field_of_science` | string | Filter by field |
| `limit` | number | Max results (default: 20) |

**Examples:**
```javascript
// Analyze project funding
analyze_funding({ project_id: 12345 })

// Institutional profile
analyze_funding({ institution: "University of Illinois" })

// Find PI's funded projects
analyze_funding({ pi_name: "John Smith", has_nsf_funding: true })
```

### `get_allocation_statistics`

Get aggregate statistics across ACCESS allocations (top fields, resources, institutions).

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `pages_to_analyze` | number | Pages to analyze (default: 5, max: 20) |

## Installation

```bash
npm install -g @access-mcp/allocations
```

## Configuration

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

### NSF Integration (Optional)

For NSF funding cross-referencing, run both servers:

```json
{
  "mcpServers": {
    "access-nsf-awards": {
      "command": "npx",
      "args": ["@access-mcp/nsf-awards"],
      "env": { "PORT": "3007" }
    },
    "access-allocations": {
      "command": "npx",
      "args": ["@access-mcp/allocations"],
      "env": { "ACCESS_MCP_SERVICES": "nsf-awards=http://localhost:3007" }
    }
  }
}
```

The allocations server works without NSF integration (gracefully degrades to ACCESS data only).

## Resources

- `accessci://allocations` - ACCESS-CI research projects and allocations

---

**Package:** `@access-mcp/allocations`
**Version:** v0.5.1
**Main:** `dist/index.js`
