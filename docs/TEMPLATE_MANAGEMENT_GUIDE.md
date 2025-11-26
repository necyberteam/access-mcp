# Template Management & Discovery Guide

This document shows how to make templates discoverable, maintainable, and self-documenting.

## The Template Discovery Problem

Users and LLMs need to:
1. **Discover** what templates exist
2. **Understand** what each template does
3. **Know when** to use each template
4. **Maintain** templates as needs evolve

## Solution: Self-Documenting Template Registry

### Pattern 1: List Templates Feature (XDMoD Example)

XDMoD implements this perfectly with `list_templates=true` parameter:

```python
# Tool definition
Tool(
    name="get_analysis_template",
    parameters={
        "list_templates": {
            "type": "boolean",
            "description": "Set to true to list all 14 available analysis templates with descriptions",
            "default": False
        }
    }
)

# Usage:
get_analysis_template(list_templates=True)
# Returns categorized list of all templates with descriptions
```

**Output Example**:
```
📋 Available Analysis Templates

🚀 Operational Insights (For system administrators):
• Queue Analysis: Monitor job queue performance and wait time patterns
• Allocation Efficiency: Analyze resource allocation utilization
• Performance Efficiency: Monitor job performance and efficiency

👤 User Analysis (Individual user insights):
• Individual User Productivity: Track user's computational output
• User Efficiency Profiling: Analyze resource usage efficiency

📊 Research Analysis (Scientific insights):
• Field Trends: Track research field computational patterns
• GPU Usage: Analyze GPU utilization patterns

💡 Usage: Use get_analysis_template(analysis_type='template_name')
```

### Pattern 2: Template Registry with Metadata

Create a structured template registry:

```typescript
interface TemplateMetadata {
  name: string;
  category: "operational" | "research" | "administrative" | "user";
  description: string;
  use_cases: string[];
  typical_date_range: string;
  example_query: string;
  config: Record<string, any>;

  // Maintenance tracking
  created_at: string;
  last_validated: string;
  deprecated?: boolean;
  deprecation_reason?: string;
  replacement_template?: string;

  // Usage guidance
  prerequisites?: string[];
  related_templates?: string[];
  common_pitfalls?: string[];
}

const TEMPLATE_REGISTRY: Record<string, TemplateMetadata> = {
  large_allocations: {
    name: "large_allocations",
    category: "administrative",
    description: "Find major computational projects by allocation size",
    use_cases: [
      "Quarterly capacity planning",
      "Resource demand forecasting",
      "High-impact research identification"
    ],
    typical_date_range: "last_year",
    example_query: "Find all projects with >100K SUs in 2024",

    config: {
      sort_by: "allocation_desc",
      percentile_threshold: 90,  // Relative, not absolute
      include_fields: ["institution", "field_of_science", "pi"]
    },

    created_at: "2024-01-01",
    last_validated: "2025-01-14",

    prerequisites: [
      "User must understand SU (Service Unit) metrics"
    ],
    related_templates: [
      "institutional_comparison",
      "resource_demand"
    ],
    common_pitfalls: [
      "Don't compare allocations across different resource types",
      "Remember allocations != usage"
    ]
  }
};
```

### Pattern 3: Categorized Template Listing

Organize templates by use case for better discovery:

```typescript
function listTemplates(category?: string): string {
  const categories = {
    operational: {
      title: "🚀 Operational Insights",
      description: "For system administrators and resource managers",
      templates: ["queue_analysis", "allocation_efficiency", "performance_efficiency"]
    },
    research: {
      title: "📊 Research Analysis",
      description: "For scientific insights and trends",
      templates: ["field_trends", "emerging_research", "collaboration_networks"]
    },
    administrative: {
      title: "📈 Administrative Reports",
      description: "For planning and reporting",
      templates: ["large_allocations", "institutional_comparison", "quarterly_summary"]
    },
    user: {
      title: "👤 User Analysis",
      description: "Individual researcher insights",
      templates: ["user_productivity", "user_efficiency", "user_activity"]
    }
  };

  if (category && categories[category]) {
    return formatCategoryTemplates(categories[category]);
  }

  // List all categories
  let result = "📋 **Available Template Categories**\n\n";
  for (const [key, cat] of Object.entries(categories)) {
    result += `**${cat.title}**\n`;
    result += `${cat.description}\n`;
    result += `Templates: ${cat.templates.length}\n\n`;
  }
  result += "💡 Use list_templates=true with category filter to see details\n";
  return result;
}
```

### Pattern 4: Template Validation & Health Checks

Track template validity automatically:

