# XDMoD MCP Servers Troubleshooting Guide

This guide documents critical issues discovered during comprehensive testing of both XDMoD MCP servers and provides specific workarounds and solutions for AI assistants.

## Critical Issues Summary

Based on extensive testing, both XDMoD servers have significant issues that AI assistants must be aware of:

### XDMoD Python Server Issues ⚠️
- **DataFrame Processing Errors**: Multiple methods fail with "The truth value of a DataFrame is ambiguous"
- **Massive Response Sizes**: Some methods return 100k+ character responses, ignoring limit parameters
- **Performance Problems**: Person discovery methods are extremely slow and resource-intensive

### XDMoD TypeScript Server Issues ⚠️
- **Broken Statistics Method**: `get_statistics` consistently returns 0 results for basic dimensions
- **Authentication Session Expiration**: Tokens expire during long operations
- **Parameter Validation**: Chart data methods fail with invalid parameter combinations

## Python Server Critical Issues

### 1. DataFrame Processing Errors

**Symptoms:**
```
DataFrameError: The truth value of a DataFrame is ambiguous. Use a.empty, a.bool(), a.item(), a.any() or a.all()
```

**Affected Methods:**
- `discover_person_ids`
- `lookup_person_id` 
- `get_user_data_python`
- `get_chart_data`

**Root Cause:** Improper DataFrame boolean evaluation in conditional statements

**Workaround for AI Assistants:**
1. **Always expect fallback data**: These methods often return hardcoded sample data when DataFrame processing fails
2. **Use TypeScript server instead**: For reliable data access, switch to the TypeScript server
3. **Limit usage**: Only use Python server for specific user discovery when absolutely necessary

**Example Safe Usage:**
```
"Find users in XDMoD, but if the Python server has DataFrame errors, use the TypeScript server instead"
```

### 2. Massive Response Size Problem

**Symptoms:**
- `discover_person_ids`: Returns 100k+ characters ignoring limit parameter
- `lookup_person_id`: Similar massive responses
- Claude Desktop becomes unresponsive due to large data transfers

**Emergency Response for AI Assistants:**
1. **Never use these methods without explicit warning**
2. **Always warn users**: "This may return very large responses"
3. **Suggest alternatives**: Use TypeScript server filtering instead
4. **Set expectations**: "This may take 30+ seconds and return massive amounts of data"

**Safe Alternative Pattern:**
```
"Instead of using Python server person discovery, let me use the TypeScript server with person filtering for better performance"
```

### 3. Hardcoded Fallback Data Issue

**Problem:** When DataFrame processing fails, methods return hardcoded sample data that appears real but isn't current:
- Sample user: "Pasquale" with fake data from 2023
- Fixed CPU hours: 1234.56
- Fake job counts and resource usage

**AI Assistant Response:**
1. **Always verify data authenticity**: Ask "This data looks suspicious - let me verify with the TypeScript server"
2. **Cross-reference**: Compare Python server results with TypeScript server data
3. **Warn users**: Mention that Python server data may be sample/fallback data

## TypeScript Server Critical Issues

### 1. get_statistics Method Broken

**Symptoms:**
```json
{
  "total_statistics": 0,
  "statistics": []
}
```

**Affected Dimensions:**
- `Jobs_none` (basic Jobs realm)
- Most standard dimension/statistic combinations

**Root Cause:** API endpoint or parameter formatting issues

**Workaround for AI Assistants:**
1. **Skip get_statistics entirely**: Don't rely on this method for dimension exploration
2. **Use known working statistics**: Reference the documentation for available statistics
3. **Direct to get_chart_data**: Go straight to chart data with known statistic names

**Known Working Statistics:**
```
Jobs realm: total_cpu_hours, job_count, avg_cpu_hours, total_waitduration_hours
SUPREMM realm: gpu_time, wall_time, avg_percent_gpu_usage
```

**Safe Pattern:**
```typescript
// Instead of get_statistics, use direct chart data calls
await get_chart_data({
  realm: "Jobs",
  group_by: "none", 
  statistic: "total_cpu_hours",  // Use known working statistic
  start_date: "2024-01-01",
  end_date: "2024-01-31"
});
```

### 2. Authentication Session Management

**Symptoms:**
- "Session expired" errors during operations
- Authentication works initially then fails
- Inconsistent behavior across multiple tool calls

**AI Assistant Response:**
1. **Test auth status first**: Always run `debug_auth_status` before complex operations
2. **Expect session timeouts**: Warn users that long operations may require re-authentication
3. **Use public data when possible**: Many queries work without authentication

