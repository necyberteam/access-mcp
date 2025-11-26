#!/bin/bash
# Start NSF Awards HTTP server for inter-MCP communication

PORT=${PORT:-3007}

echo "Starting NSF Awards HTTP server on port $PORT..."
echo "This enables NSF integration in the allocations server"
echo ""
echo "Press Ctrl+C to stop"
echo ""

PORT=$PORT node dist/index.js
