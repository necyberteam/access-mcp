#!/usr/bin/env node

import { AffinityGroupsServer } from './server.js';

async function main() {
  const server = new AffinityGroupsServer();
  await server.start();
}

main().catch((error) => {
  // Log errors to a file instead of stderr to avoid interfering with JSON-RPC
  process.exit(1);
});