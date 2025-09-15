# XDMoD MCP Data Server

A Python-based Model Context Protocol server for accessing XDMoD (XD Metrics on Demand) data using Python's data analytics capabilities for better data manipulation and user-specific queries. Features pandas integration, clean data structures, enhanced filtering, and framework integration with XDMoD's Python data analytics framework.

## Usage Examples

### **Authentication & Debug**

```
"Debug my XDMoD data authentication and check what frameworks are available"
"Test if the official XDMoD data framework is working"
```

### **Personal Usage Data**

```
"Get usage data for my ACCESS ID using the data server"
"Show me CPU hours for my ACCESS ID from January to June 2025"
"What's my computational usage for my ACCESS ID?"
```

### **Raw Data Extraction**

```
"Get raw CPU hours data grouped by institution for 2024"
"Extract timeseries data for all jobs on Delta with daily aggregation"
"Show me raw GPU usage metrics from SUPREMM realm for the past month"
"Get job counts by field of science with progress tracking"
```

### **Data Discovery**

```
"What realms are available in XDMoD?"
"Show me all dimensions and metrics available in the Jobs realm"
"What fields can I filter by in the SUPREMM realm?"
"List sample filter values for the resource dimension"
```

### **Complex Filtering**

```
"Get raw data for jobs on Delta OR Bridges-2 with more than 1000 cores"
"Extract usage data filtered by multiple PIs and institutions"
"Show timeseries data for specific research groups across all resources"
```

### **Data Analytics**

```
"Get my usage data using the official data framework instead of REST API"
"Analyze the team's computational patterns using ACCESS IDs"
"Show me my usage trends for my ACCESS ID over the past 6 months"
```

### **Framework Integration**

```
"Test the XDMoD data analytics framework integration"
"Use pandas to analyze my computational usage patterns"
"Get clean structured data for my research usage"
```

## Installation

**For Claude Desktop (Recommended):**
```bash
# Install pipx if you don't have it
brew install pipx

# Install from local development copy
cd /path/to/access_mcp/packages/xdmod-data
pipx install .

# Or install from GitHub (when published)
pipx install git+https://github.com/necyberteam/access-mcp.git#subdirectory=packages/xdmod-data
```

**For Development:**
```bash
cd /path/to/access_mcp/packages/xdmod-data
python3 -m venv venv
source venv/bin/activate
pip install -e .
pip install xdmod-data  # Install official XDMoD Python framework
```

**Note:** This MCP server requires the official `xdmod-data` package for full functionality. The pipx installation method will automatically install it in an isolated environment.

## Configuration

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

**Note:** After installing with pipx, restart Claude Desktop to detect the new command.

## Tools

### `debug_python_auth`
Debug authentication status and check for XDMoD data analytics framework availability.

### `get_user_data_python`
Get user-specific usage data using Python's data manipulation capabilities.

**Parameters:**
- `access_id`: User's ACCESS ID (e.g., "deems")
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `realm`: XDMoD realm (default: "Jobs")
- `statistic`: Statistic to retrieve (default: "total_cpu_hours")

### `test_data_framework`
Test integration with XDMoD's data analytics framework and check availability.

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

### `describe_raw_fields`
Discover available fields and dimensions for a specific XDMoD realm.

**Parameters:**
- `realm`: XDMoD realm to describe (default: "Jobs")
- `include_metrics`: Include available metrics in response (default: true)
- `include_filter_values`: Include sample filter values for dimensions (default: false)

**Example:**
```
"What fields and metrics are available in the SUPREMM realm?"
"Show me all dimensions I can filter by in the Jobs realm with sample values"
```

### `describe_raw_realms`
Discover all available XDMoD realms and their capabilities.

**Parameters:**
- `include_details`: Include detailed information about each realm (default: true)

**Example:**
```
"What XDMoD realms are available for querying?"
"List all data realms with their dimension and metric counts"
```

### `get_analysis_template`
Get pre-configured analysis templates with semantic filters and multi-metric support for common analysis scenarios.

**Parameters:**
- `analysis_type`: Template name (see Analysis Templates section below)
- `list_templates`: Set to true to list all available templates (default: false)

**Example:**
```
"Show me all available analysis templates"
"Get the queue analysis template configuration"
"Use the allocation efficiency template for resource optimization"
```

### `get_smart_filters`
Get smart semantic filters using XDMoD's built-in dynamic filter discovery with autocomplete support - no maintenance required!

**Parameters:**
- `realm`: XDMoD realm to query (default: "Jobs")
- `dimension`: Dimension to get filters for (resource, queue, person, fieldofscience, institution, etc.)
- `category`: Filter category (gpu, cpu, memory, storage, physical, life, engineering, all)
- `search_prefix`: Filter values by prefix for autocomplete-style searching (e.g., 'univ' for universities)
- `force_large_dimensions`: Override size limits for large dimensions (>1000 values)
- `limit`: Max items to display per category (default: 20)

**Example:**
```
"Get smart filters for GPU resources"
"Show me queue categories for queue analysis" 
"Find institutions with prefix 'california'"
"Get science field categories for research analysis"
```

**Key Features:**
- **Always Current**: Pulls live data from XDMoD - no maintenance needed
- **Smart Categorization**: Automatically groups resources (GPU/CPU), queues (batch/interactive), science fields (physical/life sciences)
- **Autocomplete Support**: Use search_prefix for large dimensions like users or institutions
- **Size Protection**: Warns about large dimensions and suggests alternatives
- **Template Ready**: JSON output copies directly into get_raw_data() calls

## Analysis Templates

The server provides 14 pre-configured analysis templates organized by operational value. Each template includes base configuration, dynamic semantic filters, multi-metric support, and context parameters for professional analysis.

