# ACCESS-CI MCP Servers - Tool Standardization Recommendations

**Date**: 2025-11-25
**Status**: Proposal for Review

## Executive Summary

This document proposes standardization improvements for ACCESS-CI MCP server tools to make them more predictable and easier for LLMs to use effectively. The analysis covers 9 servers with 17 tools and identifies both strengths and opportunities for improvement.

## Current State Analysis

### ✅ **Strengths (Keep These)**

1. **Consistent Parameter Naming**:
   - `query` - Free-text search (used across 5+ servers)
   - `limit` - Maximum results (used across ALL servers)
   - `resource_id` - Resource filtering (standardized format)
   - `field_of_science` - Academic field filtering

2. **Well-Defined Enums**:
   - Date relatives: `"today"`, `"-1week"`, `"+1month"` etc.
   - Sort options: `"relevance"`, `"date_desc"`, `"date_asc"`
   - Severity levels: `"high"`, `"medium"`, `"low"`

3. **Enhanced Return Data**:
   - Servers add calculated fields (duration_hours, starts_in_hours)
   - Popular/top aggregations (popular_tags, top_resources)
   - Metadata about search/filters applied

---

## ⚠️ **Inconsistencies to Address**

### 1. Parameter Naming Variations

| Concept | Current Variations | Recommendation |
|---------|-------------------|----------------|
| **Date filtering** | `beginning_date`, `start_date`, `beginning_date_relative` | **Standardize**: `start_date`, `end_date`, `start_date_relative`, `end_date_relative` |
| **Resource filtering** | `resource`, `resource_id`, `resource_name`, `resource_ids` (array) | **Standardize**: `resource_id` (string), `resource_ids` (array) |
| **Institution filtering** | `institution`, `organization`, `affiliation`, `piInstitution` | **Standardize**: `institution` for filtering, `organization` for org entities only |
| **Full-text search** | `query`, `search_api_fulltext`, `keywords` | **Standardize**: `query` for free-text, `keywords` for tag/keyword filtering |
| **Pagination** | `limit` (universal), `offset` (rare), `pages_to_analyze` | **Standardize**: Always support `limit` and `offset` |

### 2. Return Value Structure Variations

**Problem**: Inconsistent top-level response structure

**Current Patterns**:
```typescript
// Pattern A: Direct data array (affinity-groups, events)
{
  total_events: number,
  events: Array<...>
}

// Pattern B: Wrapped in data field (xdmod)
{
  data: Array<...>
}

// Pattern C: Mixed structure (compute-resources)
{
  total: number,
  resources: Array<...>,
  documentation: {...}
}

// Pattern D: Content array (MCP native)
{
  content: [{
    type: "text" | "image",
    text: string,
    data?: string
  }]
}
```

**Recommendation**: Standardize on Pattern C with consistent naming:

```typescript
interface StandardToolResponse<T> {
  // Core data
  total: number;                    // Total items (before pagination)
  items: T[];                       // The actual results

  // Optional metadata
  metadata?: {
    filters_applied?: object;
    search_metadata?: object;
    aggregations?: object;          // popular_tags, top_*, etc.
  };

  // Optional documentation
  documentation?: {
    usage_notes?: string;
    next_steps?: string;
    api_info?: string;
  };
}
```

### 3. Metadata Field Inconsistencies

| Field Purpose | Current Variations | Recommendation |
|--------------|-------------------|----------------|
| **Applied filters** | `filters_applied`, `search_criteria`, `filters` | **Standardize**: `metadata.filters_applied` |
| **Search context** | `search_metadata`, `search_query`, `search_method` | **Standardize**: `metadata.search` |
| **Aggregations** | `popular_tags`, `top_resources`, `event_types` | **Standardize**: Group in `metadata.aggregations` |
| **Counts** | `total_*`, `filtered_*`, `*_count` | **Standardize**: Use `total` for main count, others in `metadata.counts` |

### 4. Date Handling Inconsistencies

**Problem**: Multiple date field naming patterns

**Current Patterns**:
- `beginning_date` vs `start_date`
- `end_date` vs `expDate` vs `date_1`
- `beginning_date_relative` vs `relative_start_date`

**Recommendation**:
```typescript
interface StandardDateParameters {
  // Absolute dates (ISO 8601: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
  start_date?: string;
  end_date?: string;

  // Relative dates
  start_date_relative?: "today" | "-1week" | "-1month" | "-1year" | "+1week" | "+1month" | "+1year";
  end_date_relative?: "now" | "today" | "-1week" | "+1week" | "+1month";

  // Timezone for relative date calculations
  timezone?: string;  // Default: "UTC"
}
```

---

## 📋 **Standardization Recommendations**

### Recommendation 1: Standard Response Envelope

**Implement a consistent response structure across ALL tools:**

