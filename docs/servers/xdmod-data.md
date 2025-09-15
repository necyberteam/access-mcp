# Python MCP server for XDMoD data access and analytics

A Python-based Model Context Protocol server providing comprehensive access to XDMoD (XD Metrics on Demand) data with advanced analytics capabilities. Features pandas integration, smart filtering, NSF funding integration, and the official XDMoD Python data analytics framework for robust data analysis.

## Key Features

✅ **User-specific Data Access** - Lookup by ACCESS ID with smart name matching  
✅ **Advanced Chart & Raw Data** - Full realm support (Jobs, SUPREMM, Cloud, Storage)  
✅ **GPU Metrics Support** - Specialized GPU analytics via SUPREMM realm  
✅ **Smart Discovery** - Auto-discovery of dimensions, metrics, and filter values  
✅ **NSF Integration** - Cross-reference with NSF funding data  
✅ **Analysis Templates** - Pre-configured queries for common research patterns  
✅ **Enhanced Error Handling** - Clear validation and troubleshooting guidance

## Usage Examples

### **Personal Usage Analytics**
```
"Get my computational usage for ACCESS ID [your-id] from January to June 2024"
"Show me GPU usage for my ACCESS ID using SUPREMM realm"
"What are my CPU hours and job counts for the past quarter?"
```

### **Advanced Data Discovery**
```
"What dimensions and metrics are available in the SUPREMM realm?"
"Show me all available GPU-enabled resources with smart filters"
"Get analysis templates for institutional usage comparison"
```

### **GPU & Performance Analytics**
```
"Get GPU usage data by resource for Q1 2024"
"Show me average GPU utilization for Bridges 2 GPU"
"Compare CPU vs GPU usage patterns across resources"
```

### **Research & Funding Integration**
```
"Get usage data with NSF funding context for Dr. [Name]"
"Compare NSF award funding vs actual computational usage"
"Generate institutional research profile for [University]"
```

### **Chart Data & Visualization**
```
"Get chart data for total CPU hours by institution for 2024"
"Show me job count trends by field of science"
"Get timeseries data for GPU usage by resource with filters"
```

### **Troubleshooting & Discovery**
```
"Debug my XDMoD authentication and check framework status"
"Show me smart filters for the person dimension"
"What analysis templates are available for efficiency studies?"
```


## Installation

```bash
pipx install xdmod-mcp-data
```

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "xdmod-data": {
      "command": "xdmod-mcp-data"
    }
  }
}
```



## Available Tools

**Core Data Access:**
- `get_user_data_python` - Personal usage data by ACCESS ID
- `get_chart_data` - Chart data for visualization and analysis
- `get_raw_data` - Raw data with complex filtering and progress tracking

**Discovery & Documentation:**
- `describe_raw_fields` - Discover available dimensions/metrics for a realm
- `describe_raw_realms` - List all available XDMoD realms and capabilities
- `get_smart_filters` - Smart semantic filters with autocomplete support
- `get_analysis_template` - Pre-configured query templates

**NSF Integration:**
- `get_usage_with_nsf_context` - Usage data enriched with NSF funding context
- `analyze_funding_vs_usage` - Compare NSF funding vs computational usage
- `institutional_research_profile` - Comprehensive institutional analysis

**Testing & Debug:**
- `debug_python_auth` - Authentication and framework status debugging
- `test_data_framework` - Test XDMoD data analytics framework integration

## Authentication

Set your XDMoD API token as an environment variable:
```bash
export XDMOD_API_TOKEN="your_api_token_here"
```

## GPU Metrics Support

For GPU analytics, always use the **SUPREMM realm**:
```python
{
  "realm": "SUPREMM",
  "metric": "gpu_time",  # or "avg_percent_gpu_usage"
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

---

**Package:** `xdmod-mcp-data`  
**Version:** v0.2.0  
**Repository:** [access-mcp](https://github.com/necyberteam/access-mcp)  
**Documentation:** [Python Reference Guide](../xdmod-python-reference.md)
