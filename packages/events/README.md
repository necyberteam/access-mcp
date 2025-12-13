# ACCESS-CI Events MCP Server

MCP server for ACCESS-CI events including workshops, webinars, and training sessions.

## Usage Examples

### Search & Discovery
```
"Upcoming ACCESS events"
"Python workshops"
"Machine learning training"
"Office hours this week"
```

### Filtering
```
"Beginner events this month"
"GPU computing workshops"
"Advanced training sessions"
```

## Tools

### `search_events`

Search and filter ACCESS-CI events.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search titles, descriptions, speakers, tags |
| `type` | string | Filter: `workshop`, `webinar`, `training` |
| `tags` | string | Filter: `python`, `gpu`, `hpc`, `ml` |
| `date` | enum | Time period: `today`, `upcoming`, `past`, `this_week`, `this_month` |
| `skill` | enum | Skill level: `beginner`, `intermediate`, `advanced` |
| `limit` | number | Max results (default: 50) |

**Examples:**
```javascript
// Upcoming Python events
search_events({ query: "python", date: "upcoming", limit: 10 })

// Machine learning workshops this month
search_events({ query: "machine learning", date: "this_month", type: "workshop" })

// Beginner GPU training
search_events({ tags: "gpu", skill: "beginner", date: "upcoming" })
```

## Installation

```bash
npm install -g @access-mcp/events
```

## Configuration

```json
{
  "mcpServers": {
    "access-events": {
      "command": "npx",
      "args": ["@access-mcp/events"]
    }
  }
}
```

## Resources

- `accessci://events` - All events data
- `accessci://events/upcoming` - Upcoming events
- `accessci://events/workshops` - Workshop events
- `accessci://events/webinars` - Webinar events
