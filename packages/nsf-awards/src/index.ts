#!/usr/bin/env node

import { NSFAwardsServer } from "./server.js";

async function main() {
  const server = new NSFAwardsServer();
  
  // Check if we should run as HTTP server (for deployment)
  const port = process.env.PORT || process.env.ACCESS_MCP_NSF_HTTP_PORT;
  
  if (port) {
    // Running in HTTP mode (deployment)
    await server.start({ httpPort: parseInt(port, 10) });
  } else {
    // Running in MCP mode (stdio)
    await server.start();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}