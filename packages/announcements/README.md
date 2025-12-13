# ACCESS Support Announcements MCP Server

MCP server for ACCESS support announcements, service updates, maintenance notices, and community communications.

## Usage Examples

### Recent Updates
```
"Recent ACCESS announcements"
"Updates from the past week"
"Latest community news"
```

### System & Maintenance
```
"GPU maintenance announcements"
"HPC system updates"
"Network announcements"
```

### By Topic
```
"Training workshop announcements"
"Machine learning updates"
"Allocation proposal news"
```

## Tools

### `search_announcements`

Search and filter ACCESS support announcements.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `tags` | string | Filter by topics (e.g., "gpu", "machine-learning", "training") |
| `date` | enum | Time period: `today`, `this_week`, `this_month`, `past` |
| `limit` | number | Max results (default: 25). Rounded to API page sizes: 5, 10, 25, or 50 |

**Examples:**
```javascript
// Recent announcements
search_announcements({ limit: 10 })

// GPU announcements from the past month
search_announcements({ tags: "gpu", date: "this_month" })

// Training announcements
search_announcements({ tags: "training", date: "past", limit: 25 })
```

## Installation

```bash
npm install -g @access-mcp/announcements
```

## Configuration

```json
{
  "mcpServers": {
    "access-announcements": {
      "command": "npx",
      "args": ["@access-mcp/announcements"]
    }
  }
}
```

## Resources

- `accessci://announcements` - Recent announcements (10 most recent)
