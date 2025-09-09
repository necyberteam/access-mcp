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
npm install -g @access-mcp/affinity-groups @access-mcp/compute-resources @access-mcp/system-status @access-mcp/software-discovery @access-mcp/xdmod-charts @access-mcp/allocations @access-mcp/nsf-awards
```
_Note: Global installation (`-g`) is recommended for better performance, but the `npx` configuration below will work even without global installation._

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
      "args": ["@access-mcp/allocations"]
    },
    "access-nsf-awards": {
      "command": "npx",
      "args": ["@access-mcp/nsf-awards"]
    },
    "xdmod-mcp-data": {
      "command": "xdmod-mcp-data",
      "env": {
        "XDMOD_API_TOKEN": "your-xdmod-token-here"
      }
    }
  }
}
```

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

### Claude Desktop Not Finding Servers
1. Verify npm packages are installed: `npm list -g @access-mcp/allocations`
2. Check config file syntax (must be valid JSON)
3. Restart Claude Desktop completely
4. Check Claude Desktop logs for error messages


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

```bash
git clone <repository-url>
cd access_mcp
npm install
npm run build
```

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

## Next Steps

- [Learn about available servers](/servers/)

## Prerequisites

- Node.js 18+ with npm
- Claude Desktop or MCP-compatible client
- SDS API key (for software discovery server only)
