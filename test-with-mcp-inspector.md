# Testing with MCP Inspector

The easiest way to test your MCP server is using the official MCP Inspector tool.

## Option 1: Using MCP Inspector (Recommended)

1. **Install MCP Inspector globally:**
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

2. **Build your server:**
   ```bash
   npm run build
   ```

3. **Start the inspector with your server:**
   ```bash
   mcp-inspector packages/affinity-groups/dist/index.js
   ```

4. **Open your browser** to the URL shown (typically http://localhost:5173)

5. **Test the tools interactively:**
   - Click on "Tools" to see available tools
   - Try `get_affinity_group` with group_id: `bridges2.psc.access-ci.org`
   - Try `get_affinity_group_events` and `get_affinity_group_kb` with the same ID

## Option 2: Command Line Testing

Use the included test script:

```bash
node test-server.js
```

This will send JSON-RPC requests directly to your server and show responses.

## Option 3: Manual JSON-RPC Testing

You can also test manually by running the server and sending JSON-RPC requests:

1. **Start the server:**
   ```bash
   node packages/affinity-groups/dist/index.js
   ```

2. **Send JSON-RPC requests via stdin:**
   
   **Initialize:**
   ```json
   {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
   ```
   
   **List tools:**
   ```json
   {"jsonrpc":"2.0","id":2,"method":"tools/list"}
   ```
   
   **Call tool:**
   ```json
   {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_affinity_group","arguments":{"group_id":"bridges2.psc.access-ci.org"}}}
   ```

## Expected Test Results

- **get_affinity_group**: Should return basic affinity group information
- **get_affinity_group_events**: Should return events and training data
- **get_affinity_group_kb**: Should return knowledge base resources

All responses should be JSON formatted and include the actual API response data from ACCESS-CI.