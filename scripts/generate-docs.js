#!/usr/bin/env node

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const docsDir = join(rootDir, 'docs');

console.log('📚 Generating VitePress documentation from MCP servers...\n');

/**
 * Extract MCP server metadata from built server classes and package info
 */
async function extractServerMetadata(packageName) {
  try {
    const pkgJsonPath = join(rootDir, 'packages', packageName, 'package.json');
    const packageJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    
    // Read README for additional details
    let readmeContent = '';
    try {
      const readmePath = join(rootDir, 'packages', packageName, 'README.md');
      readmeContent = readFileSync(readmePath, 'utf-8');
    } catch (err) {
      // README doesn't exist, that's ok
    }
    
    return {
      id: packageName,
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      readme: readmeContent,
      // Extract additional metadata that could be useful
      main: packageJson.main,
      bin: packageJson.bin
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

${servers.map(server => `
## ${server.description}

**Package:** \`${server.name}\`  
**Version:** v${server.version}

${server.description}

[View Details](/servers/${server.id}){.btn-primary}

\`\`\`bash
# Install
npm install -g ${server.name}

# Configure
{
  "mcpServers": {
    "${server.id}": {
      "command": "npx",
      "args": ["${server.name}"]
    }
  }
}
\`\`\`
`).join('')}

## Installation Methods

Choose the method that works best for you:

### 📥 Download & Run (Recommended for end users)
- Pre-built executables
- No Node.js knowledge required  
- [Download latest release](https://github.com/necyberteam/access-mcp/releases)

### 🔧 npm Packages (For developers)
- Install individual servers
- Integrate into your applications
- Full development workflow

[Get Started →](/getting-started)
`;
}

/**
 * Generate individual server documentation page
 */
function generateServerPage(server) {
  const serverTitle = server.description || server.name;
  
  return `# ${serverTitle}

${server.description}

## Installation

### Download & Run
1. Download the [latest release](https://github.com/necyberteam/access-mcp/releases)
2. Extract and locate the \`${server.id}/index.js\` file
3. Add to Claude Desktop config:

\`\`\`json
{
  "mcpServers": {
    "${server.id}": {
      "command": "/path/to/${server.id}/index.js"
    }
  }
}
\`\`\`

### npm Package
\`\`\`bash
npm install -g ${server.name}
\`\`\`

\`\`\`json
{
  "mcpServers": {
    "${server.id}": {
      "command": "npx",
      "args": ["${server.name}"]
    }
  }
}
\`\`\`

## Usage Examples

<!-- TODO: Extract examples from server code -->

## Development

${server.readme || 'See the package README for development information.'}

---

**Package:** \`${server.name}\`  
**Version:** v${server.version}  
**Main:** \`${server.main}\`
`;
}

// Main execution
async function main() {
  const servers = [];
  const serverPackages = ['affinity-groups', 'compute-resources', 'system-status', 'software-discovery'];
  
  // Extract metadata from all server packages
  for (const packageName of serverPackages) {
    const metadata = await extractServerMetadata(packageName);
    if (metadata) {
      servers.push(metadata);
      console.log(`✅ Extracted metadata for ${metadata.name}`);
    }
  }
  
  // Ensure docs directories exist
  const serversDir = join(docsDir, 'servers');
  try {
    mkdirSync(serversDir, { recursive: true });
  } catch (err) {
    // Directory already exists
  }
  
  // Generate servers overview page
  const serversOverview = generateServersOverview(servers);
  writeFileSync(join(serversDir, 'index.md'), serversOverview);
  console.log('✅ Generated /servers/index.md');
  
  // Generate individual server pages
  for (const server of servers) {
    const serverPage = generateServerPage(server);
    writeFileSync(join(serversDir, `${server.id}.md`), serverPage);
    console.log(`✅ Generated /servers/${server.id}.md`);
  }
  
  // Update the existing data file for compatibility
  const serversDataPath = join(docsDir, 'src', 'data', 'servers.js');
  try {
    mkdirSync(join(docsDir, 'src', 'data'), { recursive: true });
    const serversData = `export const servers = ${JSON.stringify(servers, null, 2)};

export function getServerById(id) {
  return servers.find(server => server.id === id);
}

export function getActiveServers() {
  return servers.filter(server => server.status !== 'planned');
}
`;
    writeFileSync(serversDataPath, serversData);
    console.log('✅ Updated servers data file');
  } catch (err) {
    console.warn('⚠️  Could not update servers data file:', err.message);
  }
  
  console.log(`\n📚 VitePress documentation generation complete!`);
  console.log(`Generated documentation for ${servers.length} servers`);
  console.log(`\nTo preview: cd docs && npm run dev`);
}

main().catch(console.error);