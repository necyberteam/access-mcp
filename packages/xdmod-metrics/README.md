# XDMoD Metrics MCP Server

MCP server providing access to XDMoD (XD Metrics on Demand) Usage Analytics API endpoints for ACCESS-CI infrastructure metrics and statistics, enhanced with NSF Awards integration for comprehensive research funding context.

## API Endpoints Covered

- **Dimensions**: `/controllers/user_interface.php` - Get all available dimensions from Usage Tab
- **Statistics**: `/controllers/user_interface.php` - Get available statistics for each dimension
- **Chart Data**: `/controllers/user_interface.php` - Get raw chart data and metadata
- **Chart Images**: `/controllers/user_interface.php` - Get chart images in SVG, PNG, or PDF format
- **Chart Links**: Generate direct links to XDMoD portal charts
- **NSF Awards**: `https://api.nsf.gov/services/v1/awards.json` - NSF award details and search
- **Debug Tools**: Authentication status and troubleshooting utilities

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

## Authentication

The server supports optional API token authentication via the `XDMOD_API_TOKEN` environment variable. While authenticated access is configured, the current release focuses on public data access. Personal usage features are in development and preserved in `src/user-specific.ts` for future releases.

## Quick Start with Claude Desktop

After adding this server to your Claude Desktop configuration, you can ask natural language questions like:

### 🔍 **Explore Available Metrics**

- "What dimensions are available in XDMoD?"
- "Show me all statistics for the Jobs dimension"
- "What metrics can I track for Cloud resources?"

### 📊 **Get Usage Data**

- "Show me total CPU hours for January 2024"
- "What was the job count last month?"
- "Get me the average wait time data for Q1 2024"

### 📈 **Generate Charts**

- "Create an SVG chart of CPU hours for the last 30 days"
- "Generate a high-resolution PNG chart of job counts for March 2024"
- "Show me a PDF chart of resource utilization trends"

### 🔗 **Portal Integration**

- "Give me a direct link to the CPU hours chart in XDMoD"
- "Generate a link to view GPU usage by resource in the portal"
- "How can I view this data interactively in the portal?"

### 🔬 **NSF Integration & Research Analysis**

- "Show me Dr. Smith's computational usage with their NSF funding context"
- "Analyze how NSF award 2138259's funding correlates with actual usage"
- "Generate a research profile for University of Illinois combining usage and NSF funding"
- "Compare funding allocation versus computational resource consumption"

## Detailed Usage Examples

### Getting Available Dimensions

**Natural Language**: "What metrics are available in XDMoD?"

**Tool Call**:

```typescript
const dimensions = await get_dimensions();
```

**Returns**: List of dimensions like Jobs, Cloud, Storage, GPU, etc.

### Getting Statistics for a Dimension

**Natural Language**: "Show me what statistics I can get for Jobs"

**Tool Call**:

```typescript
const statistics = await get_statistics({
  dimension_id: "Jobs_none",
  category: "Jobs",
  group_by: "none",
});
```

**Returns**: Metrics like total_cpu_hours, job_count, avg_cpu_hours, wait_time, etc.

### Getting Chart Data

**Natural Language**: "Get me CPU hours data for January 2024"

**Tool Call**:

```typescript
const chartData = await get_chart_data({
  realm: "Jobs",
  group_by: "none",
  statistic: "total_cpu_hours",
  start_date: "2024-01-01",
  end_date: "2024-01-31",
});
```

**Returns**: Raw data with chart descriptions and metadata

### Getting GPU Usage Data

**Natural Language**: "Show me GPU usage on Bridges 2 for the last year"

**Tool Call**:

```typescript
const gpuData = await get_chart_data({
  realm: "SUPREMM", // Use SUPREMM for GPU metrics!
  group_by: "resource",
  statistic: "gpu_time", // or "avg_percent_gpu_usage"
  start_date: "2024-01-01",
  end_date: "2024-12-31",
  filters: {
    resource: "Bridges 2 GPU",
  },
});
```

### Getting Chart Images

**Natural Language**: "Create a chart showing CPU usage trends for Q1 2024"

**Tool Call**:

```typescript
// SVG format (default)
const svgChart = await get_chart_image({
  realm: "Jobs",
  group_by: "none",
  statistic: "total_cpu_hours",
  start_date: "2024-01-01",
  end_date: "2024-03-31",
  format: "svg",
});

// High-resolution PNG
const pngChart = await get_chart_image({
  realm: "Jobs",
  group_by: "none",
  statistic: "total_cpu_hours",
  start_date: "2024-01-01",
  end_date: "2024-03-31",
  format: "png",
  width: 1920,
  height: 1080,
});
```

### Getting Chart Links

**Natural Language**: "Give me a link to view this chart in XDMoD"

**Tool Call**:

```typescript
// Basic chart link
const chartLink = await get_chart_link({
  realm: "Jobs",
  group_by: "none",
  statistic: "total_cpu_hours",
});

// GPU usage chart link grouped by resource
const gpuChartLink = await get_chart_link({
  realm: "SUPREMM",
  group_by: "resource",
  statistic: "gpu_time",
});
```

**Returns**: Direct URL like: `https://xdmod.access-ci.org/index.php#tg_usage?node=statistic&realm=Jobs&group_by=none&statistic=total_cpu_hours`

### Research Analysis with NSF Integration

**Natural Language**: "Analyze Dr. Smith's computational usage with their NSF funding context for 2024"

