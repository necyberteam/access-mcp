#!/usr/bin/env node

import { SoftwareDiscoveryServer } from "./server.js";

async function main() {
  // Check if we should run as HTTP server (for deployment)
  const port = process.env.PORT;

  const server = new SoftwareDiscoveryServer();
  
  if (port) {
    // Running in HTTP mode (deployment)
    await server.start({ httpPort: parseInt(port) });
  } else {
    // Running in MCP mode (stdio)
    await server.start();
  }
}

main().catch((error) => {
  // Log errors to a file instead of stderr to avoid interfering with JSON-RPC
  process.exit(1);
});
