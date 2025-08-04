# Use Case: Research Planning with ACCESS-CI

## Scenario

A researcher wants to plan a computational project using ACCESS-CI resources and needs to understand available affinity groups, their capabilities, and upcoming training opportunities.

## Conversation Flow with Claude

### 1. Discover Available Resources

**User:** "What ACCESS-CI affinity groups are available for high-performance computing?"

**Claude response using MCP:**

```
I'll help you find ACCESS-CI affinity groups for HPC. Let me check some major resources:

[Uses: get_affinity_group with bridges2.psc.access-ci.org]
- **Bridges-2** at Pittsburgh Supercomputing Center: High-performance computing resource with GPU nodes, ideal for AI/ML and traditional HPC workloads.

[Uses: get_affinity_group with anvil.access-ci.org]
- **Anvil** at Purdue University: Composable system designed for artificial intelligence, machine learning, and data analytics.
```

### 2. Get Training Information

**User:** "Are there any upcoming training sessions for Bridges-2?"

**Claude response using MCP:**

```
Let me check upcoming events for Bridges-2:

[Uses: get_affinity_group_events with bridges2.psc.access-ci.org]
- **Bridges-2 User Workshop** - February 15, 2024: Introduction to using Bridges-2 resources
- **GPU Programming with CUDA** - March 2, 2024: Advanced GPU programming techniques
```

### 3. Find Documentation

**User:** "Where can I find technical documentation for getting started with Bridges-2?"

**Claude response using MCP:**

```
Here are the knowledge base resources for Bridges-2:

[Uses: get_affinity_group_kb with bridges2.psc.access-ci.org]
- **Bridges-2 User Guide**: Comprehensive documentation for new users
- **Job Submission Guidelines**: How to submit and manage jobs
- **Software Documentation**: Available software packages and modules
```

## Benefits of Using MCP Server

1. **Real-time Information**: Always up-to-date resource information
2. **Integrated Workflow**: Information gathering within Claude conversation
3. **Cross-referencing**: Easy comparison between different resources
4. **Planning Support**: Training schedules and documentation in context
