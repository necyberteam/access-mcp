#!/usr/bin/env node

import { AllocationsServer } from "./server.js";

async function main() {
  // Running in MCP mode (stdio)
  const server = new AllocationsServer();
  await server.start();
}

main().catch((error) => {
  // Log errors to stderr and exit
  console.error("Server error:", error);
  process.exit(1);
});