# MCP server for XDMoD Charts and Visualizations

MCP server providing charts and visualizations from XDMoD (XD Metrics on Demand) Usage Analytics API endpoints for ACCESS-CI infrastructure. Generate SVG, PNG, and PDF charts, portal links, and advanced research visualizations with NSF Awards integration for comprehensive funding context.

## Usage Examples

### **Explore Available Metrics**

```
"What dimensions are available in XDMoD?"
"Show me all statistics for the Jobs dimension"
"What metrics can I track for Cloud resources?"
```

### **Get Usage Data**

```
"Show me total CPU hours for January 2024"
"What was the job count last month?"
"Get me the average wait time data for Q1 2024"
```

### **Generate Charts**

```
"Create an SVG chart of CPU hours for the last 30 days"
"Generate a high-resolution PNG chart of job counts for March 2024"
"Show me a PDF chart of resource utilization trends"
```

### **Portal Integration**

```
"Give me a direct link to the CPU hours chart in XDMoD"
"Generate a link to view GPU usage by resource in the portal"
"How can I view this data interactively in the portal?"
```

### **NSF Integration & Research Analysis**

```
"Show me Dr. Smith's computational usage with their NSF funding context"
"Analyze how NSF award 2138259's funding correlates with actual usage"
"Generate a research profile for University of Illinois combining usage and NSF funding"
"Compare funding allocation versus computational resource consumption"
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

### get_dimensions

Get all available dimensions from the XDMoD Usage Tab.

**Parameters:** None

**Returns:** List of all dimensions with their IDs, categories, and group-by fields.

### get_statistics

Get available statistics for a specific dimension.

**Parameters:**

- `dimension_id` (string): The dimension ID (e.g., "Jobs_none")
- `category` (string): The realm/category (e.g., "Jobs")
- `group_by` (string): The group by field (e.g., "none")

**Returns:** List of statistics available for the specified dimension.

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

### get_nsf_award

Get NSF award details for a specific award number.

**Parameters:**

- `award_number` (string): NSF award number (e.g., '2138259')

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

### get_usage_with_nsf_context

Get XDMoD usage data enriched with NSF funding context for a researcher or institution.

**Parameters:**

- `researcher_name` (string, optional): Name of researcher to analyze
- `institution_name` (string, optional): Institution to analyze
- `start_date` (string): Start date in YYYY-MM-DD format
- `end_date` (string): End date in YYYY-MM-DD format
- `limit` (number, optional): Maximum NSF awards to include (default: 10)

**Returns:** Combined analysis including XDMoD usage metrics and associated NSF funding portfolio

### analyze_funding_vs_usage

Compare NSF funding amounts with actual XDMoD computational usage patterns.

**Parameters:**

- `nsf_award_number` (string): Specific NSF award number to analyze
- `start_date` (string): Start date in YYYY-MM-DD format  
- `end_date` (string): End date in YYYY-MM-DD format

**Returns:** Comparative analysis of funding allocation versus computational resource consumption

### institutional_research_profile

Generate a comprehensive research profile combining XDMoD usage patterns with NSF funding for an institution.

**Parameters:**

- `institution_name` (string): Institution name to profile
- `start_date` (string): Start date in YYYY-MM-DD format
- `end_date` (string): End date in YYYY-MM-DD format
- `limit` (number, optional): Maximum NSF awards to include (default: 20)

**Returns:** Comprehensive institutional profile with funding and usage correlation analysis

### debug_auth_status

Check authentication status and debug information.

**Parameters:** None

**Returns:** Comprehensive debugging information including:
- API token status and configuration
- Available tools and their authentication requirements  
- Troubleshooting guidance for authentication issues
- Environment variable and command-line argument detection



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
**Version:** v0.4.0  
**Main:** `dist/index.js`
