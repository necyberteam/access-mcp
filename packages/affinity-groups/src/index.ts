#!/usr/bin/env node

import { AffinityGroupsServer } from './server.js';
import { startWebServer } from './web-server.js';

async function main() {
  // Check if we should run as web server (for Railway deployment)
  const port = process.env.PORT;
  
  if (port) {
    // Running in web mode (Railway deployment)
    startWebServer(parseInt(port));
  } else {
    // Running in MCP mode (stdio)
    const server = new AffinityGroupsServer();
    await server.start();
  }
}

main().catch((error) => {
  // Log errors to a file instead of stderr to avoid interfering with JSON-RPC
  process.exit(1);
});