# XDMoD MCP Server Separation Guide

As of the data analytics framework implementation, we now have two complementary XDMoD MCP servers with clear specializations.

## Python Server: xdmod-python (Primary Data Server)

**Location**: `packages/xdmod-python/`  
**Focus**: Data analytics using official xdmod-data framework  
**Authentication**: Uses `XDMOD_API_TOKEN` with DataWarehouse class  

### Primary Functions:
- ✅ `get_user_data_framework` - User-specific data with proper authentication
- ✅ `discover_person_ids` - Find users with real usernames (not just "label") 
- ✅ `get_dimensions` - Available dimensions/group-bys for realms
- ✅ `get_statistics` - Available metrics for realms
- ✅ `get_chart_data` - Numerical chart data for analysis
- ✅ `lookup_person_id` - Advanced person search with scoring
- ✅ `debug_python_auth` - Framework authentication debugging
- ✅ `test_data_framework` - Framework availability testing

### Key Advantages:
- 🎯 **Official xdmod-data framework** (v1.1.0)
- 🔐 **Proper authentication** via DataWarehouse
- 📊 **pandas DataFrame processing** for analysis
- 🎯 **Two-step filtering** for accurate user data
- ✅ **Works with low-usage researchers** (validated)

### Use Cases:
- Personal usage data analysis
- User discovery and search
- System exploration (dimensions/metrics)
- Data processing and analytics
- Authenticated data access

## TypeScript Server: xdmod-metrics (Visualization & Integration Server)

**Location**: `packages/xdmod-metrics/`  
**Focus**: Chart visualization and external integrations  
**Authentication**: Uses REST API tokens

### Unique Functions:
- 🖼️ `get_chart_image` - Generate PNG/SVG/PDF chart images
- 🔗 `get_chart_link` - Generate shareable chart URLs
- 📊 `get_usage_statistics` - Statistical analysis and summaries

Note: Python server has NSF integration via HTTP calls to the NSF Awards MCP server

### Key Advantages:
- 🖼️ **Visual chart generation** (images, not just data)
- 📈 **Direct REST API access** for public metrics
- 🔗 **Shareable chart URLs** for collaboration
- 🔗 **Chart sharing** via URLs
- 📊 **Multiple format support** (PNG, SVG, PDF)

### Use Cases:
- Creating visual reports and presentations
- NSF funding analysis and reporting
- Chart sharing and embedding
- Research impact analysis with funding context

## Overlapping Functions (Deprecated in TypeScript)

The following functions exist in both servers but should use Python version:
- `get_dimensions` → Use **Python** (better framework integration)
- `get_statistics` → Use **Python** (better framework integration)
- `get_chart_data` → Use **Python** (more robust filtering)
- User lookup functions → Use **Python** (better person discovery)

## Migration Status

### ✅ Completed
- Python server has all core data analytics functions
- Person discovery works with real usernames
- User filtering works with two-step process
- Framework authentication is stable

### ✅ Completed
- Clear separation of responsibilities between servers
- NSF integration added to Python server via HTTP calls
- Removed duplicate user functions from TypeScript server  
- Documentation updated to reflect separation
- Fixed pandas 2.x compatibility issues in Python server
- ACCESS ID lookup implemented via System Username dimension

### 📋 Future Enhancements
- Consider adding more sophisticated NSF data analysis
- Add cross-server data correlation features
- Implement caching for frequently accessed data

## Inter-Server Communication

The Python server can call other MCP servers via HTTP:
- **NSF Awards Server**: Runs on port 3002, provides NSF funding data
- **Allocations Server**: Can also call NSF server for enriched project data
- Environment variable `ACCESS_MCP_SERVICES` configures service endpoints

This architecture allows each server to focus on its core functionality while still providing integrated features through HTTP communication.

## Usage Recommendations

### For Data Analysis & User Queries:
```bash
# Use Python server
cd packages/xdmod-python
source venv/bin/activate
python src/xdmod_python/server.py
```

### For Visualizations & NSF Integration:
```bash 
# Use TypeScript server
cd packages/xdmod-metrics
npm start
```

### For Maximum Functionality:
Run both servers with different ports/names and use each for their strengths:
- **Python**: Data queries, user lookup, system exploration
- **TypeScript**: Chart images, NSF integration, visual reports

This separation provides the best of both worlds: robust data analytics with the official framework AND specialized visualization/integration capabilities.