### 3. Chart Data Parameter Validation Issues

**Symptoms:**
- "Invalid parameter combination" errors
- Methods fail with seemingly correct parameters
- Inconsistent parameter requirements

**Safe Parameter Patterns:**
```typescript
// Basic timeseries (ALWAYS WORKS)
{
  realm: "Jobs",
  group_by: "none",
  statistic: "total_cpu_hours", 
  start_date: "2024-01-01",
  end_date: "2024-01-31",
  dataset_type: "timeseries"
}

// GPU data (USE SUPREMM REALM)
{
  realm: "SUPREMM",
  group_by: "resource",
  statistic: "gpu_time",
  start_date: "2024-01-01", 
  end_date: "2024-01-31"
}
```

## Emergency Fallback Strategies

### When Python Server Fails Completely
```
"The Python server is experiencing DataFrame processing issues. Let me use the TypeScript server instead for reliable data access."
```

### When TypeScript get_statistics Fails
```
"The statistics discovery method isn't working properly. Let me use known working statistics from the documentation instead."
```

### When Both Servers Have Issues
```
"Both XDMoD servers are experiencing technical difficulties. Let me try the most basic operations first and provide portal links for manual verification."
```

## AI Assistant Best Practices

### 1. Defensive Programming
- **Always expect failures**: Both servers have critical issues
- **Provide fallback options**: Have backup plans for every operation
- **Set user expectations**: Warn about potential issues upfront

### 2. Error Communication
```
❌ DON'T SAY: "Let me get your data from XDMoD"
✅ DO SAY: "Let me try to get your data from XDMoD - the servers have some known issues, so I may need to try different approaches"
```

### 3. Server Selection Strategy

**Use Python Server ONLY for:**
- Specific user name searches (with warnings about large responses)
- When TypeScript server absolutely cannot handle the query

**Use TypeScript Server for:**
- All chart generation and visualization
- Reliable data access with known parameters
- Any operation requiring stability

### 4. User Communication Templates

**Starting Operations:**
```
"I'm accessing XDMoD data for you. Note that the servers have some known performance issues, so this may take a moment and I might need to try different approaches."
```

**When Encountering DataFrame Errors:**
```
"The Python server is having DataFrame processing issues (a known problem). Let me switch to the TypeScript server for more reliable results."
```

**When Methods Return Massive Data:**
```
"This method returned an unusually large amount of data (100k+ characters). This is a known issue with the Python server. Let me try a different approach or use the TypeScript server instead."
```

**When Statistics Method Fails:**
```
"The statistics discovery method has a known bug returning 0 results. I'll use the documented available statistics instead."
```

## Technical Details for Developers

### Python Server DataFrame Error Stack Traces
```
File "/packages/xdmod-python/src/xdmod_python/server.py", line 234, in discover_person_ids
    if filtered_df:
ValueError: The truth value of a DataFrame is ambiguous
```

**Fix Required:** Replace DataFrame boolean evaluation:
```python
# WRONG
if filtered_df:
    
# CORRECT  
if not filtered_df.empty:
```

### TypeScript Server API Issues
- `get_statistics` endpoint appears to have parameter formatting issues
- Session management needs improvement for long-running operations
- Parameter validation is inconsistent across methods

## Testing Recommendations

When testing these servers:

1. **Test with limits**: Always verify that limit parameters are respected
2. **Monitor response sizes**: Watch for unexpectedly large responses  
3. **Test DataFrame operations**: Specifically test person discovery methods
4. **Verify statistics method**: Check if get_statistics returns actual results
5. **Test authentication persistence**: Verify sessions don't expire during operations

## Quick Reference: Working vs Broken

### ✅ Known Working Operations
- TypeScript `get_dimensions`
- TypeScript `get_chart_data` with basic parameters
- TypeScript `get_chart_image` for visualization
- TypeScript `get_chart_link` for portal access
- Python `debug_python_auth` (usually works)

### ❌ Known Broken Operations  
- Python `discover_person_ids` (DataFrame errors + massive responses)
- Python `lookup_person_id` (DataFrame errors + massive responses)
- TypeScript `get_statistics` (returns 0 results)
- Python data framework methods (DataFrame processing issues)

### ⚠️ Unreliable Operations
- Python `get_user_data_python` (may return hardcoded data)
- Python `get_chart_data` (DataFrame processing issues)
- Any operation requiring sustained authentication

This troubleshooting guide should be referenced whenever working with XDMoD servers to ensure AI assistants can provide reliable service despite the underlying technical issues.