**🔄 Maintenance-Free Design**: Templates use `get_smart_filters()` references for always-current filter values - no hardcoded values to maintain!

### 🚀 Operational Insights (System Administrators)

**Queue Analysis** - Critical for operational insights
- Monitor job queue performance and wait time patterns
- Identify bottlenecks and optimize scheduling
- Multi-metrics: wait duration, job count, average wait times
- Semantic filters: interactive_queues, batch_queues, gpu_queues, debug_queues

**Allocation Efficiency** - Important for resource management  
- Analyze resource allocation utilization and optimization opportunities
- Identify unused allocations and optimize distribution
- Multi-metrics: CPU hours, SU charged, job count, average usage
- Semantic filters: power_users, underutilized, overutilized allocations

**Performance Efficiency** - Computational throughput analysis
- Monitor job performance and computational efficiency 
- Identify performance optimization opportunities
- Multi-metrics: CPU hours, job count, wait duration, average performance
- Semantic filters: cpu_intensive, gpu_intensive, memory_intensive, io_intensive

**Multi Node Scaling** - Parallel efficiency metrics
- Analyze parallel job scaling and multi-node utilization patterns
- Understand scaling efficiency and parallel overhead
- Multi-metrics: CPU hours, job count, average processors, wait duration
- Semantic filters: single_node, small_parallel, large_parallel, massive_parallel

**Service Provider Comparison** - Performance benchmarking
- Compare performance across different ACCESS service providers
- Identify optimal allocation strategies
- Multi-metrics: CPU hours, job count, wait duration, SU charged
- Semantic filters: tacc, ncsa, psc, sdsc, iu providers

**Grant Type Analysis** - Funding source analysis
- Analyze computational resource usage by funding source
- Understand how different grant types drive usage
- Multi-metrics: CPU hours, SU charged, job count, unique users
- Semantic filters: research_grants, startup_grants, education_grants, industry_grants

### 👤 User Analysis (Individual Insights - Publicly Available Data)

*Note: ACCESS-CI XDMoD user data is publicly available through the XDMoD portal, making individual user analysis valuable for optimization consulting and training opportunities.*

**Individual User Productivity** - Optimization consulting opportunities
- Analyze user computational productivity patterns
- Identify users for optimization consulting
- Multi-metrics: CPU hours, job count, processors, job duration
- Semantic filters: power_users (>5M CPU hours), community_accounts, high_job_count

**User Efficiency Profiling** - Training opportunities (SUPREMM)
- Profile computational efficiency using performance metrics
- Identify users for optimization training
- Multi-metrics: CPU utilization, wall time, memory usage, job count, GPU time
- Semantic filters: highly_efficient (>90%), inefficient (<50%), gpu_users

**User Computing Behavior** - Scaling patterns and training
- Analyze user parallelism and computational scaling behavior
- Identify candidates for advanced HPC training
- Multi-metrics: processors, CPU hours, job count, max processors, duration
- Semantic filters: serial_computing, extreme_parallel (>8K cores), hpc_power_users

**User Activity Timeline** - Temporal engagement patterns
- Analyze user computational behavior over time
- Track engagement and predict system load
- Multi-metrics: CPU hours, job count, processors (weekly timeseries)
- Semantic filters: top_users, burst_users, steady_users, new_users

### 📊 Research Analysis (Scientific Insights)

**Field Trends** - Scientific domain usage over time
- Track computational usage trends by field of science
- Monthly timeseries for scientific domains
- Semantic filters: computer_science, life_sciences, physical_sciences

**Resource Usage** - System utilization comparison
- Compare usage patterns across computational resources
- Daily timeseries across major HPC systems
- Semantic filters: gpu_systems, cpu_systems, large_systems

**Job Size Analysis** - Resource utilization efficiency
- Understand job size distribution and efficiency
- Aggregate analysis by job size categories
- Semantic filters: small_jobs, medium_jobs, large_jobs

**GPU Usage** - Specialized GPU analysis (SUPREMM)
- Track GPU computational patterns and efficiency
- Daily GPU usage timeseries
- Semantic filters: gpu_resources, high_gpu_usage

### 📈 Basic Analysis

**Institutional Comparison** - Simple institutional comparisons
- Compare computational usage across institutions
- Basic aggregate analysis
- Semantic filters: top_institutions, california_unis, ivy_league

## Template Usage Examples

### Basic Template Usage
```bash
# List all available templates
"Show me all analysis templates"

# Get specific template configuration
"Get the queue analysis template"
"Show me the allocation efficiency template configuration"
```

### Dynamic Filter Integration
```bash
# Get live filter values for templates
"Get smart filters for GPU resources"  # For resource templates
"Show me current queue types"          # For queue analysis template
"Find computer science fields"         # For field trends template

# Use filters with raw data
"Get raw CPU hours data for GPU systems from smart filters"
"Extract queue wait time data for interactive queues"
```

### Complete Analysis Workflow
```bash
# Step 1: Get template configuration
"Get the performance efficiency template"

# Step 2: Get current filter values  
"Get smart filters for resources with category gpu"

# Step 3: Apply to raw data analysis
"Get raw data for GPU resources using performance efficiency metrics for 2024"

# Alternative: Direct template application
"Use the performance efficiency template to analyze GPU usage for the past quarter"
```

## Usage Examples

Once configured, you can ask Claude:

- "Debug my XDMoD data authentication"
- "Get my usage data using the data server for the last 6 months"
- "Test the XDMoD data analytics framework"

## Comparison with XDMoD Charts Server

This data server aims to provide:
- **Better data manipulation** with pandas
- **Cleaner user data extraction** 
- **More intuitive API** for complex queries
- **Framework integration** when available

## Development

```bash
# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black src/
```