```typescript
interface TemplateHealth {
  name: string;
  status: "healthy" | "warning" | "deprecated" | "broken";
  last_successful_run: Date | null;
  last_error: string | null;
  avg_result_count: number;
  recommendations: string[];
}

async function checkTemplateHealth(templateName: string): Promise<TemplateHealth> {
  const template = TEMPLATE_REGISTRY[templateName];

  try {
    // Try to run template with sample date range
    const results = await executeTemplate(templateName, {
      start_date: "2024-01-01",
      end_date: "2024-01-31"
    });

    const health: TemplateHealth = {
      name: templateName,
      status: "healthy",
      last_successful_run: new Date(),
      last_error: null,
      avg_result_count: results.length,
      recommendations: []
    };

    // Add warnings based on results
    if (results.length === 0) {
      health.status = "warning";
      health.recommendations.push(
        "Template returned no results - may need filter adjustment"
      );
    }

    // Check if template uses deprecated parameters
    if (usesDeprecatedParameters(template)) {
      health.status = "warning";
      health.recommendations.push(
        "Template uses deprecated parameters - consider updating"
      );
    }

    // Check last validation date
    const daysSinceValidation = daysSince(template.last_validated);
    if (daysSinceValidation > 90) {
      health.recommendations.push(
        `Template hasn't been validated in ${daysSinceValidation} days`
      );
    }

    return health;
  } catch (error) {
    return {
      name: templateName,
      status: "broken",
      last_successful_run: null,
      last_error: error.message,
      avg_result_count: 0,
      recommendations: [
        "Template execution failed - requires maintenance"
      ]
    };
  }
}
```

### Pattern 5: Template Deprecation Workflow

When templates need to be retired:

```typescript
function deprecateTemplate(
  templateName: string,
  reason: string,
  replacement?: string
) {
  const template = TEMPLATE_REGISTRY[templateName];

  template.deprecated = true;
  template.deprecation_reason = reason;
  template.replacement_template = replacement;

  // When someone tries to use deprecated template
  if (template.deprecated) {
    return {
      error: "Template Deprecated",
      message: `The '${templateName}' template is deprecated: ${reason}`,
      replacement: replacement ? {
        suggestion: `Use '${replacement}' instead`,
        migration_guide: getTemplateMigrationGuide(templateName, replacement)
      } : null,
      still_available: true,  // Allow usage but warn
      removal_date: "2025-06-01"  // When it will be removed
    };
  }
}
```

## Implementation Example: Allocations Templates

```typescript
// In AllocationsServer

protected getTools() {
  return [
    {
      name: "get_project_template",
      description: "Get pre-configured query templates for common project analyses. Use list_templates=true to see all available templates with descriptions and use cases.",
      inputSchema: {
        type: "object",
        properties: {
          template_name: {
            type: "string",
            description: "Template to retrieve. Common templates: large_allocations, emerging_research, institutional_comparison, field_trends",
            enum: Object.keys(PROJECT_TEMPLATES)
          },
          list_templates: {
            type: "boolean",
            description: "Set to true to list all available templates organized by category",
            default: false
          },
          category: {
            type: "string",
            enum: ["all", "operational", "research", "administrative", "user"],
            description: "When list_templates=true, filter by category",
            default: "all"
          },
          include_health: {
            type: "boolean",
            description: "Include template health status and recommendations",
            default: false
          }
        }
      }
    }
  ];
}

async handle_get_project_template(args) {
  if (args.list_templates) {
    return this.listProjectTemplates({
      category: args.category,
      includeHealth: args.include_health
    });
  }

  if (!args.template_name) {
    return {
      error: "template_name required",
      suggestion: "Use list_templates=true to see available templates"
    };
  }

  return this.getTemplateDetails(args.template_name);
}

