# XDMoD Python Analytics Reference Guide

This reference guide provides comprehensive documentation for all available dimensions and metrics in the XDMoD system for the Python analytics server.

## Realms (Categories)

XDMoD organizes metrics into different **realms**:

### Jobs Realm
Basic job accounting and resource usage metrics from job schedulers.

**Available Dimensions:**
- `person` - Individual users (for ACCESS ID queries)
- `resource` - Compute resources/systems
- `institution` - User institutions
- `pi` - Principal investigators
- `field_of_science` - Research fields
- `project` - Research projects
- `queue` - Job queues
- `jobsize` - Job size categories
- `none` - System-wide aggregated data

**Available Metrics:**
- `total_cpu_hours` - Total CPU hours consumed
- `job_count` - Number of jobs executed
- `avg_cpu_hours` - Average CPU hours per job
- `total_waitduration_hours` - Total wait time in queue
- `avg_waitduration_hours` - Average wait time per job
- `total_ace` - ACCESS Credit Equivalents charged
- `utilization` - Resource utilization percentage
- `total_su` - Total service units consumed
- `avg_processors` - Average processor count
- `max_processors` - Maximum processor count
- `min_processors` - Minimum processor count

### SUPREMM Realm
Detailed performance analytics and system metrics from job monitoring data.

**Available Dimensions:**
- `person` - Individual users (for ACCESS ID queries)
- `resource` - Compute resources/systems
- `institution` - User institutions
- `pi` - Principal investigators
- `field_of_science` - Research fields
- `project` - Research projects
- `queue` - Job queues
- `jobsize` - Job size categories
- `none` - System-wide aggregated data

**Available Metrics:**
- `gpu_time` - **GPU Hours: Total** 🎯
- `avg_percent_gpu_usage` - **Avg GPU usage: weighted by GPU hour** 🎯
- `wall_time` - CPU Hours: Total
- `cpu_time_user` - CPU Hours: User: Total
- `avg_percent_cpu_user` - Avg CPU %: User: weighted by core-hour
- `avg_flops_per_core` - Avg FLOPS per core weighted by core-hour
- `avg_memory_per_core` - Avg memory per core weighted by core-hour
- `avg_ib_rx_bytes` - Avg InfiniBand rate per node weighted by node-hour
- `avg_block_read_rate` - Avg block I/O read rate per node
- `avg_block_write_rate` - Avg block I/O write rate per node
- `max_memory` - Max memory consumed
- `avg_cpu_idle` - Avg CPU %: Idle weighted by core-hour
- `avg_percent_cpu_system` - Avg CPU %: System weighted by core-hour

**💡 For GPU metrics, always use the SUPREMM realm!**

### Cloud Realm
Cloud and virtualized compute environment metrics.

**Available Dimensions:**
- `person` - Individual users
- `resource` - Cloud resources
- `institution` - User institutions
- `pi` - Principal investigators
- `vm_size` - Virtual machine sizes
- `provider` - Cloud providers
- `none` - System-wide aggregated data

**Available Metrics:**
- `cloud_num_sessions_ended` - Number of sessions ended
- `cloud_wall_hours` - Wall hours
- `cloud_cpu_hours` - CPU hours
- `cloud_num_sessions_running` - Number of sessions running
- `avg_memory_reserved` - Average memory reserved
- `total_memory_reserved` - Total memory reserved

### Storage Realm
File system and storage usage metrics.

**Available Dimensions:**
- `person` - Individual users
- `resource` - Storage resources
- `institution` - User institutions
- `pi` - Principal investigators
- `username` - Username (different from person)
- `mountpoint` - Mount points
- `none` - System-wide aggregated data

**Available Metrics:**
- `avg_logical_usage` - Average logical usage
- `max_logical_usage` - Maximum logical usage
- `avg_physical_usage` - Average physical usage
- `max_physical_usage` - Maximum physical usage
- `file_count` - File count
- `avg_file_size` - Average file size

## Common Usage Patterns for Python Server

### Personal Usage Query (ACCESS ID Required)
```python
get_user_data_python({
    "access_id": "deems",  # User's ACCESS ID
    "realm": "Jobs",
    "statistic": "total_cpu_hours",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
})
```

### System-Wide Analysis
```python
get_chart_data({
    "realm": "Jobs",
    "dimension": "resource",
    "metric": "total_cpu_hours",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
})
```

### GPU Usage Analysis
```python
get_chart_data({
    "realm": "SUPREMM",  # Important: Use SUPREMM for GPU!
    "dimension": "resource",
    "metric": "gpu_time",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
})
```

### Institutional Analysis
```python
get_chart_data({
    "realm": "Jobs",
    "dimension": "institution",
    "metric": "total_ace",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "limit": 10
})
```

### Filtered Analysis
```python
get_chart_data({
    "realm": "Jobs",
    "dimension": "person",
    "metric": "job_count",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "filters": {
        "resource": ["Bridges 2 GPU"],
        "institution": ["University of Colorado Boulder"]
    }
})
```

## Filter Options

The `filters` parameter accepts a dictionary where:
- Keys are dimension names (person, resource, institution, etc.)
- Values can be strings or lists of strings for multiple values

**Common Filter Examples:**
```python
# Single resource filter
"filters": {"resource": "Bridges 2 GPU"}

# Multiple resources
"filters": {"resource": ["Bridges 2 GPU", "Expanse GPU"]}

# Institution filter
"filters": {"institution": "University of Colorado Boulder"}

# Multiple filters
"filters": {
    "resource": "Delta GPU",
    "institution": "NCSA"
}
```

## Dataset Types

- `aggregate` - Summary/totals data (default for most queries)
- `timeseries` - Time-based trending data

## Important Notes

1. **ACCESS ID Queries**: Use `get_user_data_python` for personal usage data - requires the user's ACCESS ID
2. **GPU Metrics**: Always use SUPREMM realm for GPU-related analysis
3. **Performance**: Server-side filtering is more efficient than client-side filtering
4. **NSF Integration**: This server provides NSF integration methods that call the NSF Awards server

## NSF Integration Methods

This server also provides NSF integration capabilities:

- `get_usage_with_nsf_context` - Combine XDMoD usage with NSF funding data
- `analyze_funding_vs_usage` - Compare NSF awards with computational usage
- `institutional_research_profile` - Generate comprehensive institutional analysis

These methods use composition to call the dedicated NSF Awards server for NSF-specific data while providing XDMoD context.

## Reference Architecture

The Python server serves as the **data analysis hub**:
- Personal ACCESS ID queries
- Advanced data analytics using xdmod-data framework
- NSF integration via composition with NSF Awards server
- Complex filtering and aggregation capabilities

For pure chart generation, use the TypeScript Charts server.
For pure NSF award searches, use the NSF Awards server.