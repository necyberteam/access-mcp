# MCP server for ACCESS-CI Allocations and Research Projects API

MCP server for ACCESS-CI Allocations and Research Projects API

## Installation

### Download & Run

1. Download the [latest release](https://github.com/necyberteam/access-mcp/releases)
2. Extract and locate the `allocations/index.js` file
3. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "allocations": {
      "command": "/path/to/allocations/index.js"
    }
  }
}
```

### npm Package

```bash
npm install -g @access-mcp/allocations
```

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

## Usage Examples

<!-- TODO: Extract examples from server code -->

## Development

# Allocations MCP Server

MCP server providing access to ACCESS-CI allocations and research projects data with NSF Awards integration.

## Overview

This server provides comprehensive access to active research projects and allocations across the ACCESS-CI ecosystem, enabling project discovery, collaboration opportunities, and resource allocation analysis. Enhanced with NSF Awards data for complete research funding context.

## Tools

### search_projects

Search ACCESS-CI research projects by keyword, PI name, or institution.

**Parameters:**

- `query` (string): Search query for project titles, abstracts, PI names, or institutions
- `field_of_science` (string, optional): Filter by field of science
- `allocation_type` (string, optional): Filter by allocation type
- `limit` (number, optional): Maximum number of results to return (default: 20)

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

Find projects with similar research focus or abstracts.

**Parameters:**

- `project_id` (number, optional): Reference project ID to find similar projects
- `keywords` (string, optional): Keywords to find similar projects
- `limit` (number, optional): Maximum number of similar projects to return (default: 10)

### get_nsf_award

Get NSF award details for a specific award number.

**Parameters:**

- `award_number` (string): NSF award number (e.g., '2138259')

### enrich_project_with_nsf

Enrich an ACCESS project with NSF award data by searching for matching PI and institution.

**Parameters:**

- `project_id` (number): ACCESS project ID to enrich with NSF data

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

## Resources

- `accessci://allocations`: ACCESS-CI Research Projects and Allocations data

## Installation

```bash
npm install -g @access-mcp/allocations
```

## Configuration

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

## Usage Examples

### 🔬 **Discover Research Projects**

- "Find projects in computational biology"
- "What research is being done on climate modeling?"
- "Show me projects using machine learning"

### 👥 **Find Collaborations**

- "Who is working on quantum computing research?"
- "Find projects at MIT using GPU resources"
- "Show me similar projects to TG-BIO210042"

### 💰 **Analyze Allocations**

- "What's the total allocation for genomics research?"
- "Show allocation statistics across different fields"
- "Which resources are most used for AI research?"

### 🏛️ **NSF Award Integration**

- "Find NSF award details for project 2138259"
- "Show me all NSF awards for Stephen Deems"
- "Enrich this ACCESS project with NSF funding data"

## Detailed Usage Examples

### Searching Research Projects

**Natural Language**: "Find active projects in machine learning"

**Tool Call**:

```typescript
const projects = await search_projects({
  query: "machine learning",
  limit: 10,
});
```

**Returns**: List of projects with:

- Project titles and abstracts
- Principal Investigator information
- Institution details
- Resource allocations (in ACCESS Credits or compute hours)
- Grant numbers

### Getting Project Details

**Natural Language**: "Tell me about project TG-BIO210042"

**Tool Call**:

```typescript
const details = await get_project_details({
  project_id: "TG-BIO210042",
});
```

**Returns**: Comprehensive project information:

- Full abstract and research goals
- PI and Co-PI details
- Allocated resources and usage
- Start/end dates
- Publications and outcomes

### Finding Similar Research

**Natural Language**: "Find projects similar to this genomics project"

**Tool Call**:

```typescript
const similar = await find_similar_projects({
  project_id: "TG-BIO210042",
  limit: 5,
});
```

**Returns**: Related projects based on:

- Research domain overlap
- Methodology similarities
- Resource usage patterns
- Institutional connections

### Analyzing Resource Allocations

**Natural Language**: "Show me allocation statistics for computational chemistry"

**Tool Call**:

```typescript
const stats = await get_allocation_statistics({
  pages_to_analyze: 10,
});
```

**Returns**: Statistical analysis including:

- Total ACCESS Credits allocated
- Distribution by field of science
- Top institutions and PIs
- Resource utilization trends
- Average allocation sizes

### NSF Award Lookup

**Natural Language**: "Get details for NSF award 2138259"

**Tool Call**:

```typescript
const award = await get_nsf_award({
  award_number: "2138259",
});
```

**Returns**: NSF award information:

- Award title and abstract
- Principal Investigator
- Award amount
- Start and end dates
- Program officer
- Funded institution

### Finding NSF Awards by PI

**Natural Language**: "Show me NSF awards for Shelley Knuth"

**Tool Call**:

```typescript
const awards = await find_nsf_awards_by_pi({
  pi_name: "Shelley Knuth",
  limit: 10,
});
```

**Returns**: List of NSF awards including:

- Award numbers and titles
- Funding amounts
- Award dates
- Institutions
- Co-PIs (when available)

## API Endpoints

This server connects to:

- ACCESS-CI Allocations portal at `https://allocations.access-ci.org`
- NSF Awards Search at `https://www.nsf.gov/awardsearch/`

**Important Note:** ACCESS Credits are computational resource credits, NOT monetary currency.

## License

MIT

---

**Package:** `@access-mcp/allocations`  
**Version:** v0.3.0  
**Main:** `dist/index.js`
