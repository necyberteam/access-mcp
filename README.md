# ACCESS-CI MCP Servers

Model Context Protocol (MCP) servers for ACCESS-CI APIs, enabling AI assistants to interact with cyberinfrastructure resources.

## Overview

This repository contains MCP servers that provide programmatic access to:

- **Compute Resources** - Hardware specifications and resource information
- **System Status** - Outages, maintenance, and announcements
- **Software Discovery** - Available software packages across resources
- **XDMoD Metrics** - Usage analytics, computational resource utilization, and NSF funding integration
- **Allocations** - Active research projects and resource allocation discovery
- **Affinity Groups** - Community groups, events, and knowledge base


## Quick Start

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
│   ├── compute-resources/   # Compute Resources API server
│   ├── system-status/       # System Status API server
│   ├── software-discovery/  # Software Discovery API server
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

Full documentation is available at [docs-site-url] and includes:

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

[Your license here]

## Links

- **Documentation**: [Full documentation site]
- **Issues**: [GitHub Issues](https://github.com/necyberteam/access-mcp/issues)
- **ACCESS-CI**: [https://access-ci.org](https://access-ci.org)
- **MCP Protocol**: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)
