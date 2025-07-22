# ACCESS-CI MCP Servers

Model Context Protocol (MCP) servers for ACCESS-CI APIs, providing structured access to affinity groups, events, and knowledge base resources.

## Architecture

This project uses a monorepo structure with shared utilities and individual MCP server packages:

- `packages/shared` - Base server class and common utilities
- `packages/affinity-groups` - MCP server for ACCESS-CI Affinity Groups API

## Quick Start

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run the affinity groups server
cd packages/affinity-groups
npm start
```

## Available Servers

### Affinity Groups Server

Provides access to ACCESS-CI Affinity Groups data through three main tools:

- `get_affinity_group` - Get basic information about an affinity group
- `get_affinity_group_events` - Get events and trainings for a group
- `get_affinity_group_kb` - Get knowledge base resources for a group

Example group ID: `bridges2.psc.access-ci.org`

## Adding New Servers

1. Create a new package in `packages/`
2. Extend the `BaseAccessServer` from `@access-mcp/shared`
3. Implement the required abstract methods
4. Add the new package to the workspace configuration

## Development

```bash
# Watch mode for development
npm run dev

# Lint code
npm run lint

# Format code
npm run format
```