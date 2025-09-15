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
            [nameMatch ? nameMatch[1] : packageName]: nameMatch ? nameMatch[1] : packageName
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
    console.warn(
      `⚠️  Could not extract metadata for ${packageName}:`,
      error.message,
    );
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
    (server) => {
      // Detect if this is a Python package
      const isPythonPackage = server.main && server.main.endsWith('.py');
      
      let installCommand, configCommand, configArgs;
      
      if (isPythonPackage) {
        // Python package - use pipx
        installCommand = `pipx install ${server.name}`;
        configCommand = server.name;
        configArgs = `"command": "${server.name}"`;
      } else {
        // TypeScript package - use npm
        installCommand = `npm install -g ${server.name}`;
        configCommand = "npx";
        configArgs = `"command": "npx",\n      "args": ["${server.name}"]`;
      }
      
      return `
## ${server.description}

**Package:** \`${server.name}\`  
**Version:** v${server.version}

${server.description}

[View Details](/servers/${server.id}){.btn-primary}

\`\`\`bash
# Install
${installCommand}

# Configure
{
  "mcpServers": {
    "${server.id}": {
      ${configArgs}
    }
  }
}
\`\`\`
`;
    }
  )
  .join("")}

[Get Started →](/getting-started)
`;
}

/**
 * Generate individual server documentation page
 */
function generateServerPage(server) {
  const serverTitle = server.description || server.name;
  
  // Extract usage examples, enhanced description, and remaining content from README
  const { usageExamples, enhancedDescription, remainingContent } = extractUsageExamples(server.readme || "");

  // Detect if this is a Python package (has .py main file)
  const isPythonPackage = server.main && server.main.endsWith('.py');
  
  let installationSection, configurationSection;
  
  if (isPythonPackage) {
    // Python package - use pipx
    installationSection = `## Installation

\`\`\`bash
pipx install ${server.name}
\`\`\`

Add to your Claude Desktop configuration:

\`\`\`json
{
  "mcpServers": {
    "${server.id}": {
      "command": "${server.name}"
    }
  }
}
\`\`\``;
  } else {
    // TypeScript package - use npm
    installationSection = `## Installation

\`\`\`bash
npm install -g ${server.name}
\`\`\`

Add to your Claude Desktop configuration:

\`\`\`json
{
  "mcpServers": {
    "${server.id}": {
      "command": "npx",
      "args": ["${server.name}"]
    }
  }
}
\`\`\``;
  }

  return `# ${serverTitle}

${enhancedDescription || server.description}

${usageExamples}

${installationSection}

${remainingContent}

---

**Package:** \`${server.name}\`  
**Version:** v${server.version}  
**Main:** \`${server.main}\`
`;
}

/**
 * Extract content from README, splitting at Installation section
 */
function extractUsageExamples(readmeContent) {
  if (!readmeContent) {
    return {
      usageExamples: "## Usage Examples\n\n<!-- TODO: Extract examples from server code -->",
      enhancedDescription: null,
      remainingContent: ""
    };
  }

  // Extract everything up to ## Installation (or end of file)
  const beforeInstallation = readmeContent.match(/^([\s\S]*?)(?=\n## Installation|\n## License|$)/);
  let contentBeforeInstallation = beforeInstallation ? beforeInstallation[1] : readmeContent;
  
  // Extract the enhanced description (everything between title and Usage Examples)
  let enhancedDescription = null;
  const titleMatch = contentBeforeInstallation.match(/^# .*?\n\n([\s\S]*?)(?=\n## Usage Examples|\n## |$)/);
  if (titleMatch && titleMatch[1]) {
    enhancedDescription = titleMatch[1].trim();
  }
  
  // Extract Usage Examples section
  const usageMatch = contentBeforeInstallation.match(/## Usage Examples[\s\S]*?(?=\n## (?!Usage Examples)|\n# |$)/);
  let usageExamples = "";
  if (usageMatch) {
    usageExamples = usageMatch[0];
  } else {
    usageExamples = "## Usage Examples\n\n<!-- TODO: Extract examples from server code -->";
  }
  
  // Extract remaining content (everything after Usage Examples, before Installation)
  let remainingContent = contentBeforeInstallation;
  
  // Remove title and description
  remainingContent = remainingContent.replace(/^# .*?\n\n[\s\S]*?(?=\n## Usage Examples|\n## |$)/, "");
  
  // Remove Usage Examples
  if (usageMatch) {
    remainingContent = remainingContent.replace(usageMatch[0], "");
  }
  
  remainingContent = remainingContent.trim();
  
  return { usageExamples, enhancedDescription, remainingContent };
}

// Main execution
async function main() {
  const servers = [];
  const serverPackages = [
    "affinity-groups",
    "compute-resources", 
    "system-status",
    "software-discovery",
    "xdmod-charts",
    "xdmod-mcp-data",
    "allocations",
    "nsf-awards",
    "announcements",
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
