# Getting Started

Complete installation guide for ACCESS-CI MCP servers with Claude Desktop.

## Prerequisites

You need two things to get started:

1. **Claude Desktop** - AI assistant application with MCP support
2. **npm** - Package manager for installing the MCP servers

## Step 1: Install Claude Desktop

Claude Desktop is the recommended way to interact with ACCESS-CI MCP servers through an AI assistant.

### macOS
1. Visit [claude.ai/download](https://claude.ai/download)
2. Download Claude Desktop for macOS
3. Open the downloaded `.dmg` file
4. Drag Claude to your Applications folder
5. Launch Claude

### Windows
1. Visit [claude.ai/download](https://claude.ai/download)
2. Download Claude Desktop for Windows
3. Run the installer `.exe` file
4. Follow the installation wizard
5. Launch Claude

## Step 2: Install npm (Node.js) and pipx

npm comes bundled with Node.js and is required to install the TypeScript MCP servers. pipx is required for the Python MCP server.

### macOS Installation

**Option 1: Using Homebrew (Recommended)**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and npm
brew install node

# Install pipx for Python packages
brew install pipx

# Verify installation
node --version
npm --version
pipx --version
```

**Option 2: Direct Download**
1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS version for macOS
3. Run the `.pkg` installer
4. Follow the installation wizard
5. Install pipx: `python3 -m pip install --user pipx`
6. Restart your terminal

### Windows Installation

**Option 1: Using winget (Windows 11/10)**
```powershell
# Open PowerShell as Administrator
winget install OpenJS.NodeJS.LTS

# Install pipx
python -m pip install --user pipx
python -m pipx ensurepath

# Restart PowerShell and verify
node --version
npm --version
pipx --version
```

**Option 2: Using Chocolatey**
```powershell
# Install Chocolatey if you don't have it (run as Administrator)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Node.js
choco install nodejs-lts

# Install pipx
python -m pip install --user pipx
python -m pipx ensurepath

# Verify installation
node --version
npm --version
pipx --version
```

**Option 3: Direct Download**
1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS version for Windows
3. Run the `.msi` installer
4. Follow the installation wizard (accept default settings)
5. Install pipx: `python -m pip install --user pipx`
6. Run: `python -m pipx ensurepath`
7. Restart your computer

# Verify Installation

After installation, open a new terminal/command prompt and run:

```bash
npm --version
pipx --version
```

You should see:
- npm version `10.8.0` or higher (comes with Node.js 22 LTS)
- pipx version `1.4.0` or higher

## Step 3: Install ACCESS-CI MCP Servers

Once you have npm and pipx installed, install all ACCESS-CI MCP servers:

**TypeScript Servers:**
```bash
npm install -g @access-mcp/affinity-groups @access-mcp/compute-resources @access-mcp/system-status @access-mcp/software-discovery @access-mcp/xdmod-charts @access-mcp/allocations @access-mcp/nsf-awards @access-mcp/announcements
```

**Important Notes:**
- Global installation (`-g`) is recommended for better performance, but the `npx` configuration below will work even without global installation
- **Dependencies are automatically installed** - The `@access-mcp/shared` package and all required dependencies will be installed automatically when you install any server
- No additional installation steps are needed beyond the command above

**Python Server:**
```bash
pipx install xdmod-mcp-data
```

## Step 4: Configure Claude Desktop

Add the MCP servers to your Claude Desktop configuration:

### Find Your Config File

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### Edit Configuration

Open the config file in a text editor and add:

```json
{
  "mcpServers": {
    "access-affinity-groups": {
      "command": "npx",
      "args": ["@access-mcp/affinity-groups"]
    },
    "access-compute-resources": {
      "command": "npx",
      "args": ["@access-mcp/compute-resources"]
    },
    "access-system-status": {
      "command": "npx",
      "args": ["@access-mcp/system-status"]
    },
    "access-software-discovery": {
      "command": "npx",
      "args": ["@access-mcp/software-discovery"],
      "env": {
        "SDS_API_KEY": "your-api-key"
      }
    },
    "access-xdmod-charts": {
      "command": "npx",
      "args": ["@access-mcp/xdmod-charts"]
    },
    "access-allocations": {
      "command": "npx",
      "args": ["@access-mcp/allocations"],
      "env": {
        "ACCESS_MCP_SERVICES": "nsf-awards=http://localhost:3007"
      }
    },
    "access-nsf-awards": {
      "command": "npx",
      "args": ["@access-mcp/nsf-awards"],
      "env": {
        "PORT": "3007"
      }
    },
    "access-announcements": {
      "command": "npx",
      "args": ["@access-mcp/announcements"]
    },
    "xdmod-mcp-data": {
      "command": "xdmod-mcp-data",
      "env": {
        "XDMOD_API_TOKEN": "your-xdmod-token-here",
        "ACCESS_MCP_SERVICES": "nsf-awards=http://localhost:3007"
      }
    }
  }
}
```

### Important: NSF Awards Server Configuration

The NSF Awards server runs in **HTTP mode** (not stdio mode like other servers) because:
- The Allocations server needs to make HTTP requests to it for NSF funding cross-referencing
- It uses port 3007 by default
- The `ACCESS_MCP_SERVICES` environment variable tells the Allocations server where to find it

**Note:** The NSF Awards server works independently, but enabling it unlocks advanced funding analysis features in the Allocations server.

### Step 5: Restart Claude Desktop

After saving the configuration file, restart Claude Desktop to load the MCP servers.

## Step 6: Test Your Setup

Ask Claude a question that uses the MCP servers:

> "What GPU resources are available on ACCESS-CI and what machine learning software do they have?"

Claude should query the MCP servers and provide detailed information about available resources.

## Authentication Requirements

### Servers That Work Immediately (No API Key Required)

These servers work without any authentication:
- ✅ **Affinity Groups** - Community resources and events
- ✅ **Compute Resources** - Hardware specifications  
- ✅ **System Status** - Outages and maintenance
- ✅ **Allocations** - Research projects and allocations
- ✅ **NSF Awards** - Funding information
- ✅ **Announcements** - Support announcements and service updates
- ✅ **XDMoD Charts** - System-wide usage statistics and public metrics
- ✅ **XDMoD MCP Data** - XDMoD data access with Python analytics

### Servers Requiring API Keys

#### Software Discovery Server (Required)

**API Key Required**: The SDS server needs an API key to function

To get an API key:
1. Contact ACCESS-CI support for SDS API access
2. Replace `"your-api-key"` in the configuration above with your actual key

#### XDMoD MCP Data Server (Optional)

**Works without API key**: Basic XDMoD data access and analytics
**With API key**: Enhanced functionality and debugging features

To get an API key:
1. Sign in to [XDMoD portal](https://xdmod.access-ci.org/)
2. Click "My Profile" → "API Token" tab
3. Copy your token and replace `"your-xdmod-token-here"` in the configuration above

**Note**: You can remove the entire `"env"` section if you don't need the API token.


## Troubleshooting

### npm Command Not Found
- **macOS/Linux**: Add to your shell profile: `export PATH=$PATH:/usr/local/bin/npm`
- **Windows**: Restart your computer after installing Node.js

### Permission Errors
- **macOS/Linux**: Use `sudo npm install -g ...`
- **Windows**: Run Command Prompt as Administrator

### Missing @access-mcp/shared Dependency
If you see errors about missing `@access-mcp/shared`:

**For npm installations (recommended):**
- This should never happen - dependencies are installed automatically
- If it does occur, try: `npm install -g @access-mcp/shared` then reinstall the server
- Clear npm cache: `npm cache clean --force` and reinstall

**For local/source installations:**
- Ensure you ran `npm install` at the root of the repository
- Ensure you ran `npm run build` to build all packages including shared
- The shared package must be built before other packages can use it

### Claude Desktop Not Finding Servers
1. Verify npm packages are installed: `npm list -g @access-mcp/allocations`
2. Check config file syntax (must be valid JSON)
3. Restart Claude Desktop completely
4. Check Claude Desktop logs for error messages

### Package Version Conflicts
If you encounter dependency version conflicts:
```bash
# Clear npm cache
npm cache clean --force

# Reinstall packages
npm uninstall -g @access-mcp/allocations
npm install -g @access-mcp/allocations
```


## 🔧 Developers (npm packages)

**Best for**: Developers building applications or custom integrations

### Install Individual or All Servers

```bash
# Install all servers at once
npm install -g @access-mcp/affinity-groups @access-mcp/compute-resources @access-mcp/system-status @access-mcp/software-discovery @access-mcp/xdmod-charts @access-mcp/allocations

# Or install individual servers
npm install -g @access-mcp/affinity-groups

# For local project use
npm install @access-mcp/affinity-groups
```

### Install from Source

For local development or contributing to the project:

```bash
git clone https://github.com/necyberteam/access-mcp.git
cd access_mcp
npm install        # Installs all workspace dependencies including @access-mcp/shared
npm run build      # Builds all packages in the correct order
```

**Note for local development:**
- The monorepo uses npm workspaces to manage dependencies
- `npm install` at the root will automatically set up all packages and their dependencies
- The shared package is built first, then all other packages can reference it
- All dependencies (including `@access-mcp/shared`) are handled automatically

### Configuration

```json
{
  "mcpServers": {
    "access-affinity-groups": {
      "command": "npx",
      "args": ["@access-mcp/affinity-groups"]
    }
  }
}
```

## Docker Deployment (Advanced)

For production deployments or isolated environments, Docker containers are available:

### Quick Start with Docker Compose

1. **Clone the repository:**
   ```bash
   git clone https://github.com/necyberteam/access-mcp.git
   cd access-mcp
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Configure Claude Desktop for Docker:**
   ```json
   {
     "mcpServers": {
       "access-affinity-groups": {
         "command": "curl",
         "args": ["-X", "POST", "http://localhost:3011/mcp"]
       },
       "xdmod-mcp-data": {
         "command": "curl", 
         "args": ["-X", "POST", "http://localhost:3008/mcp"]
       }
     }
   }
   ```

### Available Services

The Docker deployment exposes all MCP servers on different ports:
- **Affinity Groups**: `http://localhost:3011`
- **Compute Resources**: `http://localhost:3002`
- **System Status**: `http://localhost:3003`
- **Software Discovery**: `http://localhost:3004`
- **XDMoD Charts**: `http://localhost:3005`
- **Allocations**: `http://localhost:3006`
- **NSF Awards**: `http://localhost:3007`
- **XDMoD MCP Data**: `http://localhost:3008` (Python)
- **Announcements**: `http://localhost:3009`
- **Events**: `http://localhost:3010`

### Environment Variables

Required variables in `.env` file:
```bash
# Required for software discovery
SDS_API_KEY=your-sds-api-key-here

# Optional for enhanced XDMoD functionality
XDMOD_API_TOKEN=your-xdmod-api-token-here

# Docker service endpoints
ACCESS_MCP_SERVICES=nsf-awards=http://localhost:3007
```

## Next Steps

- [Learn about available servers](/servers/)

## Development Prerequisites

- Node.js 18+ with npm
- Python 3.11+ with pipx (for xdmod-mcp-data)
- Docker and Docker Compose (for containerized deployment)
- Claude Desktop or MCP-compatible client
- SDS API key (for software discovery server only)
