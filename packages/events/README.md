# ACCESS-CI Events MCP Server

A Model Context Protocol server providing access to ACCESS-CI events data including workshops, webinars, and training sessions with comprehensive filtering capabilities.

## Features

### 🔧 Tools

- **`search_events`** - Comprehensive event search and filtering with native full-text search, date filters, topic/tag filtering, and more

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

## Usage Examples

### **Search & Discovery**

```
"Upcoming events next week"
"Python workshops"
"Machine learning events"
"Office hours this week"
```

### **Filtering**

```
"Beginner-level events this month"
"GPU computing events"
"Webinars in December"
"Advanced training sessions"
```

## Key Improvements

### 🚀 Enhanced Search (v2.1)

**Native API Full-Text Search:**
- Searches across titles, descriptions, speakers, tags, location, and event type
- Supports multi-word queries (e.g., "machine learning", "office hours")
- Much more comprehensive results than previous tag-only filtering
- Server-side indexing for better performance

**Search Examples:**
- `"python"` - Find Python programming events
- `"machine learning"` - Find ML-related content in any field
- `"gpu computing"` - Find GPU-related events
- `"office hours"` - Find all office hours sessions

### 🌍 Timezone Support (v2.1)

**Smart Timezone Handling:**
- All timestamps returned in UTC (ISO 8601 format with Z suffix)
- Timezone parameter controls relative date calculations
- Common timezone examples: `America/New_York`, `Europe/London`, `Asia/Tokyo`
- Default: UTC calculations

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

## Tool Reference

### search_events

Comprehensive event search and filtering with native full-text search, date filters, and topic/tag filtering.

**Parameters:**
- `query` (string, optional): Search titles, descriptions, speakers, and tags
- `type` (string, optional): Filter by event type (workshop, webinar, training)
- `tags` (string, optional): Filter by tags (python, gpu, hpc, ml)
- `date` (string, optional): Filter by time period. Valid values: `today`, `upcoming`, `past`, `this_week`, `this_month`
- `skill` (string, optional): Filter by skill level. Valid values: `beginner`, `intermediate`, `advanced`
- `limit` (number, optional): Maximum results (default: 50, automatically rounded to API page sizes: 25, 50, 75, or 100)

## Usage Examples

### Full-Text Search

```javascript
// Upcoming Python events
search_events({
  query: "python",
  date: "upcoming",
  limit: 10
})

// Machine learning workshops this month
search_events({
  query: "machine learning",
  date: "this_month",
  type: "workshop",
  limit: 25
})

// Past office hours
search_events({
  query: "office hours",
  date: "past",
  limit: 30
})
```

### Filter by Tags and Type

```javascript
// All upcoming GPU events
search_events({
  tags: "gpu",
  date: "upcoming",
  limit: 20
})

// Beginner training sessions
search_events({
  type: "training",
  skill: "beginner",
  date: "upcoming",
  limit: 15
})

// Python workshops for beginners
search_events({
  date: "this_month",
  type: "workshop",
  skill: "beginner",
  tags: "python",
  limit: 25
})
```

### Timezone-Aware Searches

```javascript
// Get events in New York timezone
search_events({
  beginning_date_relative: "today",
  end_date_relative: "+1week",
  timezone: "America/New_York",
  limit: 30
})

// Get events in Europe/London timezone
search_events({
  query: "workshop",
  beginning_date_relative: "today",
  timezone: "Europe/London",
  limit: 25
})
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

The server connects to: `https://support.access-ci.org/api/2.2/events`

## Technical Notes

### API Version 2.2 Features
- **UTC timestamps**: All dates returned in UTC with Z suffix (e.g., `2024-08-30T13:00:00Z`)
- **Native search**: Uses `search_api_fulltext` parameter for comprehensive searching
- **Timezone support**: Relative dates calculated using specified timezone
- **Pagination**: API accepts specific page sizes (25, 50, 75, or 100). Requested limits are automatically rounded to nearest valid size.
- **Enhanced metadata**: Responses include API version and timezone info

### General
- All date comparisons use the event's start date (`date` field)
- Results include both upcoming and past events unless date filtered
- Faceted search filters use AND logic when combined
- Response times are typically under 5 seconds
- No pagination - all matching events are returned
- URL encoding is handled automatically for special characters
