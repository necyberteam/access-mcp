# ACCESS-CI MCP Servers

Model Context Protocol (MCP) servers for ACCESS-CI APIs, enabling AI assistants to interact with cyberinfrastructure resources.

## Overview

This repository contains MCP servers that provide programmatic access to:

- **Announcements** - Community news, training opportunities, and ACCESS support announcements
- **Compute Resources** - Hardware specifications and resource information
- **System Status** - Outages, maintenance, and announcements
- **Software Discovery** - Available software packages across resources
- **Events** - Workshops, webinars, training events, and office hours
- **XDMoD Metrics** - Usage analytics, computational resource utilization, and NSF funding integration
- **Allocations** - Active research projects and resource allocation discovery
- **Affinity Groups** - Community groups, events, and knowledge base

## Quick Start

### Try It Now (Hosted Servers)

Connect Claude Desktop to our hosted MCP servers. Add this to your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "access-compute-resources": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3002/sse"]
    },
    "access-system-status": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3003/sse"]
    },
    "access-software-discovery": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3004/sse"]
    },
    "access-xdmod": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3005/sse"]
    },
    "access-allocations": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3006/sse"]
    },
    "access-nsf-awards": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3007/sse"]
    },
    "access-xdmod-data": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3008/sse"]
    },
    "access-announcements": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3009/sse"]
    },
    "access-events": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3010/sse"]
    },
    "access-affinity-groups": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3011/sse"]
    }
  }
}
```

Restart Claude Desktop and ask: *"What GPU resources are available on ACCESS-CI?"*

### Install Locally (npm)

Install individual MCP servers to run locally:

```bash
# Install specific servers
npm install -g @access-mcp/announcements
npm install -g @access-mcp/events
npm install -g @access-mcp/compute-resources
npm install -g @access-mcp/system-status
npm install -g @access-mcp/software-discovery
npm install -g @access-mcp/xdmod-metrics
npm install -g @access-mcp/allocations
npm install -g @access-mcp/affinity-groups

# Or install all at once
npm install -g @access-mcp/announcements @access-mcp/events @access-mcp/compute-resources @access-mcp/system-status @access-mcp/software-discovery @access-mcp/xdmod-metrics @access-mcp/allocations @access-mcp/affinity-groups
```

### For Developers

```bash
# Clone and install
git clone <repository-url>
cd access_mcp
npm install

# Build all packages
npm run build

# Run tests
npm test

# Create release bundle
npm run release
```

## Project Structure

```
access_mcp/
├── packages/
│   ├── shared/              # Shared base classes and utilities
│   ├── announcements/       # ACCESS Support Announcements API server
│   ├── compute-resources/   # Compute Resources API server
│   ├── system-status/       # System Status API server
│   ├── software-discovery/  # Software Discovery API server
│   ├── events/              # Events API server (workshops, training)
│   ├── xdmod-metrics/       # XDMoD Usage Analytics and NSF integration
│   ├── allocations/         # Research Allocations API server
│   └── affinity-groups/     # Affinity Groups API server
├── docs/                    # Documentation site (deployed to Netlify)
├── examples/                # Usage examples and configurations
├── scripts/                 # Build and automation scripts
└── vitest.config.ts         # Test configuration
```

## Development

### Prerequisites

- Node.js 18+
- npm

### Key Commands

- `npm run build` - Build all TypeScript packages
- `npm run dev` - Watch mode for development
- `npm test` - Run test suite
- `npm run bundle` - Create standalone executables
- `npm run release` - Create release package

### Testing MCP Servers

Use the MCP Inspector for interactive testing:

```bash
# Test any server
npx @modelcontextprotocol/inspector packages/announcements/dist/index.js
npx @modelcontextprotocol/inspector packages/events/dist/index.js
npx @modelcontextprotocol/inspector packages/xdmod-metrics/dist/index.js
npx @modelcontextprotocol/inspector packages/allocations/dist/index.js
npx @modelcontextprotocol/inspector packages/affinity-groups/dist/index.js
```

### Adding New Servers

1. Create new package in `packages/`
2. Extend `BaseAccessServer` from `@access-mcp/shared`
3. Implement required methods (see existing servers for examples)
4. Add to `tsconfig.json` references
5. Update documentation

## Documentation

Full documentation is available at [https://access-mcp.netlify.app](https://access-mcp.netlify.app) and includes:

- Installation guides for end users and developers
- API reference for each server
- Claude Desktop configuration examples
- Troubleshooting and FAQs

To work on documentation:

```bash
cd docs
npm run dev    # Start development server
npm run build  # Build for production
```

## Docker Deployment

Pre-built Docker images are available from GitHub Container Registry:

```bash
# Pull and run with Docker Compose
curl -o docker-compose.yml https://raw.githubusercontent.com/necyberteam/access-mcp/main/docker-compose.prod.yml

# Create .env file with your configuration
cat > .env << 'EOF'
GITHUB_REPOSITORY=necyberteam/access-mcp
SDS_API_KEY=your-key
XDMOD_API_TOKEN=your-token
ACCESS_MCP_SERVICES=nsf-awards=http://mcp-nsf-awards:3000
EOF

# Start services
docker compose pull && docker compose up -d
```

Images are automatically built and pushed on every commit to `main`. See [Getting Started](https://access-mcp.netlify.app/getting-started.html#docker-deployment-advanced) for full deployment instructions.

## Release Process

Releases include both npm packages and standalone executables:

```bash
# Create release bundle
npm run release

# Output:
# - release/access-mcp-servers-vX.X.X.zip (standalone executables)
# - Individual packages ready for npm publish
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- **Documentation**: [https://access-mcp.netlify.app](https://access-mcp.netlify.app)
- **Issues**: [GitHub Issues](https://github.com/necyberteam/access-mcp/issues)
- **ACCESS-CI**: [https://access-ci.org](https://access-ci.org)
- **MCP Protocol**: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)
