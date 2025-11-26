# LLM-Friendly MCP Tool Design Patterns

This document provides guidelines for making ACCESS MCP tools easy for LLMs to use correctly.

## Core Principles

1. **Guide, don't assume** - LLMs need explicit guidance on multi-step workflows
2. **Validate early** - Return helpful errors before execution when possible
3. **Suggest next steps** - Always provide concrete next actions
4. **Use enums liberally** - LLMs are excellent at following constrained choices
5. **Fuzzy match gracefully** - Help LLMs when they're close but not exact

## Standard Response Patterns

### Pattern 1: Next Steps in Responses

**Always** include `next_steps` in responses to guide LLMs through workflows:

```typescript
import { addNextSteps, CommonNextSteps } from "@access-mcp/shared";

// Good: Guides LLM to next action
return addNextSteps(results, [
  {
    action: "get_details",
    description: "Get detailed information for a specific resource",
    tool: "search_resources",
    parameters: { resource_id: "expanse.sdsc.xsede.org" }
  },
  CommonNextSteps.narrowResults(results.length, ["has_gpu", "resource_type"])
]);

// Bad: LLM doesn't know what to do next
return results;
```

### Pattern 2: Empty Results with Discovery

When returning no results, guide LLMs to discovery tools:

```typescript
import { addDiscoverySuggestions } from "@access-mcp/shared";

if (results.length === 0) {
  return addDiscoverySuggestions(results, [
    {
      action: "list_all",
      description: "Remove filters to see all available items",
      tool: "search_resources",
      parameters: {}
    },
    {
      action: "discover_filters",
      description: "Find available filter values",
      tool: "get_smart_filters",
      parameters: { dimension: "resource" }
    }
  ]);
}
```

### Pattern 3: Validation Errors with Suggestions

Provide actionable suggestions in error responses:

```typescript
import { createLLMError } from "@access-mcp/shared";

if (!validResourceId) {
  return createLLMError(
    `Invalid resource ID: ${resourceId}`,
    "validation",
    {
      suggestions: [
        "Resource IDs should be in format: system.provider.access-ci.org",
        "Use search_resources() to find valid resource IDs"
      ],
      didYouMean: fuzzyMatch(resourceId, validResourceIds).slice(0, 3),
      nextSteps: [{
        action: "search_resources",
        description: "Search for resources by name",
        tool: "search_resources",
        parameters: { query: extractSystemName(resourceId) }
      }]
    }
  );
}
```

### Pattern 4: Enum Constraints

Use enums to constrain LLM choices:

```typescript
// Good: LLM can only pick from valid options
{
  name: "search_resources",
  parameters: {
    resource_type: {
      type: "string",
      enum: ["compute", "storage", "cloud", "gpu", "cpu"],
      description: "Filter by resource type"
    }
  }
}

// Bad: LLM might guess invalid values
{
  name: "search_resources",
  parameters: {
    resource_type: {
      type: "string",
      description: "Filter by resource type (compute, storage, cloud, etc.)"
    }
  }
}
```

### Pattern 5: Workflow Indicators in Descriptions

Make multi-step workflows explicit in tool descriptions:

```typescript
// Good: Clear workflow indication
{
  name: "get_raw_data",
  description: "Extract XDMoD metrics data. WORKFLOW: First call get_smart_filters() to discover valid filter values, then use those values here in the filters parameter."
}

// Bad: Workflow not clear
{
  name: "get_raw_data",
  description: "Extract XDMoD metrics data with filtering support"
}
```

## Server-Specific Patterns

### Compute Resources

```typescript
// When returning resource list
return {
  data: resources,
  count: resources.length,
  next_steps: [
    {
      action: "get_hardware_details",
      description: "Get detailed hardware specs for a specific resource",
      tool: "get_resource_hardware",
      parameters: { resource_id: resources[0]?.info_resourceid }
    },
    {
      action: "filter_by_capability",
      description: "Find GPU resources",
      tool: "search_resources",
      parameters: { has_gpu: true }
    }
  ]
};
```

### Software Discovery

```typescript
// When software not found
if (results.length === 0) {
  return createLLMError(
    `No software found matching "${query}"`,
    "not_found",
    {
      suggestions: [
        "Try a broader search term",
        "Search for software category instead of specific package",
        "Use discover_filters=true to see available software"
      ],
      relatedQueries: [
        "Python packages",
        "Machine learning software",
        "Compilers available"
      ]
    }
  );
}
```

### NSF Awards

```typescript
// When award not found
return createLLMError(
  `Award ${awardNumber} not found`,
  "not_found",
  {
    didYouMean: fuzzyMatchAwards(awardNumber),
    nextSteps: [
      {
        action: "search_by_pi",
        description: "Search awards by Principal Investigator name",
        tool: "search_nsf_awards",
        parameters: { pi: "researcher name" }
      },
      {
        action: "search_by_institution",
        description: "Find all awards for an institution",
        tool: "search_nsf_awards",
        parameters: { institution: "university name" }
      }
    ]
  }
);
```