**Tool Call**:

```typescript
const researchAnalysis = await get_usage_with_nsf_context({
  researcher_name: "John Smith",
  start_date: "2024-01-01",
  end_date: "2024-12-31",
  limit: 5,
});
```

**Returns**: Combined analysis showing XDMoD usage patterns alongside NSF funding portfolio

### Funding vs Usage Analysis

**Natural Language**: "Compare NSF award 2138259's funding with actual computational usage"

**Tool Call**:

```typescript
const fundingAnalysis = await analyze_funding_vs_usage({
  nsf_award_number: "2138259",
  start_date: "2024-01-01",
  end_date: "2024-12-31",
});
```

**Returns**: Detailed comparison of funding allocation versus actual resource consumption

### Institutional Research Profile

**Natural Language**: "Generate a comprehensive research profile for University of Illinois"

**Tool Call**:

```typescript
const institutionProfile = await institutional_research_profile({
  institution_name: "University of Illinois",
  start_date: "2024-01-01",
  end_date: "2024-12-31",
  limit: 15,
});
```

**Returns**: Complete institutional analysis combining usage patterns with NSF funding landscape

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

**💡 For GPU metrics, always use the SUPREMM realm!**

## Authentication

The server supports optional API token authentication for enhanced debugging and troubleshooting. The current release focuses on system-wide public metrics data from XDMoD.

## Practical Workflows

### 📊 **Monthly Reporting Workflow**

1. "What dimensions are available?" → Choose your metric category
2. "Show me statistics for Jobs dimension" → Pick relevant metrics
3. "Generate a chart of total CPU hours for last month" → Get visual
4. "Give me the link to view this in XDMoD" → Share with team

### 🔍 **Performance Investigation**

1. "Get me job count data for the past week"
2. "Show me average wait times for the same period"
3. "Create a comparison chart of wait times vs job counts"
4. "What's the correlation between usage and wait times?"

### 📈 **Capacity Planning**

1. "Show CPU usage trends for the last 6 months"
2. "What are the peak usage periods?"
3. "Generate high-resolution charts for presentation"
4. "Export data for further analysis"

### 🔬 **Research Impact Analysis**

1. "Analyze Dr. Johnson's computational usage with NSF funding context"
2. "Compare funding efficiency across different research groups"
3. "Generate institutional research profile with funding correlations"
4. "Identify usage patterns that correlate with successful funding outcomes"

## Date Formats and Ranges

All date parameters must be in `YYYY-MM-DD` format:

- `2024-01-01` - January 1st, 2024
- `2024-12-31` - December 31st, 2024

**Common Date Ranges**:

- Last Month: Use first and last day of previous month
- Quarter: Q1 = Jan 1 - Mar 31, Q2 = Apr 1 - Jun 30, etc.
- Year to Date: Jan 1 to today's date
- Custom Period: Any start and end date you need

## Tips and Best Practices

### 🎯 **Getting Started**

1. Always start by exploring available dimensions
2. Check what statistics are available for your chosen dimension
3. Use descriptive natural language - Claude will map it to the right tools

### 📊 **Working with Data**

- Request data first to understand the structure
- Then generate visualizations based on what you find
- Use chart links to share interactive views with colleagues

### 🖼️ **Chart Formats**

- **SVG**: Best for web display and scaling
- **PNG**: Best for presentations and documents
- **PDF**: Best for archival and printing

### 🔄 **Efficient Workflows**

- Save frequently used date ranges
- Bookmark generated portal links
- Export data for longitudinal analysis

## Authentication

### **Public Access (Default)**

By default, this server uses public access to XDMoD APIs and provides general usage statistics and metrics.

### **Authenticated Access (Personal Data)**

For access to personal usage data like "show me my credit usage in the last 3 months", you can set up authentication using an XDMoD API token.

#### **Setting Up Authentication:**

1. **Generate API Token:**
   - Sign in to [XDMoD portal](https://xdmod.access-ci.org/)
   - Click "My Profile" button (top-right corner)
   - Click "API Token" tab
   - Copy your token (save it securely - you won't see it again!)

2. **Configure Authentication (Choose One):**

   **Option A: Environment Variable**

   ```bash
   export XDMOD_API_TOKEN="your-token-here"
   npm start
   ```

   **Option B: Claude Desktop Config** _(Recommended)_

   ```json
   {
     "mcpServers": {
       "xdmod-metrics": {
         "command": "node",
         "args": [
           "/path/to/access_mcp/packages/xdmod-metrics/dist/index.js",
           "--api-token",
           "your-token-here"
         ]
       }
     }
   }
   ```

3. **Test Authentication:**
   Ask Claude: _"Debug my XDMoD authentication status"_ to verify setup

#### **Authentication Features:**

When authenticated, you get enhanced debugging capabilities:

- `debug_auth_status` - Comprehensive authentication status and troubleshooting

#### **Example Authentication Queries:**

- "Debug my XDMoD authentication status"
- "Check if my API token is working"
- "Help me troubleshoot authentication issues"

**Note:** Personal usage data features are in development. The current release focuses on system-wide public metrics.

## Data Source

All data is sourced from the ACCESS-CI XDMoD portal at https://xdmod.access-ci.org/

## Usage

```bash
# Install and build
npm install
npm run build

# Start the server
npm start
```

The server runs on stdio transport and can be integrated with MCP-compatible clients.
