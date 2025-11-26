# Allocations Filter Discovery: Implementation Guide

This document shows how to implement dynamic filter discovery for the Allocations server following best practices.

## Current State Analysis

The Allocations `search_projects` tool has these filter parameters:
- `field_of_science`: String (no guidance on valid values)
- `resource_name`: String (no guidance on valid values)
- `allocation_type`: String (no guidance on valid values)
- `date_range`: Object with start/end dates

**Problem**: LLMs don't know what valid values are, leading to:
- Failed queries with invalid field names
- Guessing resource names
- Not knowing what allocation types exist

## Solution: Dynamic Filter Discovery

### Implementation Pattern 1: Derive from Search Results

Since we don't have a dedicated `/filters` endpoint, we derive available values from actual project data.

```typescript
// Add to AllocationsServer class

async getAvailableFilters() {
  try {
    // Query a large sample of projects to discover filter values
    const response = await this.client.get('/projects', {
      params: {
        limit: 1000,  // Large sample to capture variety
        include: 'all_fields'
      }
    });

    const projects = response.data.results || [];

    // Extract unique values dynamically
    const filters = {
      fields_of_science: [...new Set(
        projects
          .map(p => p.field_of_science)
          .filter(f => f)  // Remove nulls
      )].sort(),

      resources: [...new Set(
        projects
          .flatMap(p => p.resources || [])
          .filter(r => r)
      )].sort(),

      allocation_types: [...new Set(
        projects
          .map(p => p.allocation_type)
          .filter(a => a)
      )].sort(),

      institutions: [...new Set(
        projects
          .map(p => p.institution)
          .filter(i => i)
      )].sort(),

      // Metadata about the discovery
      _metadata: {
        generated_at: new Date().toISOString(),
        sample_size: projects.length,
        source: 'live_api_sample',
        cache_ttl: 300  // 5 minutes
      }
    };

    return filters;
  } catch (error) {
    throw new Error(`Failed to discover filters: ${error.message}`);
  }
}
```

### Add as New Tool

```typescript
protected getTools() {
  return [
    {
      name: "search_projects",
      // ... existing tool
    },
    {
      name: "get_project_filters",
      description: "Discover available filter values for project search. Use this BEFORE search_projects to find valid field_of_science, resource_name, and allocation_type values. Returns current values from live project data.",
      inputSchema: {
        type: "object",
        properties: {
          filter_type: {
            type: "string",
            enum: ["all", "fields_of_science", "resources", "allocation_types", "institutions"],
            description: "Which filter values to return. Use 'all' to get everything, or specify specific filter type.",
            default: "all"
          },
          include_counts: {
            type: "boolean",
            description: "Include project counts for each filter value (e.g., 'Physics (150 projects)')",
            default: false
          }
        }
      }
    }
  ];
}
```

### Enhanced Version with Counts

```typescript
async getAvailableFilters(options: { includeCounts?: boolean } = {}) {
  const response = await this.client.get('/projects', {
    params: { limit: 1000 }
  });

  const projects = response.data.results || [];

  // Helper to count occurrences
  const countValues = (items: string[]) => {
    const counts = new Map<string, number>();
    items.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });
    return counts;
  };

  const fieldCounts = countValues(projects.map(p => p.field_of_science).filter(f => f));
  const resourceCounts = countValues(projects.flatMap(p => p.resources || []).filter(r => r));
  const typeCounts = countValues(projects.map(p => p.allocation_type).filter(a => a));

  if (options.includeCounts) {
    return {
      fields_of_science: Array.from(fieldCounts.entries())
        .sort((a, b) => b[1] - a[1])  // Sort by count descending
        .map(([name, count]) => ({ name, project_count: count })),

      resources: Array.from(resourceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, project_count: count })),

      allocation_types: Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, project_count: count })),

      _metadata: {
        generated_at: new Date().toISOString(),
        sample_size: projects.length,
        note: "Counts are from sampled projects and may not reflect all active projects"
      }
    };
  } else {
    // Simple list version
    return {
      fields_of_science: Array.from(fieldCounts.keys()).sort(),
      resources: Array.from(resourceCounts.keys()).sort(),
      allocation_types: Array.from(typeCounts.keys()).sort()
    };
  }
}
```

### Tool Handler

```typescript
async handle_get_project_filters(args: { filter_type?: string; include_counts?: boolean }) {
  const filters = await this.getAvailableFilters({
    includeCounts: args.include_counts
  });

  const filterType = args.filter_type || "all";

  if (filterType === "all") {
    return {
      content: [{
        type: "text",
        text: this.formatFiltersResponse(filters)
      }]
    };
  } else {
    // Return specific filter type
    return {
      content: [{
        type: "text",
        text: this.formatSpecificFilter(filterType, filters[filterType])
      }]
    };
  }
}

private formatFiltersResponse(filters: any): string {
  let response = "🔍 **Available Project Filters** (from live data)\n\n";

  response += `**Fields of Science** (${filters.fields_of_science.length}):\n`;
  filters.fields_of_science.slice(0, 10).forEach((field: any) => {
    const count = typeof field === 'object' ? ` (${field.project_count} projects)` : '';
    const name = typeof field === 'object' ? field.name : field;
    response += `• ${name}${count}\n`;
  });
  if (filters.fields_of_science.length > 10) {
    response += `• ... and ${filters.fields_of_science.length - 10} more\n`;
  }
  response += "\n";

  response += `**Resources** (${filters.resources.length}):\n`;
  filters.resources.slice(0, 10).forEach((resource: any) => {
    const count = typeof resource === 'object' ? ` (${resource.project_count} projects)` : '';
    const name = typeof resource === 'object' ? resource.name : resource;
    response += `• ${name}${count}\n`;
  });
  if (filters.resources.length > 10) {
    response += `• ... and ${filters.resources.length - 10} more\n`;
  }
  response += "\n";

  response += `**Allocation Types** (${filters.allocation_types.length}):\n`;
  filters.allocation_types.forEach((type: any) => {
    const count = typeof type === 'object' ? ` (${type.project_count} projects)` : '';
    const name = typeof type === 'object' ? type.name : type;
    response += `• ${name}${count}\n`;
  });
  response += "\n";

  response += `**💡 Usage:**\n`;
  response += `• Use these exact values in search_projects filters\n`;
  response += `• Values are from current active projects\n`;
  response += `• Refreshed each time this tool is called\n`;
  response += `\n**Example:**\n`;
  response += `search_projects({\n`;
  response += `  field_of_science: "${filters.fields_of_science[0] || 'Computer Science'}",\n`;
  response += `  resource_name: "${filters.resources[0] || 'NCSA Delta GPU'}"\n`;
  response += `})\n`;

  response += `\n_Generated from ${filters._metadata.sample_size} projects at ${filters._metadata.generated_at}_`;

  return response;
}
```

