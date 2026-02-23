#!/usr/bin/env node

import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const docsDir = join(rootDir, "docs");

console.log("📚 Generating VitePress documentation from MCP servers...\n");

/**
 * Extract MCP server metadata from built server classes and package info
 */
async function extractServerMetadata(packageName) {
  try {
    const packagePath = join(rootDir, "packages", packageName);
    let metadata = {};

    // Try to read package.json first (Node.js projects)
    try {
      const pkgJsonPath = join(packagePath, "package.json");
      const packageJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
      metadata = {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        main: packageJson.main,
        bin: packageJson.bin,
      };
    } catch (err) {
      // Try pyproject.toml (Python projects)
      try {
        const pyprojectPath = join(packagePath, "pyproject.toml");
        const pyprojectContent = readFileSync(pyprojectPath, "utf-8");

        // Basic TOML parsing for our needs
        const nameMatch = pyprojectContent.match(/name = "(.+?)"/);
        const versionMatch = pyprojectContent.match(/version = "(.+?)"/);
        const descriptionMatch = pyprojectContent.match(/description = "(.+?)"/);

        metadata = {
          name: nameMatch ? nameMatch[1] : `@access-mcp/${packageName}`,
          version: versionMatch ? versionMatch[1] : "0.1.0",
          description: descriptionMatch ? descriptionMatch[1] : `MCP server for ${packageName}`,
          main: "src/server.py",
          bin: {
            [nameMatch ? nameMatch[1] : packageName]: nameMatch ? nameMatch[1] : packageName,
          },
        };
      } catch (err2) {
        throw new Error(`No package.json or pyproject.toml found for ${packageName}`);
      }
    }

    // Read README for additional details
    let readmeContent = "";
    try {
      const readmePath = join(packagePath, "README.md");
      readmeContent = readFileSync(readmePath, "utf-8");
    } catch (err) {
      // README doesn't exist, that's ok
    }

    return {
      id: packageName,
      ...metadata,
      readme: readmeContent,
    };
  } catch (error) {
    console.warn(`⚠️  Could not extract metadata for ${packageName}:`, error.message);
    return null;
  }
}

/**
 * Generate VitePress server overview page
 */
function generateServersOverview(servers) {
  return `# MCP Servers Overview

ACCESS-CI provides ${servers.length} MCP servers for different aspects of cyberinfrastructure:

${servers
  .map(
    (server) => `
## ${server.description}

**Package:** \`${server.name}\`
**Version:** v${server.version}

[View Details](/servers/${server.id})
`
  )
  .join("")}

[Get Started →](/getting-started)
`;
}

/**
 * Generate individual server documentation page from README
 */
function generateServerPage(server) {
  let content = server.readme || "";

  // If no README, generate a basic page
  if (!content) {
    return `# ${server.description || server.name}

${server.description}

---

**Package:** \`${server.name}\`
**Version:** v${server.version}
**Main:** \`${server.main}\`
`;
  }

  // Use the README content as-is, just add package metadata at the end
  // Remove any trailing whitespace
  content = content.trim();

  // Add package metadata footer
  content += `

---

**Package:** \`${server.name}\`
**Version:** v${server.version}
**Main:** \`${server.main}\`
`;

  return content;
}

// Main execution
async function main() {
  const servers = [];
  const serverPackages = [
    "affinity-groups",
    "allocations",
    "announcements",
    "compute-resources",
    "events",
    "nsf-awards",
    "software-discovery",
    "system-status",
    "xdmod",
    "xdmod-mcp-data",
  ];

  // Extract metadata from all server packages
  for (const packageName of serverPackages) {
    const metadata = await extractServerMetadata(packageName);
    if (metadata) {
      servers.push(metadata);
      console.log(`✅ Extracted metadata for ${metadata.name}`);
    }
  }

  // Ensure docs directories exist
  const serversDir = join(docsDir, "servers");
  try {
    mkdirSync(serversDir, { recursive: true });
  } catch (err) {
    // Directory already exists
  }

  // Generate servers overview page
  const serversOverview = generateServersOverview(servers);
  writeFileSync(join(serversDir, "index.md"), serversOverview);
  console.log("✅ Generated /servers/index.md");

  // Generate individual server pages
  for (const server of servers) {
    const serverPage = generateServerPage(server);
    writeFileSync(join(serversDir, `${server.id}.md`), serverPage);
    console.log(`✅ Generated /servers/${server.id}.md`);
  }

  // Update the existing data file for compatibility
  const serversDataPath = join(docsDir, "src", "data", "servers.js");
  try {
    mkdirSync(join(docsDir, "src", "data"), { recursive: true });
    const serversData = `export const servers = ${JSON.stringify(servers, null, 2)};

export function getServerById(id) {
  return servers.find(server => server.id === id);
}

export function getActiveServers() {
  return servers.filter(server => server.status !== 'planned');
}
`;
    writeFileSync(serversDataPath, serversData);
    console.log("✅ Updated servers data file");
  } catch (err) {
    console.warn("⚠️  Could not update servers data file:", err.message);
  }

  console.log(`\n📚 VitePress documentation generation complete!`);
  console.log(`Generated documentation for ${servers.length} servers`);
  console.log(`\nTo preview: cd docs && npm run dev`);
}

main().catch(console.error);
