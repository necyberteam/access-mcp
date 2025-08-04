# @access-mcp/shared

Shared utilities and base classes for ACCESS-CI MCP servers.

## Overview

This package provides the common infrastructure used by all ACCESS-CI MCP servers:

- **BaseAccessServer**: Abstract base class for creating MCP servers
- **Error handling utilities**: Consistent error handling across servers
- **Type definitions**: Shared TypeScript types
- **API utilities**: Helper functions for API interactions

## Installation

```bash
npm install @access-mcp/shared
```

## Usage

```typescript
import { BaseAccessServer, handleApiError } from '@access-mcp/shared';

export class MyServer extends BaseAccessServer {
  constructor() {
    super('my-server', '1.0.0');
  }
  
  // Implement required abstract methods
}
```

## Features

- Automatic stdio transport setup
- Consistent error handling
- Built-in axios HTTP client with authentication support
- TypeScript support with full type definitions

## License

MIT