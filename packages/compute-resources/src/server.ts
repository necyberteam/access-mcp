import {
  BaseAccessServer,
  handleApiError,
  sanitizeGroupId,
  FIELDS_OF_SCIENCE,
  RESOURCE_TYPES,
  ACCESS_SYSTEMS,
  GPU_SELECTION_GUIDE,
  MEMORY_REQUIREMENTS,
  getFeatureNames,
} from "@access-mcp/shared";

export class ComputeResourcesServer extends BaseAccessServer {
  constructor() {
    super(
      "access-mcp-compute-resources",
      "0.3.0",
      "https://operations-api.access-ci.org",
    );
  }

  protected getTools() {
    return [
      {
        name: "list_compute_resources",
        description: "List all ACCESS-CI compute resources",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_compute_resource",
        description:
          "Get detailed information about a specific compute resource",
        inputSchema: {
          type: "object",
          properties: {
            resource_id: {
              type: "string",
              description: "The resource ID or info_groupid",
            },
          },
          required: ["resource_id"],
        },
      },
      {
        name: "get_resource_hardware",
        description: "Get hardware specifications for a compute resource",
        inputSchema: {
          type: "object",
          properties: {
            resource_id: {
              type: "string",
              description: "The resource ID or info_groupid",
            },
          },
          required: ["resource_id"],
        },
      },
      {
        name: "search_resources",
        description: "**CRITICAL TOOL**: Search for compute resources and discover resource IDs needed by other ACCESS-CI services. **IMPORTANT**: This tool is essential for discovering resource IDs required by software-discovery, system-status, and other ACCESS-CI tools. Always use `include_resource_ids: true` when you need IDs for other operations.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search term to match against resource names, descriptions, and organizations",
            },
            resource_type: {
              type: "string",
              enum: ["compute", "storage", "cloud", "gpu", "cpu"],
              description: "Filter by resource type",
            },
            has_gpu: {
              type: "boolean",
              description: "Filter for resources with GPU capabilities",
            },
            organization: {
              type: "string",
              description: "Filter by organization name (e.g., 'NCSA', 'PSC', 'Purdue', 'SDSC', 'TACC', 'Indiana'). Partial matches supported.",
            },
            include_resource_ids: {
              type: "boolean",
              description: "**CRITICAL**: Include resource IDs needed for other ACCESS-CI services. These IDs are required parameters for software discovery, system status, and other ACCESS-CI tools. Always set to true when you need resource IDs for subsequent operations. **Common Workflow**: 1) Search resources with this enabled, 2) Use returned IDs in other ACCESS-CI tools.",
            },
          },
        },
      },
    ];
  }

  protected getResources() {
    return [
      {
        uri: "accessci://compute-resources",
        name: "ACCESS-CI Compute Resources",
        description:
          "Information about ACCESS-CI compute resources, hardware, and software",
        mimeType: "application/json",
      },
      {
        uri: "accessci://compute-resources/capabilities-matrix",
        name: "Compute Resource Capabilities Matrix",
        description:
          "Comparison of different resource types and their ideal use cases",
        mimeType: "application/json",
      },
      {
        uri: "accessci://compute-resources/gpu-guide",
        name: "GPU Resource Selection Guide",
        description:
          "Guidance for selecting appropriate GPU resources for different workloads",
        mimeType: "text/markdown",
      },
      {
        uri: "accessci://compute-resources/resource-types",
        name: "Resource Type Taxonomy",
        description:
          "Classification of ACCESS-CI resource types and their characteristics",
        mimeType: "application/json",
      },
    ];
  }

  protected getPrompts() {
    return [
      {
        name: "recommend_compute_resource",
        description:
          "Get personalized recommendations for ACCESS-CI compute resources based on research needs",
        arguments: [
          {
            name: "research_area",
            description:
              "Your field of research (e.g., 'machine learning', 'molecular dynamics', 'climate modeling', 'genomics')",
            required: true,
          },
          {
            name: "compute_needs",
            description:
              "Describe your computational requirements in natural language (e.g., 'GPU for training transformers', 'high memory for genome assembly', '500TB storage for climate data', 'parallel CPU for CFD simulations')",
            required: true,
          },
          {
            name: "experience_level",
            description:
              "Optional: Your HPC experience level (e.g., 'beginner', 'intermediate', 'advanced'). Helps tailor recommendations to your familiarity with supercomputing.",
            required: false,
          },
          {
            name: "allocation_size",
            description:
              "Optional: Approximate allocation size needed (e.g., 'small pilot project', 'medium research project', 'large-scale production', or specific credit amount like '100000')",
            required: false,
          },
        ],
      },
    ];
  }

  async handleToolCall(request: any) {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "list_compute_resources":
          return await this.listComputeResources();
        case "get_compute_resource":
          return await this.getComputeResource(args.resource_id);
        case "get_resource_hardware":
          return await this.getResourceHardware(args.resource_id);
        case "search_resources":
          return await this.searchResources(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${handleApiError(error)}`,
          },
        ],
      };
    }
  }

  async handleResourceRead(request: any) {
    const { uri } = request.params;

    if (uri === "accessci://compute-resources") {
      return this.createTextResource(
        uri,
        "ACCESS-CI Compute Resources API - Use the available tools to query compute resources, hardware specifications, and software availability."
      );
    }

    if (uri === "accessci://compute-resources/capabilities-matrix") {
      const matrix = {
        resource_types: RESOURCE_TYPES,
        comparison_matrix: {
          "Machine Learning / AI": {
            primary: "GPU",
            secondary: "High Memory",
            rationale:
              "GPUs provide massive parallelism for training neural networks. High memory systems useful for large datasets that don't fit in GPU memory.",
          },
          "Molecular Dynamics": {
            primary: "GPU",
            secondary: "CPU",
            rationale:
              "Modern MD codes (GROMACS, AMBER) are GPU-accelerated. CPU clusters still useful for older codes or ensemble simulations.",
          },
          "Genomics / Bioinformatics": {
            primary: "High Memory",
            secondary: "CPU",
            rationale:
              "Genome assembly requires large memory. High-throughput analysis benefits from many CPU cores.",
          },
          "Climate / Weather Modeling": {
            primary: "CPU",
            secondary: "Storage",
            rationale:
              "Large-scale parallel codes optimized for CPU clusters. Massive data output requires substantial storage.",
          },
          "CFD / Engineering": {
            primary: "CPU",
            secondary: "GPU",
            rationale:
              "Traditional CFD codes use CPU clusters. Some modern codes support GPU acceleration.",
          },
          "Data Analytics": {
            primary: "CPU",
            secondary: "High Memory",
            rationale:
              "Parallel data processing on CPU clusters. Large datasets may require high-memory systems.",
          },
          "Quantum Chemistry": {
            primary: "CPU",
            secondary: "High Memory",
            rationale:
              "Ab initio calculations are CPU-intensive. Some calculations require significant memory.",
          },
        },
        selection_guide: {
          step_1: "Identify your primary computational pattern (CPU-bound, GPU-accelerated, memory-intensive, data-intensive)",
          step_2: "Match to resource type using the comparison matrix above",
          step_3: "Use search_resources tool to find specific systems with those capabilities",
          step_4: "Review hardware specs with get_resource_hardware tool",
          step_5: "Check software availability with software-discovery service",
        },
      };
      return this.createJsonResource(uri, matrix);
    }

    if (uri === "accessci://compute-resources/gpu-guide") {
      const guide = `# GPU Resource Selection Guide

## GPU Types on ACCESS-CI Systems

### NVIDIA A100
- **Best for**: Large-scale deep learning, large models, transformers
- **Memory**: 40GB or 80GB variants
- **Key features**: Tensor cores, multi-instance GPU (MIG), NVLink
- **Typical systems**: Delta, Bridges-2

### NVIDIA V100
- **Best for**: General deep learning, scientific computing
- **Memory**: 16GB or 32GB variants
- **Key features**: Tensor cores, NVLink
- **Typical systems**: Bridges-2, Expanse

### NVIDIA A40
- **Best for**: Visualization, rendering, inference
- **Memory**: 48GB
- **Key features**: RTX cores, large memory
- **Typical systems**: Bridges-2

## Choosing the Right GPU

### For Training Large Language Models
- **Recommendation**: A100 80GB
- **Rationale**: Large model parameters require high GPU memory
- **Alternative**: Multiple A100 40GB with model parallelism

### For Computer Vision (CNNs)
- **Recommendation**: A100 40GB or V100 32GB
- **Rationale**: Good balance of memory and compute for typical CV workloads

### For Molecular Dynamics
- **Recommendation**: A100 or V100
- **Rationale**: MD codes benefit from double-precision performance

### For Inference/Deployment
- **Recommendation**: A40 or T4
- **Rationale**: Efficient inference, good price/performance

## Batch Size Considerations

**Small models (<100M parameters)**: V100 or A100 40GB sufficient
**Medium models (100M-1B parameters)**: A100 40GB recommended
**Large models (1B-10B parameters)**: A100 80GB or multi-GPU
**Very large models (>10B parameters)**: Multi-GPU A100 80GB required

## Multi-GPU Training

Most ACCESS systems support:
- **Data parallelism**: Distribute batches across GPUs
- **Model parallelism**: Split model layers across GPUs
- **Pipeline parallelism**: Different model stages on different GPUs

Use **search_resources** with **has_gpu: true** to find GPU-enabled systems.
`;
      return this.createMarkdownResource(uri, guide);
    }

    if (uri === "accessci://compute-resources/resource-types") {
      return this.createJsonResource(uri, {
        resource_types: RESOURCE_TYPES,
        usage_notes: {
          CPU: "Most versatile, suitable for serial and parallel codes",
          GPU: "Best for highly parallel workloads, requires GPU-optimized code",
          "High Memory": "Essential for workloads that need >100GB RAM",
          Storage: "For datasets >10TB or high I/O requirements",
          Cloud: "Best for web services, containers, variable workloads",
        },
      });
    }

    throw new Error(`Unknown resource: ${uri}`);
  }

  async handleGetPrompt(request: any): Promise<any> {
    const { name, arguments: args } = request.params;

    if (name === "recommend_compute_resource") {
      const { research_area, compute_needs, allocation_size, experience_level } = args;

      // Selective context embedding based on user needs
      const lowerNeeds = compute_needs.toLowerCase();
      const lowerResearch = research_area.toLowerCase();

      // 1. Find matching field of science for domain context
      let matchedField = null;
      for (const [fieldName, fieldData] of Object.entries(FIELDS_OF_SCIENCE)) {
        const keywords = fieldData.keywords.map((k) => k.toLowerCase());
        if (
          keywords.some((k) => lowerResearch.includes(k) || lowerNeeds.includes(k)) ||
          lowerResearch.includes(fieldName.toLowerCase())
        ) {
          matchedField = fieldData;
          break;
        }
      }

      // 2. Determine if GPU is relevant
      const gpuRelevant =
        lowerNeeds.includes("gpu") ||
        lowerNeeds.includes("deep learning") ||
        lowerNeeds.includes("machine learning") ||
        lowerNeeds.includes("ai") ||
        lowerNeeds.includes("neural network") ||
        lowerResearch.includes("machine learning") ||
        lowerResearch.includes("computer vision");

      // 3. Determine memory requirements
      const highMemoryRelevant =
        lowerNeeds.includes("memory") ||
        lowerNeeds.includes("genome") ||
        lowerNeeds.includes("assembly") ||
        lowerNeeds.includes("graph");

      // 4. Filter relevant systems based on needs
      const relevantSystems: typeof ACCESS_SYSTEMS = {};
      for (const [name, system] of Object.entries(ACCESS_SYSTEMS)) {
        const isRelevant =
          (gpuRelevant && system.gpu_types && system.gpu_types.length > 0) ||
          (highMemoryRelevant && system.strengths.some(s => s.includes("Memory"))) ||
          (!gpuRelevant && !highMemoryRelevant); // Include general-purpose systems

        // Filter by experience level if specified
        const experienceMatch = !experience_level ||
          system.experience_level.some(level =>
            level.toLowerCase().includes(experience_level.toLowerCase())
          );

        if (isRelevant && experienceMatch) {
          relevantSystems[name] = system;
        }
      }

      // 5. Build compact context sections
      let contextSections = [];

      // Field of science context
      if (matchedField) {
        contextSections.push(`**Your Research Field**: ${matchedField.name}
- Typical Resources: ${matchedField.typical_resources.join(", ")}
- Common Software: ${matchedField.common_software.slice(0, 6).join(", ")}
- Typical Allocation: ${matchedField.allocation_range?.min.toLocaleString()} - ${matchedField.allocation_range?.max.toLocaleString()} ACCESS Credits`);
      }

      // Relevant ACCESS systems
      contextSections.push(`**Relevant ACCESS Systems**:
${Object.entries(relevantSystems).map(([name, sys]) =>
  `- **${name}** (${sys.organization}): ${sys.description}
  ${sys.gpu_types ? `GPUs: ${sys.gpu_types.join(", ")}` : ""}
  ${sys.max_memory_per_node ? `Max Memory: ${sys.max_memory_per_node}` : ""}
  Ideal for: ${sys.ideal_for.slice(0, 3).join(", ")}`
).join("\n\n")}`);

      // GPU guide if relevant
      if (gpuRelevant) {
        const relevantGpuGuides = Object.entries(GPU_SELECTION_GUIDE)
          .filter(([useCase]) =>
            lowerNeeds.includes(useCase.toLowerCase()) ||
            lowerResearch.includes(useCase.toLowerCase())
          );

        if (relevantGpuGuides.length > 0) {
          contextSections.push(`**GPU Guidance**:
${relevantGpuGuides.map(([useCase, guide]) =>
  `- **${useCase}**: ${guide.recommended_gpu}
  Systems: ${guide.recommended_systems.join(", ")}
  ${guide.notes}`
).join("\n\n")}`);
        }
      }

      // Memory requirements if relevant
      if (highMemoryRelevant) {
        contextSections.push(`**Memory Options**:
${Object.entries(MEMORY_REQUIREMENTS).map(([range, info]) =>
  `- **${range}**: ${info.description}
  Systems: ${info.recommended_systems.join(", ")}`
).join("\n")}`);
      }

      // 6. Construct the final prompt
      const promptText = `I need help selecting appropriate ACCESS-CI compute resources for my research.

**Research Area**: ${research_area}
**Computational Needs**: ${compute_needs}
${experience_level ? `**Experience Level**: ${experience_level}` : ""}
${allocation_size ? `**Allocation Size**: ${allocation_size}` : ""}

${contextSections.join("\n\n")}

---

Based on this context and my requirements, please:

1. **Recommend 2-3 specific ACCESS systems** that best match my needs
2. **Explain the rationale** for each recommendation
3. **Suggest an allocation tier** (Discover: 1K-400K, Explore: 400K-1.5M, Accelerate: 1.5M-10M, Maximize: 10M+ credits)
4. **Recommend next steps** for getting started${experience_level === "beginner" ? ", keeping in mind I'm new to HPC" : ""}

Consider:
- Which resource types (CPU/GPU/Memory/Storage) match my computational pattern
- Which systems have the specific capabilities I need
- What allocation size makes sense for my project scale
- Any relevant software that might be pre-installed`;

      return {
        description: `Personalized compute resource recommendation for ${research_area}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText,
            },
          },
        ],
      };
    }

    throw new Error(`Unknown prompt: ${name}`);
  }

  /**
   * Static mapping of known organization IDs to names.
   * This serves as a fallback when the API doesn't return organization info.
   *
   * These names are fetched from /wh2/cider/v1/organizations/ endpoint.
   * Mapping updated: 2025-10-21 via scripts/fetch-organizations-working-endpoint.js
   *
   * Note: API should be preferred (see listComputeResources method), this is only
   * used if API fetch fails. Allows new organizations to be discovered automatically.
   */
  private readonly KNOWN_ORGANIZATIONS: Record<number, string> = {
    // Major HPC Centers
    844: "National Center for Supercomputing Applications",
    856: "San Diego Supercomputer Center",
    848: "Pittsburgh Supercomputing Center",
    2058: "Texas Advanced Computing Center",

    // Universities
    467: "Texas A&M University",
    476: "University of Texas at Austin",
    561: "Indiana University",
    563: "University of Kentucky",
    1869: "Purdue University",
    178: "Northwestern University",
    471: "Texas Tech University",
    14449: "Institute for Advanced Computational Science at Stony Brook University",

    // Research Infrastructure & Projects
    2000: "Renaissance Computing Institute",
    653: "NSF National Center for Atmospheric Research",
    2440: "OSG Consortium",
    4659: "Science Gateways Center of Excellence",
    12964: "Open Storage Network",
    16235: "ACCESS Support",
    19169: "CloudBank",
  };

  private async listComputeResources() {
    // Get all active resource groups
    const response = await this.httpClient.get(
      "/wh2/cider/v1/access-active-groups/type/resource-catalog.access-ci.org/",
    );

    // Also try to get organization information
    let orgMapping: Map<number, string> = new Map();

    // First, add known static mappings as fallback
    Object.entries(this.KNOWN_ORGANIZATIONS).forEach(([id, name]) => {
      orgMapping.set(parseInt(id), name);
    });

    // Then try to fetch live organization data (will override static mappings)
    // NOTE: Using /organizations/ endpoint (not /access-active-groups/type/organizations.access-ci.org/
    // which returns 0 results). See ACCESS_CI_API_ISSUE_ORGANIZATIONS.md for details.
    try {
      const orgResponse = await this.httpClient.get(
        "/wh2/cider/v1/organizations/",
      );
      if (orgResponse.status === 200 && orgResponse.data?.results) {
        orgResponse.data.results.forEach((org: any) => {
          if (org.organization_id && org.organization_name) {
            orgMapping.set(org.organization_id, org.organization_name);
          }
        });
      }
    } catch (e) {
      // If organizations endpoint fails, we'll use the static mapping
      console.warn("Could not fetch organization names from API, using fallback mapping");
    }

    // Check if the response has the expected structure
    if (
      !response.data ||
      !response.data.results ||
      !response.data.results.active_groups
    ) {
      throw new Error(
        `Unexpected API response structure. Got: ${JSON.stringify(response.data)}`,
      );
    }

    const computeResources = response.data.results.active_groups
      .filter((group: any) => {
        // Filter for compute resources (category 1 = "Compute & Storage Resources")
        return (
          group.rollup_info_resourceids &&
          !group.rollup_feature_ids.includes(137)
        );
      })
      .map((group: any) => {
        
        // Map organization IDs to names if available
        const organizationNames = (group.rollup_organization_ids || []).map((id: number) => 
          orgMapping.get(id) || id.toString()
        );
        
        return {
          id: group.info_groupid,
          name: group.group_descriptive_name,
          description: group.group_description,
          organization_ids: group.rollup_organization_ids,
          organization_names: organizationNames,
          features: group.rollup_feature_ids,
          feature_names: getFeatureNames(group.rollup_feature_ids || []), // NEW: Human-readable feature names
          resources: group.rollup_info_resourceids,
          logoUrl: group.group_logo_url,
          accessAllocated: group.rollup_feature_ids.includes(139),
          // Add computed fields for easier filtering
          hasGpu: this.detectGpuCapability(group),
          resourceType: this.determineResourceType(group),
          // Include the actual resource IDs that other ACCESS-CI services can use
          resourceIds: group.rollup_info_resourceids || [],
        };
      });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              total: computeResources.length,
              resources: computeResources,
              documentation: this.addDocumentation(),
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private async getComputeResource(resourceId: string) {
    const sanitizedId = sanitizeGroupId(resourceId);

    // Get detailed resource information
    const response = await this.httpClient.get(
      `/wh2/cider/v1/access-active/info_groupid/${sanitizedId}/?format=json`,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data.results, null, 2),
        },
      ],
    };
  }

  private async getResourceHardware(resourceId: string) {
    const resourceData = await this.getComputeResource(resourceId);

    // Extract hardware-related information
    const fullData = JSON.parse(resourceData.content[0].text);
    const hardwareInfo = fullData.filter(
      (item: any) =>
        item.cider_type === "Compute" ||
        item.cider_type === "Storage" ||
        item.resource_descriptive_name?.toLowerCase().includes("node") ||
        item.resource_descriptive_name?.toLowerCase().includes("core") ||
        item.resource_descriptive_name?.toLowerCase().includes("memory") ||
        item.resource_descriptive_name?.toLowerCase().includes("gpu"),
    );

    // Structure the hardware data for easier consumption
    const structuredHardware = this.structureHardwareInfo(hardwareInfo);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              resource_id: resourceId,
              hardware: structuredHardware,
              raw_hardware_items: hardwareInfo, // Keep raw data for reference
              documentation: {
                note: "Hardware specifications are derived from the resource catalog API",
                details_url: `https://operations-api.access-ci.org/wh2/cider/v1/access-active/info_groupid/${resourceId}`,
              },
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  /**
   * Add contextual documentation links - only included when genuinely helpful
   *
   * @param context - What operation is being performed ('list' | 'search' | 'details')
   */
  private addDocumentation(context: 'list' | 'search' | 'details' = 'list') {
    // For listing resources, provide next-step links
    if (context === 'list') {
      return {
        next_steps: "https://allocations.access-ci.org/get-started",
        resource_catalog: "https://allocations.access-ci.org/resources",
      };
    }

    // For search results, documentation is less useful - users already know what they want
    if (context === 'search') {
      return undefined; // Don't clutter search results
    }

    // For resource details, provide specific resource documentation
    return undefined; // Resource-specific docs should come from the resource itself
  }

  /**
   * Structure raw hardware items into organized categories
   */
  private structureHardwareInfo(hardwareItems: any[]): any {
    const structured: any = {
      compute_nodes: [],
      storage: [],
      gpus: [],
      memory: [],
      other: [],
    };

    for (const item of hardwareItems) {
      const name = item.resource_descriptive_name?.toLowerCase() || "";
      const type = item.cider_type;

      // Categorize by type and name
      if (name.includes("gpu") || name.includes("accelerator")) {
        structured.gpus.push({
          name: item.resource_descriptive_name,
          type: item.cider_type,
          details: item.resource_description,
        });
      } else if (name.includes("memory") || name.includes("ram")) {
        structured.memory.push({
          name: item.resource_descriptive_name,
          type: item.cider_type,
          details: item.resource_description,
        });
      } else if (type === "Storage" || name.includes("storage") || name.includes("disk")) {
        structured.storage.push({
          name: item.resource_descriptive_name,
          type: item.cider_type,
          details: item.resource_description,
        });
      } else if (type === "Compute" || name.includes("node") || name.includes("core") || name.includes("cpu")) {
        structured.compute_nodes.push({
          name: item.resource_descriptive_name,
          type: item.cider_type,
          details: item.resource_description,
        });
      } else {
        structured.other.push({
          name: item.resource_descriptive_name,
          type: item.cider_type,
          details: item.resource_description,
        });
      }
    }

    // Remove empty categories
    Object.keys(structured).forEach(key => {
      if (structured[key].length === 0) {
        delete structured[key];
      }
    });

    return structured;
  }
  
  private detectGpuCapability(group: any): boolean {
    // Check if the group has GPU-related features or descriptions
    const description = (group.group_description || '').toLowerCase();
    const name = (group.group_descriptive_name || '').toLowerCase();
    
    return (
      description.includes('gpu') ||
      description.includes('graphics') ||
      name.includes('gpu') ||
      name.includes('delta') || // Delta is known GPU system
      group.rollup_feature_ids?.includes(142) // GPU feature ID (if exists)
    );
  }
  
  private determineResourceType(group: any): string {
    const description = (group.group_description || '').toLowerCase();
    const name = (group.group_descriptive_name || '').toLowerCase();
    
    if (description.includes('cloud') || name.includes('jetstream')) {
      return 'cloud';
    }
    if (this.detectGpuCapability(group)) {
      return 'gpu';
    }
    if (description.includes('storage')) {
      return 'storage';
    }
    return 'compute';
  }
  
  
  private async searchResources(args: {
    query?: string;
    resource_type?: string;
    has_gpu?: boolean;
    organization?: string;
    include_resource_ids?: boolean;
  }) {
    const { query, resource_type, has_gpu, organization, include_resource_ids = true } = args;

    // Get all resources first
    const allResourcesResult = await this.listComputeResources();
    const allResourcesData = JSON.parse(allResourcesResult.content[0].text);
    let resources = allResourcesData.resources || [];

    // Apply filters
    if (query) {
      const searchTerm = query.toLowerCase();
      resources = resources.filter((resource: any) =>
        resource.name?.toLowerCase().includes(searchTerm) ||
        resource.description?.toLowerCase().includes(searchTerm) ||
        (Array.isArray(resource.organization_names) &&
         resource.organization_names.some((org: string) =>
           typeof org === 'string' && org.toLowerCase().includes(searchTerm)
         ))
      );
    }

    if (resource_type) {
      resources = resources.filter((resource: any) =>
        resource.resourceType === resource_type
      );
    }

    if (has_gpu !== undefined) {
      resources = resources.filter((resource: any) =>
        resource.hasGpu === has_gpu
      );
    }

    // Organization filter (ENHANCED: works with partial names and searches known orgs)
    if (organization) {
      const orgLower = organization.toLowerCase();

      // Find matching organization IDs from known organizations
      const matchingKnownOrgIds = Object.entries(this.KNOWN_ORGANIZATIONS)
        .filter(([_, name]) => name.toLowerCase().includes(orgLower))
        .map(([id, _]) => parseInt(id));

      resources = resources.filter((resource: any) => {
        if (!Array.isArray(resource.organization_names)) {
          return false;
        }

        // Check if any organization name matches the search
        const nameMatch = resource.organization_names.some((org: string) =>
          typeof org === 'string' && org.toLowerCase().includes(orgLower)
        );

        if (nameMatch) {
          return true;
        }

        // Also check if the organization IDs match known organizations
        // (This handles cases where organization_names contains IDs as strings)
        if (matchingKnownOrgIds.length > 0 && resource.organization_ids) {
          const hasMatchingId = matchingKnownOrgIds.some(knownId =>
            resource.organization_ids.includes(knownId)
          );
          if (hasMatchingId) {
            return true;
          }
        }

        return false;
      });
    }
    
    // Add detailed resource ID information if requested
    if (include_resource_ids) {
      resources = resources.map((resource: any) => ({
        ...resource,
        service_integration: {
          resource_ids: resource.resourceIds,
          available_for_services: resource.resourceIds.length > 0,
          usage_note: resource.resourceIds.length > 0
            ? `Use any of these IDs with other ACCESS-CI services: ${resource.resourceIds.join(', ')}`
            : 'No resource IDs available for service integration',
        },
      }));
    }
    
    // Build response object
    const responseData: any = {
      search_criteria: { query, resource_type, has_gpu, organization, include_resource_ids },
      total_found: resources.length,
      resources: resources,
    };

    // Add usage notes if resource IDs are included
    if (include_resource_ids) {
      responseData.usage_notes = {
        service_integration: "Use any ID from the 'resource_ids' array as 'resource_id' parameter in other ACCESS-CI tools",
        note: "These are the actual resource IDs from the ACCESS-CI operations API",
      };
    }

    // Documentation is not useful in search results (users already know what they want)
    // Removed to keep responses focused

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(responseData, null, 2),
        },
      ],
    };
  }
  
}
