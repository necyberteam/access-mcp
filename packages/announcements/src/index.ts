#!/usr/bin/env node

import { AnnouncementsServer } from "./server.js";

async function main() {
  // Check if we should run as HTTP server (for deployment)
  const port = process.env.PORT;

  const server = new AnnouncementsServer();
  
  if (port) {
    // Running in HTTP mode (deployment)
    await server.start({ httpPort: parseInt(port) });
    // Keep the process running in HTTP mode
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      process.exit(0);
    });
    // Keep the event loop alive
    setInterval(() => {}, 1000 * 60 * 60); // Heartbeat every hour
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