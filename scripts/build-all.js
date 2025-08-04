#!/usr/bin/env node

import { execSync } from "child_process";
import { readdirSync, statSync } from "fs";
import { join } from "path";

console.log("🔨 Building all ACCESS-CI MCP servers...\n");

const packagesDir = "packages";
const packages = readdirSync(packagesDir).filter((dir) => {
  const path = join(packagesDir, dir);
  return statSync(path).isDirectory() && dir !== "shared";
});

// Build shared package first
console.log("📦 Building shared package...");
try {
  execSync("npm run build", {
    cwd: "packages/shared",
    stdio: "inherit",
  });
  console.log("✅ Shared package built successfully\n");
} catch (error) {
  console.error("❌ Failed to build shared package:", error.message);
  process.exit(1);
}

// Build other packages
for (const pkg of packages) {
  console.log(`📦 Building ${pkg}...`);
  try {
    execSync("npm run build", {
      cwd: join(packagesDir, pkg),
      stdio: "inherit",
    });
    console.log(`✅ ${pkg} built successfully\n`);
  } catch (error) {
    console.error(`❌ Failed to build ${pkg}:`, error.message);
    process.exit(1);
  }
}

console.log("🎉 All packages built successfully!");
