# ACCESS-CI Events MCP Server

A Model Context Protocol server providing access to ACCESS-CI events data including workshops, webinars, and training sessions with comprehensive filtering capabilities.

## Features

### 🔧 Tools

- **`get_events`** - Get ACCESS-CI events with comprehensive filtering
- **`get_upcoming_events`** - Get upcoming events (today onward)
- **`search_events`** - Search events by keywords in title/description
- **`get_events_by_tag`** - Get events filtered by specific tags

### 📊 Resources

- **`accessci://events`** - All events data
- **`accessci://events/upcoming`** - Upcoming events only
- **`accessci://events/workshops`** - Workshop events only
- **`accessci://events/webinars`** - Webinar events only

## Installation

```bash
npm install -g @access-mcp/events
```

## Usage

### Claude Desktop Configuration

Add to your Claude Desktop configuration:

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

### Example Queries

**Get upcoming events:**

```
What events are coming up in the next week?
```

**Search for specific topics:**

```
Find upcoming Python workshops
```

**Filter by skill level:**

```
Show me beginner-level events this month
```

**Get events by tags:**

```
Find all machine learning events
```

## Filtering Capabilities

### Date Filtering

**Relative Dates (Dynamic):**

- `today` - Current date
- `+1week`, `+2week` - Future weeks
- `+1month`, `+2month` - Future months
- `+1year` - Future year
- `-1week`, `-1month` - Past periods

**Absolute Dates (Fixed):**

- `YYYY-MM-DD` format (e.g., "2024-08-30")
- `YYYY-MM-DD HH:MM:SS` format with time

**Mixed Filtering:**
You can combine relative and absolute dates in the same query.

### Faceted Search Filters

- **Event Type:** workshop, webinar, etc.
- **Event Affiliation:** Community, ACCESS, etc.
- **Skill Level:** beginner, intermediate, advanced
- **Event Tags:** python, big-data, machine-learning, gpu, etc.

## API Details

### Event Object Structure

Each event contains:

- `id` - Unique identifier
- `title` - Event title
- `description` - Event description
- `date` - Start date/time (ISO 8601)
- `date_1` - End date/time (ISO 8601)
- `location` - Event location
- `event_type` - Type of event
- `event_affiliation` - Organizational affiliation
- `custom_event_tags` - Comma-separated tags
- `skill_level` - Required skill level
- `speakers` - Event speakers
- `contact` - Contact information
- `registration` - Registration URL/info
- `created` - Creation timestamp
- `changed` - Last modified timestamp

### Enhanced Fields

The server adds these computed fields:

- `start_date` - Parsed start date object
- `end_date` - Parsed end date object
- `tags` - Tags split into array
- `duration_hours` - Calculated event duration
- `starts_in_hours` - Hours until event starts

## Examples

### Get Events with Multiple Filters

```typescript
// Get Python workshops for beginners in the next month
{
  "tool": "get_events",
  "arguments": {
    "beginning_date_relative": "today",
    "end_date_relative": "+1month",
    "event_type": "workshop",
    "skill_level": "beginner",
    "event_tags": "python"
  }
}
```

### Search Events

```typescript
// Search for GPU-related events
{
  "tool": "search_events",
  "arguments": {
    "query": "GPU computing",
    "beginning_date_relative": "today",
    "limit": 10
  }
}
```

### Get Events by Tag

```typescript
// Get all machine learning events this month
{
  "tool": "get_events_by_tag",
  "arguments": {
    "tag": "machine-learning",
    "time_range": "this_month",
    "limit": 20
  }
}
```

## Development

```bash
# Build the server
npm run build

# Run in development
npm run dev

# Test the server
npm test
```

## Base URL

The server connects to: `https://support.access-ci.org/api/2.0/events`

## Technical Notes

- All date comparisons use the event's start date (`date` field)
- Results include both upcoming and past events unless date filtered
- Faceted search filters use AND logic when combined
- Response times are typically under 5 seconds
- No pagination - all matching events are returned
- URL encoding is handled automatically for special characters
