#!/usr/bin/env node

import { AllocationsServer } from "./server.js";

async function main() {
  // Check if we should run as HTTP server (for deployment)
  const port = process.env.PORT;

  const server = new AllocationsServer();
  
  if (port) {
    // Running in HTTP mode (deployment)
    await (server as any).start({ httpPort: parseInt(port) });
  } else {
    // Running in MCP mode (stdio)
    await server.start();
  }
}

main().catch((error) => {
  // Log errors to stderr and exit
  console.error("Server error:", error);
  process.exit(1);
});