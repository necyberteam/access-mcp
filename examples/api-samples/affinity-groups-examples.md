# Affinity Groups API Examples

## Get Affinity Group Information

```javascript
// Tool: get_affinity_group
const request = {
  tool: "get_affinity_group",
  arguments: {
    group_id: "bridges2.psc.access-ci.org"
  }
};

// Example response:
{
  "name": "Bridges-2",
  "description": "Bridges-2 is a high-performance computing resource...",
  "institution": "Pittsburgh Supercomputing Center",
  "website": "https://www.psc.edu/bridges-2/"
}
```

## Get Affinity Group Events

```javascript
// Tool: get_affinity_group_events
const request = {
  tool: "get_affinity_group_events",
  arguments: {
    group_id: "bridges2.psc.access-ci.org"
  }
};

// Example response:
{
  "events": [
    {
      "title": "Bridges-2 User Workshop",
      "date": "2024-02-15",
      "type": "training",
      "description": "Introduction to using Bridges-2 resources"
    }
  ]
}
```

## Get Knowledge Base Resources

```javascript
// Tool: get_affinity_group_kb
const request = {
  tool: "get_affinity_group_kb",
  arguments: {
    group_id: "bridges2.psc.access-ci.org"
  }
};

// Example response:
{
  "resources": [
    {
      "title": "Bridges-2 User Guide",
      "type": "documentation",
      "url": "https://www.psc.edu/bridges-2/user-guide"
    }
  ]
}
```

## Common Group IDs

- `bridges2.psc.access-ci.org` - Bridges-2 at PSC
- `anvil.access-ci.org` - Anvil at Purdue
- `expanse.sdsc.xsede.org` - Expanse at SDSC
- `stampede3.tacc.utexas.edu` - Stampede3 at TACC