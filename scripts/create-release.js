import { readFile, writeFile, mkdir, copyFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const bundlesDir = join(rootDir, "bundles");
const releaseDir = join(rootDir, "release");

async function createRelease() {
  try {
    // Read package.json for version
    const packageJsonPath = join(rootDir, "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
    const version = packageJson.version;

    console.log(`Creating release v${version}...`);

    // Create release directory
    await mkdir(releaseDir, { recursive: true });

    // Create release package
    const releasePackageDir = join(releaseDir, `access-mcp-servers-v${version}`);
    await mkdir(releasePackageDir, { recursive: true });

    // Copy bundled servers
    const servers = ["affinity-groups", "compute-resources", "system-status", "software-discovery"];

    for (const server of servers) {
      const srcDir = join(bundlesDir, server);
      const destDir = join(releasePackageDir, server);
      await mkdir(destDir, { recursive: true });

      // Copy files
      await copyFile(join(srcDir, "index.js"), join(destDir, "index.js"));
      await copyFile(join(srcDir, "package.json"), join(destDir, "package.json"));

      // Try to copy README if it exists
      try {
        await copyFile(join(srcDir, "README.md"), join(destDir, "README.md"));
      } catch (err) {
        // README doesn't exist, create a basic one
        const basicReadme = `# ${server}\n\nMCP Server for ACCESS-CI ${server.replace("-", " ")}\n\n## Usage\n\n\`\`\`bash\nnode index.js\n\`\`\`\n`;
        await writeFile(join(destDir, "README.md"), basicReadme);
      }

      // Make executable
      execSync(`chmod +x "${join(destDir, "index.js")}"`);
    }

    // Create main README for the release
    const mainReadme = `# ACCESS-CI MCP Servers v${version}

This package contains standalone MCP servers for ACCESS-CI APIs.

## Servers Included

- **affinity-groups**: ACCESS-CI Affinity Groups API
- **compute-resources**: ACCESS-CI Compute Resources API  
- **system-status**: ACCESS-CI System Status and Outages API
- **software-discovery**: ACCESS-CI Software Discovery Service API

## Installation

1. Extract this archive to your desired location
2. Each server is in its own directory with a standalone \`index.js\` file
3. Add servers to your Claude Desktop configuration

## Claude Desktop Configuration

Add entries like this to your Claude Desktop config:

\`\`\`json
{
  "mcpServers": {
    "access-affinity-groups": {
      "command": "/path/to/affinity-groups/index.js"
    },
    "access-compute-resources": {
      "command": "/path/to/compute-resources/index.js"
    },
    "access-system-status": {
      "command": "/path/to/system-status/index.js"
    },
    "access-software-discovery": {
      "command": "/path/to/software-discovery/index.js",
      "env": {
        "SDS_API_KEY": "your-sds-api-key"
      }
    }
  }
}
\`\`\`

## Requirements

- Node.js 18 or higher
- For software-discovery server: SDS_API_KEY environment variable

## Documentation

See individual server README files for detailed usage information.
`;

    await writeFile(join(releasePackageDir, "README.md"), mainReadme);

    // Create example Claude Desktop config
    const exampleConfig = {
      mcpServers: {
        "access-affinity-groups": {
          command: "/path/to/affinity-groups/index.js",
        },
        "access-compute-resources": {
          command: "/path/to/compute-resources/index.js",
        },
        "access-system-status": {
          command: "/path/to/system-status/index.js",
        },
        "access-software-discovery": {
          command: "/path/to/software-discovery/index.js",
          env: {
            SDS_API_KEY: "your-sds-api-key",
          },
        },
      },
    };

    await writeFile(
      join(releasePackageDir, "claude-desktop-config-example.json"),
      JSON.stringify(exampleConfig, null, 2)
    );

    // Create zip file
    const zipName = `access-mcp-servers-v${version}.zip`;
    const zipPath = join(releaseDir, zipName);

    execSync(`cd "${releaseDir}" && zip -r "${zipName}" "access-mcp-servers-v${version}"`);

    console.log(`✓ Release created: ${zipPath}`);
    console.log(`✓ Release directory: ${releasePackageDir}`);

    return { zipPath, releaseDir: releasePackageDir, version };
  } catch (error) {
    console.error("✗ Failed to create release:", error.message);
    throw error;
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createRelease().catch(process.exit);
}

export { createRelease };
