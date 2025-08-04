# ACCESS-CI MCP Packages Publishing Guide

This guide explains how to publish the ACCESS-CI MCP packages to npm.

## Prerequisites

1. **npm account**: Ensure you have an npm account with publish permissions
2. **npm login**: Run `npm login` to authenticate
3. **Build**: Ensure packages are built with `npm run build`
4. **Tests**: All tests should pass with `npm test`

## Package Structure

The project contains these publishable packages:

- `@access-mcp/shared` - Shared utilities (must be published first)
- `@access-mcp/affinity-groups` - Affinity Groups API server
- `@access-mcp/compute-resources` - Compute Resources API server
- `@access-mcp/system-status` - System Status API server
- `@access-mcp/software-discovery` - Software Discovery API server

## Publishing Process

### 1. Dry Run (Recommended First)

Test the publishing process without actually publishing:

```bash
npm run publish:dry
```

This will:

- Build all packages
- Run tests
- Validate package.json files
- Show what would be published

### 2. Live Publishing

When ready to publish:

```bash
npm run publish:packages
```

This will:

- Run all pre-publish checks
- Publish `@access-mcp/shared` first
- Wait for npm propagation
- Publish remaining packages

### 3. Version Management

To update versions before publishing:

```bash
# Patch version (0.1.0 -> 0.1.1)
npm run version:patch

# Minor version (0.1.0 -> 0.2.0)
npm run version:minor

# Major version (0.1.0 -> 1.0.0)
npm run version:major
```

## Manual Publishing

If you need to publish packages individually:

```bash
# Build first
npm run build

# Publish shared package first
cd packages/shared
npm publish

# Then publish other packages
cd ../affinity-groups
npm publish

# Repeat for other packages...
```

## Post-Publishing

1. **Verify on npmjs.com**: Check that packages appear correctly
2. **Test installation**: Try installing globally:
   ```bash
   npm install -g @access-mcp/affinity-groups
   access-mcp-affinity-groups --help
   ```
3. **Update documentation**: Update installation instructions in README files

## Troubleshooting

### Version conflicts

If you get version conflict errors, ensure `@access-mcp/shared` is published first and other packages reference the correct version.

### Permission errors

Ensure you're logged in to npm and have publish permissions for the `@access-mcp` scope.

### Build failures

Run `npm run build` manually to see detailed build errors.

## Package Metadata

Each package includes:

- Proper npm metadata (author, license, repository)
- Binary executables for CLI usage
- Keywords for discoverability
- Node.js version requirements (>=18.0.0)
- Pre-publish build hooks
