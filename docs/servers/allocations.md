# MCP server for ACCESS-CI Allocations and Research Projects API

Advanced research project discovery with NSF funding integration and enterprise-grade search capabilities. Provides comprehensive access to active research projects and allocations across the ACCESS-CI ecosystem with boolean search operators, smart similarity matching, cross-platform funding analysis, and institutional research profiling.

## Usage Examples

### **Advanced Project Search**

```
"Find machine learning projects on ACCESS"
"Search for GPU computing research projects"
"Show me quantum computing allocations from 2024"
"Find projects using 'deep learning' but not 'computer vision'"
```

### **Smart Discovery**

```
"Find projects similar to machine learning on GPU clusters"
"Show me research projects related to climate modeling"
"Discover bioinformatics projects with large allocations"
"What projects are similar to NSF award 2138259?"
```

### **Institution Analysis**

```
"Analyze NSF funding for ACCESS project 54321"
"Generate a funding profile for University of Illinois"
"Show me all projects from Stanford with their NSF awards"
"Compare computational resources with research funding"
```

### **Researcher Profiles**

```
"Find all projects by Dr. Smith with NSF funding context"
"Show me computational usage patterns for this research team"
"Analyze funding efficiency across different research groups"
"What NSF awards correlate with high ACCESS usage?"
```


## Installation

```bash
npm install -g @access-mcp/allocations
```

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "allocations": {
      "command": "npx",
      "args": ["@access-mcp/allocations"]
    }
  }
}
```

## Tools

### search_projects

Advanced search for ACCESS-CI research projects with operators, filters, and sorting.

**Parameters:**

- `query` (string, **REQUIRED**): Search query supporting operators: `"term1 AND term2"`, `"term1 OR term2"`, `"term1 NOT term2"`, exact phrases with quotes
- `field_of_science` (string, optional): Filter by field of science (e.g., 'Computer Science', 'Physics')
- `allocation_type` (string, optional): Filter by allocation type (e.g., 'Discover', 'Explore', 'Accelerate')
- `date_range` (object, optional): Filter by project date range with `start_date` and `end_date` in YYYY-MM-DD format
- `min_allocation` (number, optional): Minimum allocation amount filter
- `sort_by` (string, optional): Sort results by 'relevance', 'date_desc', 'date_asc', 'allocation_desc', 'allocation_asc', 'pi_name' (default: relevance)
- `limit` (number, optional): Maximum results (default: 20, max: 100)

**Example:**
```typescript
// User: "Find machine learning projects with GPU but not TensorFlow from 2024"
const projects = await search_projects({
  query: '"machine learning" AND gpu NOT tensorflow',
  field_of_science: "Computer Science",
  date_range: { start_date: "2024-01-01", end_date: "2024-12-31" },
  min_allocation: 10000,
  sort_by: "allocation_desc",
  limit: 10
});
```

**Returns**: List of projects with titles, abstracts, PI information, institution details, resource allocations (ACCESS Credits), and grant numbers.

### get_project_details

Get detailed information about a specific research project.

**Parameters:**

- `project_id` (number): The project ID number

### list_projects_by_field

List projects by field of science.

**Parameters:**

- `field_of_science` (string): Field of science to filter by
- `limit` (number, optional): Maximum number of results to return (default: 20)

### list_projects_by_resource

Find projects using specific computational resources.

**Parameters:**

- `resource_name` (string): Resource name to search for
- `limit` (number, optional): Maximum number of results to return (default: 20)

### get_allocation_statistics

Get statistics about resource allocations and research trends.

**Parameters:**

- `pages_to_analyze` (number, optional): Number of pages to analyze for statistics (default: 5, max: 20)

### find_similar_projects

Find projects with similar research focus using advanced semantic matching.

**Parameters:**

- `project_id` (number, optional): Reference project ID to find similar projects
- `keywords` (string, optional): Keywords or research terms to find similar projects (alternative to project_id)
- `similarity_threshold` (number, optional): Minimum similarity score (0.0-1.0, default: 0.3)
- `include_same_field` (boolean, optional): Whether to prioritize projects in the same field of science (default: true)
- `show_similarity_scores` (boolean, optional): Whether to display similarity scores in results (default: true)
- `limit` (number, optional): Maximum number of results (default: 10, max: 50)

**Example:**
```typescript
// User: "Find projects similar to project 12345 with 80% similarity"
const similar = await find_similar_projects({
  project_id: 12345,
  similarity_threshold: 0.8,
  show_similarity_scores: true,
  include_same_field: true,
  limit: 5
});
```

**Returns**: Related projects with similarity percentages, multi-tier groupings (High 70%+, Moderate 40-70%), research domain overlap analysis, and collaboration potential assessment.

### get_nsf_award

Get NSF award details for a specific award number.

**Parameters:**

- `award_number` (string): NSF award number (e.g., '2138259')

### analyze_project_funding

Comprehensive funding analysis with advanced PI name matching and institution validation.

**Parameters:**

- `project_id` (number, **REQUIRED**): ACCESS project ID to analyze for NSF funding connections

### find_nsf_awards_by_pi

Find NSF awards for a specific Principal Investigator.

**Parameters:**

- `pi_name` (string): Principal Investigator name to search for
- `limit` (number, optional): Maximum number of awards to return (default: 10)

### find_nsf_awards_by_personnel

Search NSF awards by Principal Investigator name. 

**Note:** Co-PI and Program Officer searches are not reliable in the NSF API and have been removed.

**Parameters:**

- `person_name` (string): Principal Investigator name to search for
- `limit` (number, optional): Maximum number of awards to return (default: 10)

### find_funded_projects

Find ACCESS projects that have corresponding NSF funding with real cross-referencing.

**Parameters:**

- `pi_name` (string, optional): Principal investigator name
- `institution_name` (string, optional): Institution name
- `field_of_science` (string, optional): Field of science filter
- `limit` (number, optional): Maximum number of results (default: 10)

### institutional_funding_profile

Generate comprehensive funding profile for an institution with advanced name matching.

**Parameters:**

- `institution_name` (string, **REQUIRED**): Institution name to analyze
- `limit` (number, optional): Maximum number of projects per source (default: 20)

**Example:**
```typescript
// User: "Generate a funding profile for University of Illinois"
const profile = await institutional_funding_profile({
  institution_name: "University of Illinois at Urbana-Champaign",
  limit: 20
});
```

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

---

**Package:** `@access-mcp/allocations`  
**Version:** v0.3.1  
**Main:** `dist/index.js`
