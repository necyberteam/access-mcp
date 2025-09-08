#!/usr/bin/env node

import { EventsServer } from "./server.js";

async function main() {
  const server = new EventsServer();
  await server.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
