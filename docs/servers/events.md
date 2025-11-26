# ACCESS-CI Events MCP Server - Get information about workshops, webinars, and training events

A Model Context Protocol server providing access to ACCESS-CI events data including workshops, webinars, and training sessions with comprehensive filtering capabilities.

## Usage Examples

<!-- TODO: Extract examples from server code -->

## Installation

```bash
npm install -g @access-mcp/events
```

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "events": {
      "command": "npx",
      "args": ["@access-mcp/events"]
    }
  }
}
```

## Features

### 🔧 Tools

- **`search_events`** - Comprehensive event search and filtering with native full-text search, date filters, topic/tag filtering, and more

### 📊 Resources

- **`accessci://events`** - All events data
- **`accessci://events/upcoming`** - Upcoming events only
- **`accessci://events/workshops`** - Workshop events only
- **`accessci://events/webinars`** - Webinar events only

---

**Package:** `@access-mcp/events`  
**Version:** v0.3.0  
**Main:** `dist/index.js`
