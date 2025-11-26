# MCP server for ACCESS Support Announcements API

MCP server providing access to ACCESS support announcements, service updates, maintenance notices, and community communications. Stay informed about system changes, training opportunities, policy updates, and community events through the official ACCESS Support portal.

## Usage Examples

### **Recent Updates**

```
"Recent ACCESS announcements"
"Updates from past week"
"Latest community news"
"Announcements since January 2024"
```

### **System & Maintenance**

```
"GPU maintenance announcements"
"Delta maintenance notices"
"Bridges-2 system updates"
"Network-related announcements"
```

### **By Topic**

```
"Training workshops announced"
"Machine learning updates"
"Cloud computing announcements"
"Allocation proposal news"
"Python and PyTorch updates"
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

### search_announcements

Search and filter ACCESS support announcements with flexible filtering options.

**Parameters:**
- `tags` - Filter by topics (comma-separated). Examples: 'gpu,nvidia', 'machine-learning,ai', 'training,workshop'
- `ag` - Filter by system/community group. Examples: 'Anvil', 'ACCESS Support', 'DARWIN', 'Stampede-3'
- `relative_start_date` - Filter from relative date. Examples: 'today', '-1 week', '-1 month', '-1 year'
- `relative_end_date` - Filter to relative date. Examples: 'now', 'today', '-1 week', '+1 week'
- `start_date` - Filter from exact date (YYYY-MM-DD). Example: '2024-01-01'
- `end_date` - Filter to exact date (YYYY-MM-DD). Example: '2024-12-31'
- `limit` - Maximum results (default: 25). Automatically rounded to valid API page sizes (5, 10, 25, or 50)

**Usage Examples:**
```javascript
// Recent announcements
search_announcements({
  relative_start_date: "-1 month",
  limit: 10
})

// Topic-specific search - GPU announcements
search_announcements({
  tags: "gpu,nvidia",
  relative_start_date: "-1 year",
  limit: 25
})

// System-specific search - Anvil announcements
search_announcements({
  ag: "Anvil",
  relative_start_date: "-6 months",
  limit: 15
})

// Machine learning announcements
search_announcements({
  tags: "machine-learning,ai",
  relative_start_date: "-1 year",
  limit: 20
})

// Combined filters - recent announcements for ACCESS Support
search_announcements({
  ag: "ACCESS Support",
  tags: "maintenance",
  relative_start_date: "-3 months",
  limit: 10
})

// Exact date range search
search_announcements({
  tags: "training,professional-development",
  start_date: "2024-01-01",
  end_date: "2024-12-31",
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
**Version:** v0.2.0  
**Main:** `dist/index.js`
