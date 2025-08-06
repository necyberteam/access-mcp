# ACCESS-CI Allocations MCP Server

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

## Usage

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

## API Endpoints

This server connects to:
- ACCESS-CI Allocations portal at `https://allocations.access-ci.org`
- NSF Awards Search at `https://www.nsf.gov/awardsearch/`

**Important Note:** ACCESS Credits are computational resource credits, NOT monetary currency.

## License

MIT