private listProjectTemplates(options: { category?: string; includeHealth?: boolean }) {
  let response = "📋 **Available Project Analysis Templates**\n\n";

  const categories = this.getTemplateCategoriesWithMetadata();

  for (const [catKey, category] of Object.entries(categories)) {
    if (options.category !== "all" && options.category !== catKey) continue;

    response += `## ${category.title}\n`;
    response += `${category.description}\n\n`;

    for (const templateName of category.templates) {
      const template = PROJECT_TEMPLATES[templateName];
      response += `### ${template.name}\n`;
      response += `${template.description}\n`;
      response += `**Use cases**: ${template.use_cases.join(", ")}\n`;

      if (options.includeHealth) {
        const health = await this.checkTemplateHealth(templateName);
        const statusEmoji = health.status === "healthy" ? "✅" :
                           health.status === "warning" ? "⚠️" : "❌";
        response += `**Status**: ${statusEmoji} ${health.status}\n`;
      }

      response += `**Example**: ${template.example_query}\n\n`;
    }
  }

  response += "\n💡 **Next Steps**:\n";
  response += "• Use get_project_template(template_name='...') to get full configuration\n";
  response += "• Templates are pre-configured - just add your date range and optional filters\n";
  response += "• All templates use relative thresholds (percentiles) so they stay relevant\n";

  return response;
}
```

## Template Discovery Tool

Create a dedicated template explorer:

```typescript
{
  name: "explore_templates",
  description: "Interactive template discovery. Find templates by use case, category, or search term.",
  inputSchema: {
    properties: {
      search: {
        type: "string",
        description: "Search templates by keyword in name, description, or use cases"
      },
      use_case: {
        type: "string",
        description: "Find templates for specific use case (e.g., 'capacity planning', 'research trends')"
      },
      category: {
        type: "string",
        enum: ["operational", "research", "administrative", "user"],
        description: "Filter by template category"
      },
      show_examples: {
        type: "boolean",
        description: "Include example queries for each template",
        default: true
      }
    }
  }
}
```

## Maintenance Workflows

### Quarterly Template Review

```typescript
async function quarterlyTemplateReview() {
  const report = {
    total_templates: Object.keys(PROJECT_TEMPLATES).length,
    healthy: 0,
    warnings: 0,
    broken: 0,
    deprecated: 0,
    recommendations: []
  };

  for (const [name, template] of Object.entries(PROJECT_TEMPLATES)) {
    const health = await checkTemplateHealth(name);

    report[health.status]++;

    // Check staleness
    if (daysSince(template.last_validated) > 90) {
      report.recommendations.push({
        template: name,
        action: "validate",
        reason: "Not validated in 90+ days"
      });
    }

    // Check usage metrics
    const usageStats = await getTemplateUsageStats(name);
    if (usageStats.uses_last_quarter === 0) {
      report.recommendations.push({
        template: name,
        action: "review_for_deprecation",
        reason: "No usage in last quarter"
      });
    }
  }

  return report;
}
```

### Adding New Templates

```typescript
// Template proposal format
interface TemplateProposal {
  name: string;
  category: string;
  description: string;
  use_cases: string[];
  justification: string;  // Why this template is needed
  similar_templates?: string[];  // What exists already
  estimated_usage: "high" | "medium" | "low";
}

// Review process
function proposeNewTemplate(proposal: TemplateProposal) {
  // 1. Check if similar template exists
  const similar = findSimilarTemplates(proposal.description);
  if (similar.length > 0) {
    return {
      suggestion: "Consider enhancing existing template instead",
      similar_templates: similar
    };
  }

  // 2. Validate it fills a gap
  const gap = identifyTemplateGap(proposal.category);

  // 3. Test with real data
  const testResults = await testTemplateWithSampleData(proposal.config);

  // 4. Document and add
  if (testResults.viable) {
    addTemplate(proposal);
    return { success: true, template_id: proposal.name };
  }
}
```

## Best Practices Summary

### ✅ DO:
1. **Make templates listable** with `list_templates=true`
2. **Categorize by use case** (operational, research, admin, user)
3. **Include rich metadata** (use cases, examples, prerequisites)
4. **Track health automatically** (last successful run, avg results)
5. **Use relative values** (percentiles, not absolutes)
6. **Document deprecations** with migration guides
7. **Review quarterly** for relevance and usage
8. **Version templates** with created_at and last_validated

### ❌ DON'T:
1. **Hardcode data** in templates (use dynamic queries)
2. **Create templates without use cases** (must solve real need)
3. **Let templates go stale** (automate health checks)
4. **Remove templates without warning** (deprecate first)
5. **Duplicate functionality** (check for similar templates first)
6. **Skip documentation** (examples and use cases required)

## Example: Complete Template System

```typescript
// Full template with all recommended fields
export const PROJECT_TEMPLATES = {
  large_allocations: {
    // Identity
    name: "large_allocations",
    category: "administrative",

    // Discovery
    description: "Find major computational projects by allocation size",
    use_cases: [
      "Quarterly capacity planning",
      "Resource demand forecasting",
      "High-impact research identification"
    ],
    example_query: "Find all projects with >100K SUs in 2024",

    // Configuration (dynamic, not hardcoded)
    config: {
      sort_by: "allocation_desc",
      percentile_threshold: 90,  // Top 10%
      include_fields: ["institution", "field_of_science", "pi"]
    },

    // Guidance
    prerequisites: ["Understanding of SU metrics"],
    related_templates: ["institutional_comparison", "resource_demand"],
    common_pitfalls: ["Don't compare across resource types"],

    // Maintenance
    created_at: "2024-01-01",
    last_validated: "2025-01-14",
    last_successful_run: "2025-01-14T10:30:00Z",
    avg_result_count: 150,
    usage_count_last_quarter: 45,

    // Lifecycle
    deprecated: false,
    status: "healthy"
  }
};
```

This approach ensures templates are:
- **Discoverable** (list feature, search, categories)
- **Maintainable** (health checks, validation dates)
- **Self-documenting** (rich metadata, examples)
- **Evolvable** (deprecation workflow, versioning)
