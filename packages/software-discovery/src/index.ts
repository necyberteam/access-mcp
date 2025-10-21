#!/usr/bin/env node

import { SoftwareDiscoveryServer } from "./server.js";

async function main() {
  const server = new SoftwareDiscoveryServer();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
  await server.start(port ? { httpPort: port } : undefined);
}

main().catch((error) => {
  // Log errors to a file instead of stderr to avoid interfering with JSON-RPC
  process.exit(1);
});