### Allocations

```typescript
// When returning search results
return {
  data: projects,
  count: projects.length,
  next_steps: [
    {
      action: "find_similar",
      description: "Find projects similar to this research area",
      tool: "search_projects",
      parameters: { similar_to: projects[0]?.id }
    },
    {
      action: "filter_by_resource",
      description: `See only projects using specific resources`,
      tool: "search_projects",
      parameters: { resource_name: "NCSA Delta GPU" }
    }
  ],
  context: {
    available_filters: ["field_of_science", "resource_name", "allocation_type"],
    total_in_system: 15000
  }
};
```

### Affinity Groups

```typescript
// When returning groups without details
return {
  data: groups,
  count: groups.length,
  next_steps: [
    {
      action: "get_group_events",
      description: "Get events for a specific group",
      tool: "search_affinity_groups",
      parameters: { group_id: groups[0]?.id, include: "events" }
    },
    {
      action: "get_complete_info",
      description: "Get all information (events + knowledge base) for a group",
      tool: "search_affinity_groups",
      parameters: { group_id: groups[0]?.id, include: "all" }
    }
  ]
};
```

### XDMoD Data

```typescript
// When user tries to use invalid filter
if (invalidFilters.length > 0) {
  return createLLMError(
    `Invalid filter values: ${invalidFilters.join(", ")}`,
    "validation",
    {
      suggestions: [
        `Call get_smart_filters(dimension='${filterDimension}') first to discover valid values`
      ],
      nextSteps: [{
        action: "discover_filters",
        description: "Get list of valid filter values",
        tool: "get_smart_filters",
        parameters: {
          realm: args.realm,
          dimension: filterDimension,
          category: guessCategory(invalidFilters[0])
        }
      }],
      didYouMean: fuzzyMatchFilters(invalidFilters[0], validFilters)
    }
  );
}
```

## Implementation Checklist

For each tool, ensure:

- [ ] Tool description explains WHEN to use it
- [ ] Tool description includes workflow indicators for multi-step processes
- [ ] Parameters use enums where possible (< 20 values)
- [ ] Success responses include `next_steps` when multiple actions possible
- [ ] Empty results include discovery suggestions
- [ ] Validation errors include `did_you_mean` suggestions
- [ ] Validation errors include `next_steps` for alternative approaches
- [ ] Related tools are cross-referenced in responses
- [ ] Common patterns use shared utilities from `@access-mcp/shared`

## Testing LLM-Friendliness

Test scenarios to validate:

1. **Zero-shot usage**: Can LLM use tool correctly without examples?
2. **Error recovery**: Does error response guide LLM to fix the issue?
3. **Workflow discovery**: Can LLM discover multi-step workflows from responses?
4. **Fuzzy matching**: Does tool help when LLM is "close enough"?
5. **Dead ends**: Are there any responses that leave LLM stuck?

## Examples of Good vs Bad

### ❌ Bad: No guidance
```json
{
  "results": [],
  "message": "No results found"
}
```

### ✅ Good: Actionable next steps
```json
{
  "data": [],
  "count": 0,
  "suggestions": [
    "No software found matching 'tensorflo'. Did you mean 'tensorflow'?"
  ],
  "next_steps": [
    {
      "action": "search_correct_name",
      "description": "Search for TensorFlow",
      "tool": "search_software",
      "parameters": { "query": "tensorflow" }
    },
    {
      "action": "browse_category",
      "description": "Browse machine learning software",
      "tool": "search_software",
      "parameters": { "filter_tags": ["machine-learning"] }
    }
  ]
}
```

### ❌ Bad: Ambiguous error
```json
{
  "error": "Invalid parameter"
}
```

### ✅ Good: Specific error with fix
```json
{
  "error": "Invalid resource_id format",
  "error_type": "validation",
  "suggestions": [
    "Resource IDs must be in format: system.provider.access-ci.org",
    "Example: delta.ncsa.access-ci.org"
  ],
  "did_you_mean": [
    "delta.ncsa.access-ci.org",
    "expanse.sdsc.access-ci.org"
  ],
  "next_steps": [{
    "action": "search_by_name",
    "description": "Find resource by name instead",
    "tool": "search_resources",
    "parameters": { "query": "delta" }
  }]
}
```

## Shared Utilities

All utilities are available in `@access-mcp/shared`:

```typescript
import {
  addNextSteps,
  addDiscoverySuggestions,
  createLLMError,
  CommonNextSteps,
  type NextStep,
  type LLMResponse,
  type LLMError
} from "@access-mcp/shared";
```

## Migration Guide

To add LLM-friendly patterns to existing tools:

1. Import shared utilities
2. Identify multi-step workflows
3. Add `next_steps` to success responses
4. Add discovery suggestions to empty results
5. Enhance error messages with `createLLMError`
6. Add fuzzy matching for common mistakes
7. Update tool descriptions with workflow indicators
8. Test with real LLM queries

---

**Last Updated**: 2025-01-14
**Status**: ✅ Shared utilities implemented, ready for server migration