```typescript
interface ToolResponse<T> {
  // REQUIRED: Core data
  total: number;                    // Total matching items
  items: T[];                       // Array of results (may be paginated)

  // OPTIONAL: Metadata
  metadata?: {
    // Search/filter context
    query?: string;
    filters_applied?: Record<string, any>;
    search_method?: string;

    // Aggregations and summaries
    aggregations?: {
      popular_tags?: string[];
      top_resources?: Array<{name: string, count: number}>;
      counts?: Record<string, number>;
    };

    // Pagination info
    pagination?: {
      limit: number;
      offset: number;
      has_more: boolean;
    };
  };

  // OPTIONAL: Contextual help
  documentation?: {
    usage_notes?: string;
    next_steps?: string[];
    related_tools?: string[];
  };
}
```

**Example Refactored Response**:
```typescript
// BEFORE (events server):
{
  total_events: 42,
  events: [...],
  popular_tags: ["python", "gpu"],
  event_types: ["workshop", "webinar"],
  filters_applied: {event_type: "workshop"}
}

// AFTER (standardized):
{
  total: 42,
  items: [...],
  metadata: {
    filters_applied: {event_type: "workshop"},
    aggregations: {
      popular_tags: ["python", "gpu"],
      event_types: ["workshop", "webinar"]
    }
  }
}
```

### Recommendation 2: Standard Parameter Naming

**Adopt these naming conventions across ALL tools:**

```typescript
interface StandardSearchParameters {
  // Full-text search
  query?: string;                   // Free-text search across multiple fields

  // Filtering
  resource_id?: string;             // Single resource (use plural for multiple)
  resource_ids?: string[];          // Multiple resources
  institution?: string;             // Institution/organization name
  field_of_science?: string;        // Academic field

  // Date filtering
  start_date?: string;              // Absolute start (YYYY-MM-DD)
  end_date?: string;                // Absolute end (YYYY-MM-DD)
  start_date_relative?: string;     // Relative start ("today", "-1week")
  end_date_relative?: string;       // Relative end ("now", "+1week")
  timezone?: string;                // Timezone for relative dates (default: "UTC")

  // Pagination
  limit?: number;                   // Max results (default varies by tool)
  offset?: number;                  // Skip N results (default: 0)

  // Sorting
  sort_by?: string;                 // Sort field (enum specific to tool)
  sort_order?: "asc" | "desc";      // Sort direction (if needed)
}
```

### Recommendation 3: Enhanced Field Naming

**Use consistent suffixes for enhanced/calculated fields:**

```typescript
interface EnhancedFieldConventions {
  // Original API fields: Keep as-is from API
  date: string;                     // Raw from API

  // Parsed fields: Add _parsed suffix
  date_parsed: Date;                // Parsed JavaScript Date

  // Calculated fields: Add descriptive suffix
  duration_hours: number;           // Calculated duration
  starts_in_hours: number;          // Time until event
  days_ago: number;                 // Time since event

  // Formatted fields: Add _formatted suffix
  date_formatted: string;           // Human-readable format
  amount_formatted: string;         // "$1,500,000" instead of 1500000
}
```

### Recommendation 4: Type Safety Improvements

**Define strict TypeScript types for tool responses:**

```typescript
// Base types for all servers
interface ResourceReference {
  id: string;                       // Always use 'id' for primary identifier
  name: string;
  type?: string;
}

interface DateRange {
  start_date: string;
  end_date: string;
  start_date_relative?: string;
  end_date_relative?: string;
}

interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
  has_more: boolean;
}

interface AggregationCounts {
  [key: string]: number | Array<{value: string, count: number}>;
}
```

### Recommendation 5: Error Response Standardization

**Use consistent error structures:**

```typescript
interface ToolErrorResponse {
  error: {
    code: string;                   // Machine-readable error code
    message: string;                // Human-readable error message
    details?: any;                  // Additional error context
    suggestions?: string[];         // Actionable suggestions for user
  };
}
```

**Example Error Response**:
```typescript
{
  error: {
    code: "INVALID_DATE_RANGE",
    message: "End date must be after start date",
    details: {
      start_date: "2024-12-01",
      end_date: "2024-11-01"
    },
    suggestions: [
      "Use start_date='2024-11-01' and end_date='2024-12-01'",
      "Or use relative dates: start_date_relative='-1month'"
    ]
  }
}
```

---

## 🎯 **Priority Recommendations for LLM Usability**

### High Priority (Implement First)

1. **Standardize Response Structure**:
   - Use `{total, items, metadata, documentation}` format
   - Move aggregations into `metadata.aggregations`
   - Group filter echoing in `metadata.filters_applied`

2. **Unify Date Parameter Names**:
   - `start_date` / `end_date` (absolute)
   - `start_date_relative` / `end_date_relative` (relative)
   - Remove `beginning_date`, use `start_date` everywhere

