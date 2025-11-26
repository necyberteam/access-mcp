# Python MCP server for XDMoD data access and analytics

A Python-based Model Context Protocol server for accessing XDMoD (XD Metrics on Demand) data using Python's data analytics capabilities for better data manipulation and user-specific queries. Features pandas integration, clean data structures, enhanced filtering, and framework integration with XDMoD's Python data analytics framework.

## Usage Examples

### **Personal Usage**

```
"CPU hours for ACCESS ID 'deems' (Jan-Jun 2025)"
"My computational usage trends (past 6 months)"
```

### **Data Extraction**

```
"GPU usage from SUPREMM realm (past month)"
"Job counts by field of science with timeseries"
"Raw data: institutions grouped, 2024, with progress tracking"
"Delta OR Bridges-2 jobs with >1000 cores"
```

### **Discovery (What's Available?)**

```
"List all available realms"
"What dimensions and metrics exist in Jobs realm?"
"What GPU resources can I filter by?"
"Show me available queue types"
```

### **Templates (Pre-configured Analysis)**

```
"List all analysis templates"
"Show me the queue analysis template"
"Get allocation efficiency template configuration"
```


## Installation

```bash
pipx install xdmod-mcp-data
```

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "xdmod-mcp-data": {
      "command": "xdmod-mcp-data"
    }
  }
}
```

## Tools

### `get_user_data`
Get user-specific usage data using Python's data manipulation capabilities with pandas integration.

**Parameters:**
- `access_id`: User's ACCESS ID (e.g., "deems")
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `realm`: XDMoD realm (default: "Jobs")
- `statistic`: Statistic to retrieve (default: "total_cpu_hours")

### `get_raw_data`
Get raw data from XDMoD for detailed analysis with complex filtering and progress tracking.

**Parameters:**
- `realm`: XDMoD realm (Jobs, SUPREMM, Cloud, Storage, ResourceSpecifications)
- `dimension`: Dimension for grouping data (e.g., person, resource, institution, pi, none)
- `metric`: Metric to retrieve (e.g., total_cpu_hours, job_count, wall_hours)
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `filters`: Complex filter combinations (e.g., `{'resource': ['Delta', 'Bridges-2'], 'pi': 'Smith'}`)
- `aggregation_unit`: Time aggregation (day, month, quarter, year, auto)
- `dataset_type`: Dataset type (aggregate or timeseries)
- `show_progress`: Show progress updates for large data retrievals

**Example:**
```
"Get raw CPU hours data grouped by resource for all Delta and Bridges-2 jobs in 2024"
"Extract timeseries data for GPU usage in SUPREMM realm with daily aggregation"
```

### `describe_fields`
Discover available fields and dimensions for a specific XDMoD realm with sample filter values.

**Parameters:**
- `realm`: XDMoD realm to describe (default: "Jobs")
- `include_metrics`: Include available metrics in response (default: true)
- `include_filter_values`: Include sample filter values for dimensions (default: false)

**Example:**
```
"What fields and metrics are available in the SUPREMM realm?"
"Show me all dimensions I can filter by in the Jobs realm with sample values"
```

### `describe_realms`
Discover all available XDMoD realms and their capabilities with dimension and metric counts.

**Parameters:**
- `include_details`: Include detailed information about each realm (default: true)

**Example:**
```
"What XDMoD realms are available for querying?"
"List all data realms with their dimension and metric counts"
```

### `get_smart_filters`
**Discover available filter values** - Find what resources, queues, institutions, etc. you can filter by in `get_raw_data()`. Returns categorized lists of filter values (e.g., "GPU resources", "batch queues", "physical sciences").

**When to use:** Before calling `get_raw_data()`, use this to discover what filter values are available.

**Parameters:**
- `realm`: XDMoD realm to query (default: "Jobs")
- `dimension`: Dimension to get filters for (resource, queue, person, fieldofscience, institution, etc.)
- `category`: Filter category (gpu, cpu, memory, storage, physical, life, engineering, all)
- `search_prefix`: Filter values by prefix for autocomplete-style searching (e.g., 'univ' for universities)
- `force_large_dimensions`: Override size limits for large dimensions (>1000 values)
- `limit`: Max items to display per category (default: 20)

**Example:**
```
"What GPU resources can I filter by?"
"Show me available queue types"
"Find institutions starting with 'california'"
"What science field categories exist?"
```

**Workflow:** get_smart_filters() → get_raw_data() with discovered filter values

### `get_analysis_template`
**Get pre-configured analysis patterns** - Returns ready-to-use configurations for common analysis scenarios (queue analysis, allocation efficiency, etc.) with pre-defined metrics and semantic filters.

**When to use:** When you want a standardized analysis pattern instead of building a custom query.

**Parameters:**
- `analysis_type`: Template name (queue_analysis, allocation_efficiency, performance_efficiency, etc.)
- `list_templates`: Set to true to list all 14 available templates (default: false)

**Example:**
```
"List all analysis templates"
"Get the queue analysis template"
"Show me allocation efficiency template configuration"
```

**Workflow:** get_analysis_template() → Use returned configuration with get_raw_data()

---

**Package:** `xdmod-mcp-data`  
**Version:** v0.3.0  
**Main:** `src/server.py`
