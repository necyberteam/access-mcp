# MCP server for ACCESS Support Announcements API

MCP server providing access to ACCESS support announcements, service updates, maintenance notices, and community communications. Stay informed about system changes, training opportunities, policy updates, and community events through the official ACCESS Support portal.

## Usage Examples

### **Stay Updated on Recent Activity**

```
"What's new with ACCESS?"
"Show me recent announcements"
"Any updates from ACCESS Support this week?"
"What are the latest community announcements?"
```

### **Monitor System Maintenance & Issues**

```
"Are there any GPU maintenance announcements?"
"Show me maintenance notices for DELTA"
"What system updates have been posted recently?"
"Any announcements about Bridges-2 issues?"
"Tell me about network-related announcements"
```

### **Find Training & Educational Content**

```
"Are there any training workshops announced?"
"Show me machine learning training announcements"
"What professional development opportunities are available?"
"Any upcoming webinars or educational events?"
```

### **Track Specific Systems or Communities**

```
"Show me all announcements about Anvil"
"What updates are there for the CSSN community?"
"Any news from the Open OnDemand team?"
"Show me Pegasus-related announcements"
```

### **Search by Topic or Technology**

```
"Find announcements about cloud computing"
"Show me AI and machine learning updates"
"Any announcements about allocation proposals?"
"What's new with data science resources?"
"Find announcements about Python or PyTorch"
```

### **Time-Based Searches**

```
"Show me announcements from the past month"
"What was announced last week?"
"Find announcements since January 1st, 2024"
"Show me announcements from the past 6 months"
```


## Installation

```bash
npm install -g @access-mcp/announcements
```

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "announcements": {
      "command": "npx",
      "args": ["@access-mcp/announcements"]
    }
  }
}
```

## Tools

### get_announcements

Search ACCESS support announcements with comprehensive filtering options.

**Parameters:**
- `tags` - Filter by topics (comma-separated). Examples: 'gpu,nvidia', 'machine-learning,ai', 'training,workshop'
- `ag` - Filter by system/community group. Examples: 'DELTA', 'Anvil', 'ACCESS Support', 'CSSN (Computational Science Support Network)'
- `relative_start_date` - Filter from relative date. Examples: 'today', '-1 week', '-1 month', '-3 months'
- `relative_end_date` - Filter to relative date. Examples: 'now', 'today', '-1 week', '+1 week'
- `start_date` - Filter from exact date (YYYY-MM-DD). Example: '2024-01-01'
- `end_date` - Filter to exact date (YYYY-MM-DD). Example: '2024-12-31'
- `limit` - Maximum results (default: 20)

**Usage Examples:**
```javascript
// Recent GPU-related announcements
get_announcements({
  tags: "gpu,nvidia",
  relative_start_date: "-1 month",
  limit: 10
})

// DELTA system announcements from this year
get_announcements({
  ag: "DELTA",
  start_date: "2024-01-01",
  limit: 15
})

// Training announcements from the past 3 months
get_announcements({
  tags: "training,professional-development",
  relative_start_date: "-3 months",
  limit: 20
})
```

### get_announcements_by_tags

Find announcements about specific topics or systems.

**Parameters:**
- `tags` (required) - Specific topics (comma-separated). Examples: 'gpu,nvidia', 'data-science,python', 'cloud-computing'
- `limit` - Maximum results (default: 10)

**Usage Examples:**
```javascript
// Machine learning and AI announcements
get_announcements_by_tags({
  tags: "machine-learning,ai,deep-learning",
  limit: 15
})

// Cloud computing updates
get_announcements_by_tags({
  tags: "cloud-computing,openstack",
  limit: 10
})
```

### get_announcements_by_affinity_group

Get announcements for specific ACCESS systems or community groups.

**Parameters:**
- `ag` (required) - System or community name. Examples: 'DELTA', 'Anvil', 'Bridges-2', 'ACCESS Support', 'Open OnDemand'
- `limit` - Maximum results (default: 10)

**Usage Examples:**
```javascript
// All DELTA-related announcements
get_announcements_by_affinity_group({
  ag: "DELTA",
  limit: 20
})

// Open OnDemand community updates
get_announcements_by_affinity_group({
  ag: "Open OnDemand",
  limit: 10
})
```

### get_recent_announcements

Get the latest announcements from a recent time period.

**Parameters:**
- `period` - Time period to look back. Examples: '1 week', '2 weeks', '1 month', '3 months' (default: '1 month')
- `limit` - Maximum results (default: 10)

**Usage Examples:**
```javascript
// Past week's announcements
get_recent_announcements({
  period: "1 week",
  limit: 15
})

// Past 3 months overview
get_recent_announcements({
  period: "3 months",
  limit: 25
})
```

## Popular Tags

Based on real ACCESS support announcements, here are commonly used tags:

**Systems & Resources:**
- `gpu`, `nvidia`, `anvil`, `delta`, `bridges-2`, `stampede2`, `stampede3`
- `cloud-computing`, `openstack`, `kubernetes`, `containers`

**Technologies:**
- `machine-learning`, `ai`, `deep-learning`, `python`, `pytorch`
- `data-science`, `bioinformatics`, `molecular-dynamics`
- `mpi`, `openmp`, `cuda`, `singularity`

**Activities & Services:**
- `training`, `professional-development`, `workshop`
- `allocations-proposal`, `allocation-users`, `allocation-management`
- `data-transfer`, `storage`, `file-system`

**Topics:**
- `maintenance`, `performance-tuning`, `job-submission`
- `security`, `networking`, `hpc-operations`
- `documentation`, `community-outreach`

## Common Affinity Groups

**ACCESS Systems:**
- `ACCESS Support`, `DELTA`, `Anvil`, `Bridges-2`, `DARWIN`
- `Stampede2`, `stampede3`, `osg`

**Community Groups:**
- `CSSN (Computational Science Support Network)`
- `Open OnDemand`, `Pegasus`
- `ACCESS Allocations`

## Response Format

All tools return enhanced JSON responses with:

```json
{
  "total_announcements": 42,
  "filtered_announcements": 10,
  "announcements": [
    {
      "title": "Scheduled Maintenance: DELTA GPU Nodes",
      "body": "DELTA GPU nodes will undergo maintenance...",
      "date": "2024-03-15",
      "formatted_date": "March 15, 2024",
      "author": "ACCESS Support",
      "tags": ["maintenance", "gpu", "delta"],
      "affinity_groups": ["DELTA"],
      "body_preview": "DELTA GPU nodes will undergo maintenance from 9 AM to 5 PM..."
    }
  ],
  "popular_tags": ["gpu", "maintenance", "delta"],
  "filters_applied": {
    "tags": "gpu,maintenance",
    "date_range": "-1 month to now"
  }
}
```

---

**Package:** `@access-mcp/announcements`  
**Version:** v0.1.1  
**Main:** `dist/index.js`
