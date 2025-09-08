#!/bin/bash

# MCP Servers Deployment Script

set -e

echo "🚀 Deploying ACCESS-CI MCP Servers..."

# Build all packages first
echo "📦 Building packages..."
npm run build

# Build and start Docker containers
echo "🐳 Building Docker images..."
docker-compose build

echo "🔧 Starting MCP servers..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Health check
echo "🏥 Checking service health..."
for port in {3001..3008}; do
    if curl -f http://localhost:$port/health 2>/dev/null; then
        echo "✅ Service on port $port is healthy"
    else
        echo "⚠️  Service on port $port may need more time to start"
    fi
done

echo "🎉 Deployment complete!"
echo ""
echo "MCP Servers running on:"
echo "  • Affinity Groups: http://localhost:3001"
echo "  • Compute Resources: http://localhost:3002"  
echo "  • System Status: http://localhost:3003"
echo "  • Software Discovery: http://localhost:3004"
echo "  • XDMoD Charts: http://localhost:3005"
echo "  • Allocations: http://localhost:3006"
echo "  • NSF Awards: http://localhost:3007"
echo "  • XDMoD Data: http://localhost:3008"
echo ""
echo "📊 Check status: docker-compose ps"
echo "📝 Check logs: docker-compose logs -f [service-name]"
echo "🛑 Stop all: docker-compose down"