## Implementation Pattern 2: Cross-Reference Compute Resources

For the `resource_name` filter, we can cross-reference the Compute Resources server:

```typescript
// In search_projects error handling
if (invalidResourceName) {
  return addNextSteps(
    createLLMError(
      `Resource '${resourceName}' not found`,
      "validation",
      {
        suggestions: [
          "Resource names must match exactly (case-sensitive)",
          "Use get_project_filters to see available resources",
          "Or use compute-resources:search_resources to find the correct resource name"
        ],
        nextSteps: [
          {
            action: "discover_resources",
            description: "Get list of available resources from projects",
            tool: "get_project_filters",
            parameters: { filter_type: "resources", include_counts: true }
          },
          {
            action: "search_compute_resources",
            description: "Search compute resources database for similar names",
            tool: "search_resources",  // From compute-resources server
            server: "compute-resources",
            parameters: { query: extractSearchTerm(resourceName) }
          }
        ]
      }
    ),
    []
  );
}
```

## Caching Strategy

Since filter discovery queries the API, add short-term caching:

```typescript
class FilterCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private TTL = 5 * 60 * 1000; // 5 minutes

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

// In AllocationsServer
private filterCache = new FilterCache();

async getAvailableFilters(options = {}) {
  const cacheKey = JSON.stringify(options);
  const cached = this.filterCache.get(cacheKey);
  if (cached) return cached;

  const filters = await this.fetchFiltersFromAPI();
  this.filterCache.set(cacheKey, filters);
  return filters;
}
```

## Enhanced search_projects with Auto-Discovery

```typescript
// Update search_projects description
{
  name: "search_projects",
  description: "Search ACCESS-CI research projects. WORKFLOW: If unsure about filter values, call get_project_filters first to discover available options. Supports boolean search, similarity matching, and multi-field filtering.",
  inputSchema: {
    properties: {
      field_of_science: {
        type: "string",
        description: "Filter by field of science. Use get_project_filters to see available values. Examples: 'Computer Science', 'Physics', 'Chemistry'"
      },
      resource_name: {
        type: "string",
        description: "Filter by computational resource. Use get_project_filters to see available resources. Examples: 'NCSA Delta GPU', 'Purdue Anvil'"
      },
      // ... other parameters
    }
  }
}
```

## Testing the Implementation

```typescript
describe('Filter Discovery', () => {
  it('returns current filter values', async () => {
    const filters = await server.getAvailableFilters();

    expect(filters.fields_of_science).toBeInstanceOf(Array);
    expect(filters.resources).toBeInstanceOf(Array);
    expect(filters.allocation_types).toBeInstanceOf(Array);
    expect(filters._metadata.sample_size).toBeGreaterThan(0);
  });

  it('filter values are usable in search', async () => {
    const filters = await server.getAvailableFilters();
    const firstField = filters.fields_of_science[0];

    // This search should succeed
    const results = await server.searchProjects({ field_of_science: firstField });
    expect(results.length).toBeGreaterThan(0);
  });

  it('caches filter results', async () => {
    const start = Date.now();
    await server.getAvailableFilters();
    const firstCallTime = Date.now() - start;

    const start2 = Date.now();
    await server.getAvailableFilters();
    const secondCallTime = Date.now() - start2;

    // Second call should be much faster (cached)
    expect(secondCallTime).toBeLessThan(firstCallTime / 2);
  });
});
```

## Documentation Updates

Update the Allocations README:

```markdown
## Tools

### get_project_filters

Discover available filter values for project searches. Returns current values from live project data - no hardcoded lists, always up-to-date.

**Parameters:**
- `filter_type`: Which filters to return ('all', 'fields_of_science', 'resources', 'allocation_types')
- `include_counts`: Include project counts for each value (default: false)

**When to use:** Before calling `search_projects` when you don't know valid filter values.

**Workflow:** `get_project_filters()` → `search_projects()` with discovered values

**Example:**
```
"What fields of science can I filter by?"
"Show me available resources with project counts"
"List all allocation types"
```

### search_projects

Search and filter ACCESS-CI research projects. Use `get_project_filters` first if you need to discover valid filter values.
```

## Summary

This implementation:
- ✅ Queries live data, not hardcoded lists
- ✅ Includes metadata about freshness
- ✅ Provides counts for better UX
- ✅ Uses caching to avoid API overload
- ✅ Guides LLMs through workflow
- ✅ Cross-references related services
- ✅ Self-documenting responses

**Zero ongoing maintenance** - filter values automatically stay current as projects change.
