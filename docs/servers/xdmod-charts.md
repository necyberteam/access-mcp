# MCP server for XDMoD Charts and Visualizations

MCP server providing charts and visualizations from XDMoD (XD Metrics on Demand) Usage Analytics API endpoints for ACCESS-CI infrastructure. Generate SVG, PNG, and PDF charts, portal links, and advanced research visualizations with NSF Awards integration for comprehensive funding context.

## Usage Examples

### **Charts & Visualizations**

```
"CPU hours chart for January 2024 (PNG)"
"Job count data for last 30 days"
"GPU usage SVG chart grouped by resource"
"Average wait time visualization for Q1 2024"
```

### **Portal Links**

```
"XDMoD portal link for CPU hours chart"
"Interactive GPU usage view in portal"
"Job count chart link for Bridges-2"
```


## Installation

```bash
npm install -g @access-mcp/xdmod-charts
```

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "xdmod-charts": {
      "command": "npx",
      "args": ["@access-mcp/xdmod-charts"]
    }
  }
}
```

## Tools

### get_chart_data

Get chart data and metadata for a specific statistic.

**Parameters:**

- `realm` (string): The realm (e.g., "Jobs")
- `group_by` (string): The group by field (e.g., "none")
- `statistic` (string): The statistic name (e.g., "total_cpu_hours")
- `start_date` (string): Start date in YYYY-MM-DD format
- `end_date` (string): End date in YYYY-MM-DD format
- `dataset_type` (string, optional): Dataset type (default: "timeseries")

**Returns:** Raw chart data including descriptions and metadata.

### get_chart_image

Get chart image (SVG, PNG, or PDF) for a specific statistic.

**Parameters:**

- `realm` (string): The realm (e.g., "Jobs")
- `group_by` (string): The group by field (e.g., "none")
- `statistic` (string): The statistic name (e.g., "total_cpu_hours")
- `start_date` (string): Start date in YYYY-MM-DD format
- `end_date` (string): End date in YYYY-MM-DD format
- `format` (string, optional): Image format - "svg", "png", or "pdf" (default: "svg"). Note: PNG displays directly in Claude Desktop, SVG returns as data URL and code, PDF returns as downloadable data
- `width` (number, optional): Image width in pixels (default: 916)
- `height` (number, optional): Image height in pixels (default: 484)
- `dataset_type` (string, optional): Dataset type (default: "timeseries")

**Returns:** Chart image data in the requested format.

### get_chart_link

Generate a direct link to view the chart in the XDMoD portal.

**Parameters:**

- `realm` (string): The realm (e.g., "Jobs", "SUPREMM")
- `group_by` (string): The group by field (e.g., "none", "resource")
- `statistic` (string): The statistic name (e.g., "total_cpu_hours", "gpu_time")

**Returns:** Direct URL to view the interactive chart in XDMoD. Use the portal's filtering options to narrow down to specific resources, users, or other criteria.

## Understanding Realms

XDMoD organizes metrics into different **realms** that provide different types of data:

### **Jobs Realm** 
Basic job accounting and resource usage metrics:
- `total_cpu_hours` - Total CPU Hours
- `job_count` - Number of Jobs Ended
- `avg_cpu_hours` - Average CPU Hours per Job
- `total_waitduration_hours` - Total Wait Duration Hours
- `avg_waitduration_hours` - Average Wait Duration Hours
- `max_processors` - Maximum Processor Count
- `total_ace` - ACCESS Credit Equivalents Charged: Total
- `utilization` - ACCESS CPU Utilization

### **SUPREMM Realm** 
Detailed performance analytics and system metrics:
- `gpu_time` - **GPU Hours: Total** 🎯
- `avg_percent_gpu_usage` - **Avg GPU usage: weighted by GPU hour** 🎯
- `wall_time` - CPU Hours: Total
- `cpu_time_user` - CPU Hours: User: Total
- `avg_percent_cpu_user` - Avg CPU %: User: weighted by core-hour
- `avg_flops_per_core` - Avg: FLOPS: Per Core weighted by core-hour
- `avg_memory_per_core` - Avg: Memory: Per Core weighted by core-hour
- `avg_ib_rx_bytes` - Avg: InfiniBand rate: Per Node weighted by node-hour

**Note:** For GPU metrics, always use the SUPREMM realm.

## Authentication

No authentication required. The server accesses publicly available system-wide metrics data from XDMoD.

---

**Package:** `@access-mcp/xdmod-charts`  
**Version:** v0.5.0  
**Main:** `dist/index.js`