3. **Consistent Pagination**:
   - Always support `limit` and `offset`
   - Return pagination info in `metadata.pagination`

### Medium Priority

4. **Standardize Filter Parameter Names**:
   - `resource_id` (singular) / `resource_ids` (plural)
   - `institution` (not `organization` or `affiliation`)
   - `query` (not `search_api_fulltext` or `keywords`)

5. **Enhanced Field Conventions**:
   - Use `_parsed`, `_formatted`, `_hours` suffixes consistently
   - Document which fields are from API vs calculated

### Lower Priority (Nice to Have)

6. **Type Definitions**:
   - Export TypeScript types for all tool responses
   - Document in generated docs

7. **Error Handling**:
   - Standardize error response format
   - Include actionable suggestions

---

## 📊 **Impact Analysis**

### Benefits for LLMs

1. **Predictability**: LLMs can learn patterns once and apply across all tools
2. **Reduced Hallucination**: Consistent naming reduces parameter guessing
3. **Better Prompts**: Documentation can reference standard patterns
4. **Improved Chaining**: Tools can more easily pass data between servers

### Example LLM Benefit

**BEFORE** (LLM must remember different patterns):
```
- events: {total_events, events, popular_tags}
- announcements: {total_announcements, filtered_announcements, announcements}
- compute-resources: {total, resources, documentation}
```

**AFTER** (LLM learns ONE pattern):
```
- All tools: {total, items, metadata, documentation}
```

### Backward Compatibility

**Migration Strategy**:
1. Add new standardized fields alongside existing fields
2. Mark old fields as deprecated in documentation
3. Maintain both for 2-3 releases
4. Remove deprecated fields in major version bump

**Example Transition**:
```typescript
// Version 0.x (current)
{
  total_events: 42,
  events: [...]
}

// Version 1.0 (transition)
{
  total: 42,             // NEW standard field
  total_events: 42,      // OLD field (deprecated)
  items: [...],          // NEW standard field
  events: [...]          // OLD field (deprecated)
}

// Version 2.0 (standardized)
{
  total: 42,
  items: [...]
}
```

---

## 🚀 **Implementation Roadmap**

### Phase 1: Documentation & Types (Low Risk)
- Document standard response format in CLAUDE.md
- Create TypeScript interfaces in shared package
- Update tool descriptions to reference standards

### Phase 2: Add Standard Fields (No Breaking Changes)
- Add `total` alongside `total_*` fields
- Add `items` alongside specific names (`events`, `resources`)
- Add `metadata` object with aggregations
- Keep all existing fields

### Phase 3: Update Examples & Tests
- Update README examples to show new structure
- Add tests for new standard fields
- Update integration tests

### Phase 4: Deprecation Period (1-2 releases)
- Mark old fields as deprecated in docs
- Add deprecation warnings in responses
- Update Claude Desktop configs to use new fields

### Phase 5: Remove Deprecated Fields (Major Version)
- Remove old field names
- Bump to v2.0.0
- Update all documentation

---

## 📝 **Implementation Checklist**

### For Each Server

- [ ] Update response structure to standard envelope
- [ ] Rename date parameters to `start_date`/`end_date`
- [ ] Add `metadata` object with aggregations
- [ ] Support `offset` parameter (if not already)
- [ ] Move aggregations into `metadata.aggregations`
- [ ] Update tool descriptions with standard parameter names
- [ ] Add TypeScript types to shared package
- [ ] Update tests to verify standard fields
- [ ] Update README examples

### Cross-Cutting Changes

- [ ] Update `@access-mcp/shared` with standard interfaces
- [ ] Update CLAUDE.md with standardization guidelines
- [ ] Create migration guide for users
- [ ] Update docs/getting-started.md examples
- [ ] Run docs generator to update all server docs

---

## 🤔 **Open Questions for Discussion**

1. **Naming**: Should we use `items` or a more specific name like `results`?
2. **Metadata**: Should `metadata` be optional or always present (even if empty)?
3. **Versioning**: Should we do this in one big release or incrementally?
4. **Tool Names**: Should tool names themselves be standardized? (e.g., `search_*` vs `get_*` vs `find_*`)
5. **Pagination**: Should we support cursor-based pagination in addition to offset-based?

---

## 📚 **References**

- [MCP Specification](https://modelcontextprotocol.io/docs/specification)
- [REST API Best Practices](https://restfulapi.net/)
- [JSON:API Specification](https://jsonapi.org/) (for inspiration on standard envelopes)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/) (for pagination patterns)

---

## Conclusion

Standardizing tool parameters and return values will significantly improve LLM usability while maintaining flexibility for server-specific needs. The proposed changes can be implemented incrementally with minimal disruption to existing users.

**Next Steps**:
1. Review and discuss recommendations with team
2. Prioritize which changes to implement first
3. Create implementation tickets/issues
4. Begin with Phase 1 (documentation and types)
