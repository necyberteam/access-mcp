# XDMoD Metrics Reference Guide

This reference guide provides comprehensive documentation for all available dimensions and statistics in the XDMoD system, replacing the need for discovery tools.

## Realms (Categories)

XDMoD organizes metrics into different **realms** that provide different types of data:

### Jobs Realm
Basic job accounting and resource usage metrics from job schedulers.

**Available Dimensions:**
- `none` - System-wide aggregated data
- `resource` - Broken down by compute resource
- `person` - Broken down by individual users
- `pi` - Broken down by Principal Investigators
- `institution` - Broken down by institutions
- `jobsize` - Broken down by job size categories
- `queue` - Broken down by scheduler queue
- `fieldofscience` - Broken down by field of science

**Available Statistics:**
- `total_cpu_hours` - Total CPU Hours
- `job_count` - Number of Jobs Ended
- `avg_cpu_hours` - Average CPU Hours per Job
- `total_waitduration_hours` - Total Wait Duration Hours
- `avg_waitduration_hours` - Average Wait Duration Hours
- `max_processors` - Maximum Processor Count
- `total_ace` - ACCESS Credit Equivalents Charged: Total
- `utilization` - ACCESS CPU Utilization
- `avg_processors` - Average Processor Count
- `min_processors` - Minimum Processor Count
- `total_su` - Total SUs Charged
- `avg_su` - Average SUs per Job

### SUPREMM Realm
Detailed performance analytics and system metrics from job monitoring data.

**Available Dimensions:**
- `none` - System-wide aggregated data
- `resource` - Broken down by compute resource
- `person` - Broken down by individual users
- `pi` - Broken down by Principal Investigators
- `institution` - Broken down by institutions
- `jobsize` - Broken down by job size categories
- `queue` - Broken down by scheduler queue
- `fieldofscience` - Broken down by field of science

**Available Statistics:**
- `gpu_time` - **GPU Hours: Total** 🎯
- `avg_percent_gpu_usage` - **Avg GPU usage: weighted by GPU hour** 🎯
- `wall_time` - CPU Hours: Total
- `cpu_time_user` - CPU Hours: User: Total
- `avg_percent_cpu_user` - Avg CPU %: User: weighted by core-hour
- `avg_flops_per_core` - Avg: FLOPS: Per Core weighted by core-hour
- `avg_memory_per_core` - Avg: Memory: Per Core weighted by core-hour
- `avg_ib_rx_bytes` - Avg: InfiniBand rate: Per Node weighted by node-hour
- `avg_block_read_rate` - Avg: Block I/O read rate: Per Node weighted by node-hour
- `avg_block_write_rate` - Avg: Block I/O write rate: Per Node weighted by node-hour
- `max_memory` - Max: Memory: Consumed
- `avg_cpu_idle` - Avg CPU %: Idle: weighted by core-hour
- `avg_percent_cpu_system` - Avg CPU %: System: weighted by core-hour

**💡 For GPU metrics, always use the SUPREMM realm!**

### Cloud Realm
Cloud and virtualized compute environment metrics.

**Available Dimensions:**
- `none` - System-wide aggregated data
- `resource` - Broken down by compute resource
- `person` - Broken down by individual users
- `pi` - Broken down by Principal Investigators
- `institution` - Broken down by institutions
- `vm_size` - Broken down by virtual machine size
- `provider` - Broken down by cloud provider

**Available Statistics:**
- `cloud_num_sessions_ended` - Number of Sessions Ended
- `cloud_wall_hours` - Wall Hours
- `cloud_cpu_hours` - CPU Hours
- `cloud_num_sessions_running` - Number of Sessions Running
- `avg_memory_reserved` - Average Memory Reserved
- `total_memory_reserved` - Total Memory Reserved

### Storage Realm
File system and storage usage metrics.

**Available Dimensions:**
- `none` - System-wide aggregated data
- `resource` - Broken down by storage resource
- `person` - Broken down by individual users
- `pi` - Broken down by Principal Investigators
- `institution` - Broken down by institutions
- `username` - Broken down by username
- `mountpoint` - Broken down by mount points

**Available Statistics:**
- `avg_logical_usage` - Average Logical Usage
- `max_logical_usage` - Maximum Logical Usage
- `avg_physical_usage` - Average Physical Usage
- `max_physical_usage` - Maximum Physical Usage
- `file_count` - File Count
- `avg_file_size` - Average File Size

## Common Usage Patterns

### System-Wide Overview
```typescript
{
  realm: "Jobs",
  group_by: "none",
  statistic: "total_cpu_hours"
}
```

### Resource Comparison
```typescript
{
  realm: "Jobs",
  group_by: "resource",
  statistic: "utilization"
}
```

### GPU Usage Analysis
```typescript
{
  realm: "SUPREMM",  // Important: Use SUPREMM for GPU!
  group_by: "resource",
  statistic: "gpu_time"
}
```

### User Activity
```typescript
{
  realm: "Jobs",
  group_by: "person",
  statistic: "job_count"
}
```

### Institutional Analysis
```typescript
{
  realm: "Jobs",
  group_by: "institution",
  statistic: "total_ace"
}
```

## Filter Options

Most chart requests support optional filters to narrow down results:

```typescript
{
  realm: "SUPREMM",
  group_by: "resource",
  statistic: "gpu_time",
  filters: {
    resource: "Bridges 2 GPU",
    person: "smith"
  }
}
```

**Common Filter Types:**
- `resource` - Specific compute resource (e.g., "Bridges 2 GPU", "Expanse")
- `person` - Specific user
- `pi` - Principal Investigator
- `institution` - Institution name
- `queue` - Scheduler queue
- `jobsize` - Job size category

## Display Options

### Dataset Types
- `timeseries` (default) - Time-based trending data
- `aggregate` - Summary/totals data

### Display Types
- `line` (default) - Line charts
- `bar` - Bar charts
- `pie` - Pie charts
- `scatter` - Scatter plots

### Combine Types
- `side` (default) - Side-by-side comparison
- `stack` - Stacked values
- `percent` - Percentage breakdown

### Log Scale
- `n` (default) - Linear scale
- `y` - Logarithmic scale

## Example Usage

### Monthly CPU Usage Trend
```typescript
get_chart_data({
  realm: "Jobs",
  group_by: "none",
  statistic: "total_cpu_hours",
  start_date: "2024-01-01",
  end_date: "2024-01-31",
  dataset_type: "timeseries"
})
```

### GPU Usage by Resource
```typescript
get_chart_data({
  realm: "SUPREMM",
  group_by: "resource",
  statistic: "gpu_time",
  start_date: "2024-01-01",
  end_date: "2024-01-31",
  dataset_type: "aggregate"
})
```

### Institution Utilization Comparison
```typescript
get_chart_data({
  realm: "Jobs",
  group_by: "institution",
  statistic: "utilization",
  start_date: "2024-01-01",
  end_date: "2024-03-31",
  limit: 10
})
```

This reference replaces the need for metadata discovery tools and provides all necessary information for effective chart generation.