#!/usr/bin/env node

import { SoftwareDiscoveryServer } from "./server.js";

const server = new SoftwareDiscoveryServer();
server.start().catch(console.error);
