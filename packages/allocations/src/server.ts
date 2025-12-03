import {
  BaseAccessServer,
  handleApiError,
  FIELDS_OF_SCIENCE,
  ALLOCATION_TYPES,
  getFieldNames,
  Tool,
  CallToolResult,
} from "@access-mcp/shared";

/**
 * ACCESS-CI Allocations MCP Server
 * 
 * IMPORTANT CONTEXT FOR AI ASSISTANTS:
 * - ACCESS Credits are computational resource credits, NOT monetary currency
 * - They represent computing time/resources allocated to researchers
 * - Should NEVER be displayed with dollar signs ($) or treated as money
 * - Similar to Service Units (SUs) - they're computational allocation units
 */

// Data interfaces based on API analysis
interface AllocationResource {
  resourceName: string;
  units: string | null;
  allocation: number | null;
  resourceId: number;
}

interface Project {
  projectId: number;
  requestNumber: string;
  requestTitle: string;
  pi: string;
  piInstitution: string;
  fos: string; // Field of Science
  abstract: string;
  allocationType: string;
  beginDate: string;
  endDate: string;
  resources: AllocationResource[];
}

interface ProjectsResponse {
  projects: Project[];
  pages: number;
  filters: Record<string, unknown>;
}

interface SearchProjectsArgs {
  project_id?: number;
  similar_to?: number;
  similarity_keywords?: string;
  limit?: number;
  similarity_threshold?: number;
  include_same_field?: boolean;
  resource_name?: string;
  query?: string;
  field_of_science?: string;
  allocation_type?: string;
  date_range?: { start_date?: string; end_date?: string };
  min_allocation?: number;
  sort_by?: string;
}

interface AnalyzeFundingArgs {
  project_id?: number;
  institution?: string;
  pi_name?: string;
  field_of_science?: string;
  limit?: number;
}

export class AllocationsServer extends BaseAccessServer {
  private projectCache = new Map<number, ProjectsResponse>();
  private cacheTimestamps = new Map<number, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super(
      "access-allocations",
      "0.3.0",
      "https://allocations.access-ci.org",
    );
    
    // Set up periodic cache cleanup - TEMPORARILY DISABLED FOR DEBUGGING
    // setInterval(() => {
    //   this.cleanupExpiredCache();
    // }, 10 * 60 * 1000); // Clean up every 10 minutes
  }

  protected getTools(): Tool[] {
    return [
      {
        name: "search_projects",
        description: "Search ACCESS-CI research projects. Returns {total, items}.",
        inputSchema: {
          type: "object" as const,
          properties: {
            query: {
              type: "string",
              description: "Search query supporting operators: 'term1 AND term2', 'term1 OR term2', 'term1 NOT term2', exact phrases with quotes. Omit when using project_id or similar_to parameters.",
            },
            project_id: {
              type: "number",
              description: "Get detailed information for a specific project ID. When provided, returns full project details including complete abstract.",
            },
            field_of_science: {
              type: "string",
              description: "Filter by field of science (e.g., 'Computer Science', 'Physics')",
            },
            resource_name: {
              type: "string",
              description: "Filter projects using specific computational resources (e.g., 'NCSA Delta GPU', 'Purdue Anvil', 'ACCESS Credits')",
            },
            allocation_type: {
              type: "string",
              description: "Filter by allocation type (e.g., 'Discover', 'Explore', 'Accelerate')",
            },
            date_range: {
              type: "object" as const,
              description: "Filter by project date range",
              properties: {
                start_date: {
                  type: "string",
                  description: "Start date in YYYY-MM-DD format",
                  format: "date"
                },
                end_date: {
                  type: "string",
                  description: "End date in YYYY-MM-DD format",
                  format: "date"
                }
              }
            },
            min_allocation: {
              type: "number",
              description: "Minimum allocation amount filter"
            },
            similar_to: {
              type: "number",
              description: "Find projects similar to this project ID using semantic matching. Omit query parameter when using this.",
            },
            similarity_keywords: {
              type: "string",
              description: "Find projects similar to these keywords/research terms. Alternative to similar_to parameter.",
            },
            similarity_threshold: {
              type: "number",
              description: "Minimum similarity score (0.0-1.0) when using similar_to or similarity_keywords. Default: 0.3",
              default: 0.3,
              minimum: 0.0,
              maximum: 1.0
            },
            include_same_field: {
              type: "boolean",
              description: "Whether to prioritize projects in the same field of science for similarity search (default: true)",
              default: true
            },
            sort_by: {
              type: "string",
              description: "Sort results by: 'relevance', 'date_desc', 'date_asc', 'allocation_desc', 'allocation_asc', 'pi_name'",
              enum: ["relevance", "date_desc", "date_asc", "allocation_desc", "allocation_asc", "pi_name"],
              default: "relevance"
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 20, max: 100)",
              default: 20,
            },
          },
          required: [],
          examples: [
            {
              name: "Search for machine learning projects",
              arguments: {
                query: "machine learning",
                limit: 10
              }
            },
            {
              name: "Get specific project details",
              arguments: {
                project_id: 12345
              }
            },
            {
              name: "List projects by field of science",
              arguments: {
                field_of_science: "Computer Science",
                limit: 20
              }
            },
            {
              name: "Find projects using specific resource",
              arguments: {
                resource_name: "NCSA Delta GPU",
                limit: 15
              }
            },
            {
              name: "Find similar projects",
              arguments: {
                similar_to: 12345,
                similarity_threshold: 0.7,
                limit: 10
              }
            }
          ]
        },
      },
      {
        name: "analyze_funding",
        description: "Analyze NSF funding for ACCESS projects/institutions. Returns detailed markdown analysis.",
        inputSchema: {
          type: "object" as const,
          properties: {
            project_id: {
              type: "number",
              description: "Analyze funding for a specific ACCESS project ID. Returns NSF awards connected to the project's PI and institution.",
            },
            institution: {
              type: "string",
              description: "Generate comprehensive funding profile for an institution. Shows ACCESS allocations, NSF awards, top researchers, and funding trends.",
            },
            pi_name: {
              type: "string",
              description: "Find funded projects by principal investigator name. Cross-references ACCESS and NSF data.",
            },
            has_nsf_funding: {
              type: "boolean",
              description: "Filter to only show ACCESS projects with corresponding NSF funding. Combine with pi_name, institution, or field_of_science.",
            },
            field_of_science: {
              type: "string",
              description: "Filter funded projects by field of science.",
            },
            limit: {
              type: "number",
              description: "Maximum number of projects/awards to return (default: 20 for institution analysis, 10 for others)",
              default: 10,
            },
          },
          required: [],
          examples: [
            {
              name: "Analyze funding for specific project",
              arguments: {
                project_id: 12345
              }
            },
            {
              name: "Generate institutional funding profile",
              arguments: {
                institution: "University of Illinois",
                limit: 20
              }
            },
            {
              name: "Find funded projects by PI",
              arguments: {
                pi_name: "John Smith",
                has_nsf_funding: true
              }
            },
            {
              name: "Find NSF-funded projects in field",
              arguments: {
                field_of_science: "Computer Science",
                has_nsf_funding: true,
                limit: 15
              }
            }
          ]
        },
      },
      {
        name: "get_allocation_statistics",
        description: "Get allocation statistics (top fields, resources, institutions, types). Returns aggregate stats.",
        inputSchema: {
          type: "object" as const,
          properties: {
            pages_to_analyze: {
              type: "number",
              description: "Number of pages to analyze for statistics (default: 5, max: 20)",
              default: 5,
            },
          },
          required: [],
          examples: [
            {
              name: "Get allocation statistics",
              arguments: {
                pages_to_analyze: 5
              }
            },
            {
              name: "Get comprehensive allocation statistics",
              arguments: {
                pages_to_analyze: 10
              }
            }
          ]
        },
      }
    ];
  }

  protected getResources() {
    return [
      {
        uri: "accessci://allocations",
        name: "ACCESS-CI Research Projects and Allocations",
        description: "Current research projects, allocations, and resource utilization data",
        mimeType: "application/json",
      },
      {
        uri: "accessci://allocations/field-taxonomy",
        name: "Field of Science Taxonomy",
        description:
          "NSF field classification with typical resource requirements and allocation ranges for each field",
        mimeType: "application/json",
      },
      {
        uri: "accessci://allocations/allocation-types",
        name: "Allocation Types and Tiers",
        description:
          "Definitions of Discover, Explore, Accelerate, and Maximize allocation tiers with credit ranges and eligibility",
        mimeType: "application/json",
      },
      {
        uri: "accessci://allocations/search-guide",
        name: "Advanced Search Guide",
        description:
          "Guide for using boolean operators, exact phrases, and advanced search syntax",
        mimeType: "text/markdown",
      },
    ];
  }

  async handleToolCall(request: { method: "tools/call"; params: { name: string; arguments?: Record<string, unknown> } }): Promise<CallToolResult> {
    const { name, arguments: args } = request.params;
    const toolArgs = (args || {}) as Record<string, unknown>;

    try {
      switch (name) {
        case "search_projects":
          return await this.searchProjectsRouter(toolArgs as SearchProjectsArgs);
        case "analyze_funding":
          return await this.analyzeFundingRouter(toolArgs as AnalyzeFundingArgs);
        case "get_allocation_statistics":
          return await this.getAllocationStatistics((toolArgs.pages_to_analyze as number) || 5);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${handleApiError(error)}`,
          },
        ],
      };
    }
  }

  async handleResourceRead(request: { params: { uri: string } }) {
    const { uri } = request.params;

    if (uri === "accessci://allocations") {
      try {
        const data = await this.fetchProjects(1);
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(`Failed to fetch allocations data: ${handleApiError(error)}`);
      }
    }

    if (uri === "accessci://allocations/field-taxonomy") {
      return this.createJsonResource(uri, {
        fields_of_science: FIELDS_OF_SCIENCE,
        available_fields: getFieldNames(),
        usage_notes: {
          purpose: "Understand typical resource requirements and allocation sizes for different research fields",
          how_to_use: "Match your research area to a field to see typical resources, software, and allocation ranges",
          allocation_ranges: "Values are in ACCESS Credits (computational resource units, not monetary)",
        },
      });
    }

    if (uri === "accessci://allocations/allocation-types") {
      return this.createJsonResource(uri, {
        allocation_types: ALLOCATION_TYPES,
        quick_guide: {
          "Discover (Startup)": "1K-400K credits - For exploration and code development",
          "Explore (Standard)": "400K-1.5M credits - For established research projects",
          "Accelerate (Advanced)": "1.5M-10M credits - For large-scale research",
          "Maximize (Leadership)": "10M-50M credits - For transformative research",
        },
        choosing_a_tier: {
          step_1: "Estimate your computational needs based on your research field",
          step_2: "Check typical allocation ranges for your field in field-taxonomy",
          step_3: "Start with Discover if you're new or testing feasibility",
          step_4: "Move to higher tiers as your project scales and demonstrates need",
        },
      });
    }

    if (uri === "accessci://allocations/search-guide") {
      const guide = `# Advanced Search Guide for ACCESS Allocations

## Boolean Operators

### AND Operator
Requires **both** terms to be present in results.

**Examples**:
- \`machine learning AND gpu\` - Projects that mention both "machine learning" AND "gpu"
- \`climate AND simulation AND data\` - All three terms must be present

### OR Operator
Returns results with **either** term (or both).

**Examples**:
- \`genomics OR bioinformatics\` - Projects with either term
- \`tensorflow OR pytorch OR jax\` - Projects using any of these frameworks

### NOT Operator
Excludes results containing the specified term.

**Examples**:
- \`machine learning NOT tensorflow\` - ML projects that don't use TensorFlow
- \`physics NOT particle\` - Physics projects except particle physics

### Combining Operators
You can combine multiple operators in one query.

**Examples**:
- \`(machine learning OR deep learning) AND gpu NOT tensorflow\`
- \`climate AND (modeling OR simulation) NOT weather\`

## Exact Phrases

Use quotes for exact phrase matching.

**Examples**:
- \`"large language model"\` - Exact phrase match
- \`"genome assembly" AND "high memory"\` - Both exact phrases required

## Search Tips

### By Research Domain
- Use field-specific keywords from the field taxonomy
- Example: For Computer Science → \`"machine learning" OR "data science" OR HPC\`

### By Resource Type
- \`gpu\` - GPU-using projects
- \`"high memory"\` - Memory-intensive projects
- \`storage\` - Storage-heavy projects

### By Software
- \`gromacs\` - Molecular dynamics with GROMACS
- \`tensorflow OR pytorch\` - Deep learning frameworks
- \`"quantum espresso"\` - Quantum chemistry software

### By Allocation Size
Use the \`min_allocation\` parameter instead of search terms:
- \`min_allocation: 100000\` - Projects with ≥100K credits
- Combined: \`query: "machine learning", min_allocation: 500000\`

## Field of Science Filters

Instead of searching, use the \`field_of_science\` parameter:
- \`field_of_science: "Computer Science"\`
- \`field_of_science: "Biological Sciences"\`

Available fields: ${getFieldNames().join(", ")}

## Sorting Results

Use \`sort_by\` parameter:
- \`relevance\` - Best match for search terms (default)
- \`date_desc\` - Newest projects first
- \`allocation_desc\` - Largest allocations first
- \`pi_name\` - Alphabetical by PI

## Example Workflows

### Find Similar GPU Projects
\`\`\`
query: "(machine learning OR deep learning) AND gpu"
field_of_science: "Computer Science"
sort_by: "allocation_desc"
limit: 20
\`\`\`

### Genomics Projects with High Memory
\`\`\`
query: "genome assembly" OR metagenomics
min_allocation: 100000
sort_by: "date_desc"
\`\`\`

### Recent Climate Modeling Projects
\`\`\`
field_of_science: "Earth Sciences"
query: climate AND (modeling OR simulation)
date_range: {start_date: "2024-01-01"}
sort_by: "date_desc"
\`\`\`
`;
      return this.createMarkdownResource(uri, guide);
    }

    throw new Error(`Unknown resource: ${uri}`);
  }

  // Core API methods
  private async fetchProjects(page: number = 1): Promise<ProjectsResponse> {
    // Check cache first
    const cachedData = this.getCachedProjects(page);
    if (cachedData) {
      return cachedData;
    }

    const url = `${this.baseURL}/current-projects.json?page=${page}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Cache the result
      this.cacheProjects(page, data);
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch projects: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getCachedProjects(page: number): ProjectsResponse | null {
    const cached = this.projectCache.get(page);
    const timestamp = this.cacheTimestamps.get(page);
    
    if (cached && timestamp && (Date.now() - timestamp) < this.CACHE_TTL) {
      return cached;
    }
    
    // Clean up expired cache
    if (timestamp && (Date.now() - timestamp) >= this.CACHE_TTL) {
      this.projectCache.delete(page);
      this.cacheTimestamps.delete(page);
    }
    
    return null;
  }

  private cacheProjects(page: number, data: ProjectsResponse): void {
    this.projectCache.set(page, data);
    this.cacheTimestamps.set(page, Date.now());
  }

  private async fetchMultiplePages(pages: number[], maxConcurrent: number = 5): Promise<Project[]> {
    const results: Project[] = [];
    
    // Process pages in batches to avoid overwhelming the server
    for (let i = 0; i < pages.length; i += maxConcurrent) {
      const batch = pages.slice(i, i + maxConcurrent);
      const promises = batch.map(page => this.fetchProjects(page));
      
      try {
        const batchResults = await Promise.all(promises);
        batchResults.forEach(data => {
          results.push(...data.projects);
        });
      } catch (error) {
        // Log error but continue with other batches
        console.warn(`Error fetching batch starting at page ${batch[0]}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Router for consolidated search_projects tool
   * Routes to appropriate handler based on parameters
   */
  private async searchProjectsRouter(args: SearchProjectsArgs) {
    // Get specific project details
    if (args.project_id) {
      return await this.getProjectDetails(args.project_id);
    }

    // Find similar projects
    if (args.similar_to || args.similarity_keywords) {
      return await this.findSimilarProjects(
        args.similar_to,
        args.similarity_keywords,
        args.limit,
        args.similarity_threshold,
        args.include_same_field
      );
    }

    // List projects by resource
    if (args.resource_name && !args.query) {
      return await this.listProjectsByResource(args.resource_name, args.limit);
    }

    // List projects by field (when field provided without query)
    if (args.field_of_science && !args.query && !args.resource_name && !args.allocation_type) {
      return await this.listProjectsByField(args.field_of_science, args.limit);
    }

    // List/filter projects by allocation_type (when provided without query)
    if (args.allocation_type && !args.query && !args.resource_name) {
      return await this.listProjectsByAllocationType(args.allocation_type, args.field_of_science, args.limit);
    }

    // Standard search with optional filters
    if (args.query) {
      return await this.searchProjects(
        args.query,
        args.field_of_science,
        args.allocation_type,
        args.limit,
        args.date_range,
        args.min_allocation,
        args.sort_by
      );
    }

    // If no parameters provided, return error
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: "Please provide at least one search parameter: query, project_id, field_of_science, resource_name, allocation_type, similar_to, or similarity_keywords"
          }, null, 2)
        }
      ]
    };
  }

  /**
   * Router for consolidated analyze_funding tool
   * Routes to appropriate handler based on parameters
   */
  private async analyzeFundingRouter(args: AnalyzeFundingArgs) {
    // Analyze specific project funding
    if (args.project_id) {
      return await this.analyzeProjectFunding(args.project_id);
    }

    // Generate institutional funding profile
    if (args.institution) {
      return await this.institutionalFundingProfile(args.institution, args.limit || 20);
    }

    // Find funded projects (with or without filters)
    return await this.findFundedProjects(
      args.pi_name,
      args.institution,
      args.field_of_science,
      args.limit || 10
    );
  }

  private async searchProjects(
    query: string, 
    fieldOfScience?: string, 
    allocationType?: string, 
    limit: number = 20,
    dateRange?: { start_date?: string; end_date?: string },
    minAllocation?: number,
    sortBy: string = 'relevance'
  ) {
    // Input validation
    if (!query || query.trim().length === 0) {
      throw new Error("Search query cannot be empty");
    }
    
    if (limit > 100) limit = 100; // Cap at 100
    
    // Parse advanced search query
    const searchTerms = this.parseAdvancedQuery(query);
    
    // Use parallel fetching for better performance
    const maxPages = Math.min(15, limit > 50 ? 20 : 15);

    // Fetch first page to get total pages available
    const firstPageData = await this.fetchProjects(1);
    const totalPages = Math.min(firstPageData.pages, maxPages);
    const actualPages = Array.from({length: totalPages}, (_, i) => i + 1);
    
    // Fetch all pages in parallel
    const allProjects = await this.fetchMultiplePages(actualPages);
    
    // Apply filters
    const filteredProjects = allProjects.filter(project => {
      // Date range filter
      if (dateRange) {
        const projectStart = new Date(project.beginDate);
        const projectEnd = new Date(project.endDate);
        
        if (dateRange.start_date) {
          const filterStart = new Date(dateRange.start_date);
          if (projectEnd < filterStart) return false;
        }
        
        if (dateRange.end_date) {
          const filterEnd = new Date(dateRange.end_date);
          if (projectStart > filterEnd) return false;
        }
      }
      
      // Minimum allocation filter
      if (minAllocation) {
        const totalAllocation = project.resources.reduce((sum, r) => sum + (r.allocation || 0), 0);
        if (totalAllocation < minAllocation) return false;
      }
      
      return true;
    });
    
    // Score and filter projects based on search terms
    const scoredResults = filteredProjects
      .map(project => ({
        project,
        score: this.calculateAdvancedSearchScore(project, searchTerms, fieldOfScience, allocationType)
      }))
      .filter(item => item.score > 0);

    // Apply sorting
    const sortedResults = this.applySorting(scoredResults, sortBy).slice(0, limit);

    // Return in universal {total, items} format
    const items = sortedResults.map(({project, score}) => ({
      ...project,
      relevance_score: score > 0 ? score : undefined
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            total: items.length,
            items: items
          }, null, 2),
        },
      ],
    };
  }

  // Parse advanced search query with operators
  private parseAdvancedQuery(query: string): {
    andTerms: string[];
    orTerms: string[];
    notTerms: string[];
    exactPhrases: string[];
    regularTerms: string[];
  } {
    const result = {
      andTerms: [] as string[],
      orTerms: [] as string[],
      notTerms: [] as string[],
      exactPhrases: [] as string[],
      regularTerms: [] as string[]
    };

    // Extract exact phrases first (quoted strings)
    const phraseRegex = /"([^"]*)"/g;
    let match;
    let queryWithoutPhrases = query;
    
    while ((match = phraseRegex.exec(query)) !== null) {
      result.exactPhrases.push(match[1]);
      queryWithoutPhrases = queryWithoutPhrases.replace(match[0], '');
    }

    // Parse remaining query for operators
    const tokens = queryWithoutPhrases.split(/\s+/).filter(token => token.length > 0);
    let i = 0;
    
    while (i < tokens.length) {
      const token = tokens[i];
      
      if (token.toUpperCase() === 'AND' && i + 1 < tokens.length) {
        result.andTerms.push(tokens[i + 1]);
        i += 2;
      } else if (token.toUpperCase() === 'OR' && i + 1 < tokens.length) {
        result.orTerms.push(tokens[i + 1]);
        i += 2;
      } else if (token.toUpperCase() === 'NOT' && i + 1 < tokens.length) {
        result.notTerms.push(tokens[i + 1]);
        i += 2;
      } else if (!['AND', 'OR', 'NOT'].includes(token.toUpperCase())) {
        result.regularTerms.push(token);
        i++;
      } else {
        i++;
      }
    }

    return result;
  }

  // Enhanced search scoring with advanced query support
  private calculateAdvancedSearchScore(
    project: Project, 
    searchTerms: ReturnType<typeof this.parseAdvancedQuery>,
    fieldOfScience?: string, 
    allocationType?: string
  ): number {
    let score = 0;
    
    // Field of science filter (required match)
    if (fieldOfScience && !project.fos.toLowerCase().includes(fieldOfScience.toLowerCase())) {
      return 0;
    }
    
    // Allocation type filter (required match)
    if (allocationType && !project.allocationType.toLowerCase().includes(allocationType.toLowerCase())) {
      return 0;
    }

    const projectText = (project.abstract + ' ' + project.requestTitle + ' ' + project.pi).toLowerCase();
    const titleText = project.requestTitle.toLowerCase();

    // Handle NOT terms first (exclusions)
    for (const notTerm of searchTerms.notTerms) {
      if (projectText.includes(notTerm.toLowerCase())) {
        return 0; // Exclude if any NOT term is found
      }
    }

    // Exact phrases (highest weight)
    for (const phrase of searchTerms.exactPhrases) {
      if (projectText.includes(phrase.toLowerCase())) {
        score += titleText.includes(phrase.toLowerCase()) ? 5 : 3;
      }
    }

    // AND terms (all must be present)
    if (searchTerms.andTerms.length > 0) {
      const andMatches = searchTerms.andTerms.filter(term => 
        projectText.includes(term.toLowerCase())
      );
      if (andMatches.length === searchTerms.andTerms.length) {
        score += 2 * andMatches.length;
      } else {
        return 0; // All AND terms must match
      }
    }

    // OR terms (any can be present)
    if (searchTerms.orTerms.length > 0) {
      const orMatches = searchTerms.orTerms.filter(term => 
        projectText.includes(term.toLowerCase())
      );
      score += orMatches.length * 1.5;
    }

    // Regular terms
    for (const term of searchTerms.regularTerms) {
      if (!this.isStopWord(term) && term.length > 2) {
        const termLower = term.toLowerCase();
        if (titleText.includes(termLower)) score += 3;
        else if (project.pi.toLowerCase().includes(termLower)) score += 2;
        else if (project.fos.toLowerCase().includes(termLower)) score += 1.5;
        else if (project.abstract.toLowerCase().includes(termLower)) score += 1;
        else if (project.piInstitution.toLowerCase().includes(termLower)) score += 0.5;
      }
    }

    return Math.min(score, 20); // Cap at reasonable maximum
  }

  // Apply sorting to search results
  private applySorting(scoredResults: Array<{project: Project; score: number}>, sortBy: string): Array<{project: Project; score: number}> {
    switch (sortBy) {
      case 'date_desc':
        return scoredResults.sort((a, b) => new Date(b.project.beginDate).getTime() - new Date(a.project.beginDate).getTime());
      case 'date_asc':
        return scoredResults.sort((a, b) => new Date(a.project.beginDate).getTime() - new Date(b.project.beginDate).getTime());
      case 'allocation_desc':
        return scoredResults.sort((a, b) => {
          const aTotal = a.project.resources.reduce((sum, r) => sum + (r.allocation || 0), 0);
          const bTotal = b.project.resources.reduce((sum, r) => sum + (r.allocation || 0), 0);
          return bTotal - aTotal;
        });
      case 'allocation_asc':
        return scoredResults.sort((a, b) => {
          const aTotal = a.project.resources.reduce((sum, r) => sum + (r.allocation || 0), 0);
          const bTotal = b.project.resources.reduce((sum, r) => sum + (r.allocation || 0), 0);
          return aTotal - bTotal;
        });
      case 'pi_name':
        return scoredResults.sort((a, b) => a.project.pi.localeCompare(b.project.pi));
      case 'relevance':
      default:
        return scoredResults.sort((a, b) => b.score - a.score);
    }
  }


  private calculateSearchScore(project: Project, query: string, fieldOfScience?: string, allocationType?: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Field of science filter (required match)
    if (fieldOfScience && !project.fos.toLowerCase().includes(fieldOfScience.toLowerCase())) {
      return 0;
    }
    
    // Allocation type filter (required match)
    if (allocationType && !project.allocationType.toLowerCase().includes(allocationType.toLowerCase())) {
      return 0;
    }
    
    // Basic query matching with scoring
    const titleMatch = project.requestTitle.toLowerCase().includes(queryLower);
    const abstractMatch = project.abstract.toLowerCase().includes(queryLower);
    const piMatch = project.pi.toLowerCase().includes(queryLower);
    const institutionMatch = project.piInstitution.toLowerCase().includes(queryLower);
    const fosMatch = project.fos.toLowerCase().includes(queryLower);
    
    // Weighted scoring
    if (titleMatch) score += 3;
    if (piMatch) score += 2;
    if (fosMatch) score += 1.5;
    if (institutionMatch) score += 1;
    if (abstractMatch) score += 0.5;
    
    // Exact matches get bonus points
    if (project.requestTitle.toLowerCase() === queryLower) score += 5;
    if (project.pi.toLowerCase() === queryLower) score += 3;
    
    return score;
  }

  private projectMatchesQuery(project: Project, query: string): boolean {
    const searchTerms = query.toLowerCase();
    return (
      project.requestTitle.toLowerCase().includes(searchTerms) ||
      project.abstract.toLowerCase().includes(searchTerms) ||
      project.pi.toLowerCase().includes(searchTerms) ||
      project.piInstitution.toLowerCase().includes(searchTerms) ||
      project.fos.toLowerCase().includes(searchTerms)
    );
  }

  private async getProjectDetails(projectId: number) {
    // Input validation
    if (!projectId || typeof projectId !== 'number' || projectId <= 0) {
      throw new Error("Project ID must be a positive number");
    }

    // Search through pages to find the specific project
    let currentPage = 1;
    const maxPages = 20;

    while (currentPage <= maxPages) {
      const data = await this.fetchProjects(currentPage);
      
      const project = data.projects.find(p => p.projectId === projectId);
      if (project) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                total: 1,
                items: [project]
              }, null, 2),
            },
          ],
        };
      }

      currentPage++;
      if (currentPage > data.pages) break;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: `Project with ID ${projectId} not found in current allocations.`
          }, null, 2),
        },
      ],
    };
  }

  private async listProjectsByField(fieldOfScience: string, limit: number = 20) {
    // Input validation
    if (!fieldOfScience || typeof fieldOfScience !== 'string' || fieldOfScience.trim().length === 0) {
      throw new Error("Field of science must be a non-empty string");
    }
    
    if (limit < 1 || limit > 200) {
      throw new Error("Limit must be between 1 and 200");
    }

    const results: Project[] = [];
    let currentPage = 1;
    const maxPages = 10;

    while (results.length < limit && currentPage <= maxPages) {
      const data = await this.fetchProjects(currentPage);
      
      for (const project of data.projects) {
        if (results.length >= limit) break;
        
        if (project.fos.toLowerCase().includes(fieldOfScience.toLowerCase())) {
          results.push(project);
        }
      }

      currentPage++;
      if (currentPage > data.pages) break;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            total: results.length,
            items: results
          }, null, 2),
        },
      ],
    };
  }

  /**
   * List projects by allocation type, optionally filtered by field of science
   */
  private async listProjectsByAllocationType(allocationType: string, fieldOfScience?: string, limit: number = 20) {
    // Input validation
    if (!allocationType || typeof allocationType !== 'string' || allocationType.trim().length === 0) {
      throw new Error("Allocation type must be a non-empty string");
    }

    if (limit < 1 || limit > 200) {
      throw new Error("Limit must be between 1 and 200");
    }

    const results: Project[] = [];
    let currentPage = 1;
    const maxPages = 10;

    while (results.length < limit && currentPage <= maxPages) {
      const data = await this.fetchProjects(currentPage);

      for (const project of data.projects) {
        if (results.length >= limit) break;

        // Match allocation type (case-insensitive)
        const typeMatch = project.allocationType.toLowerCase().includes(allocationType.toLowerCase());

        // If field is also specified, require both to match
        const fieldMatch = !fieldOfScience ||
          project.fos.toLowerCase().includes(fieldOfScience.toLowerCase());

        if (typeMatch && fieldMatch) {
          results.push(project);
        }
      }

      currentPage++;
      if (currentPage > data.pages) break;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            total: results.length,
            items: results,
            filters_applied: {
              allocation_type: allocationType,
              ...(fieldOfScience && { field_of_science: fieldOfScience })
            }
          }, null, 2),
        },
      ],
    };
  }

  private async listProjectsByResource(resourceName: string, limit: number = 20) {
    // Input validation
    if (!resourceName || typeof resourceName !== 'string' || resourceName.trim().length === 0) {
      throw new Error("Resource name must be a non-empty string");
    }

    if (limit < 1 || limit > 200) {
      throw new Error("Limit must be between 1 and 200");
    }

    const results: Project[] = [];
    let currentPage = 1;
    const maxPages = 10;

    while (results.length < limit && currentPage <= maxPages) {
      const data = await this.fetchProjects(currentPage);
      
      for (const project of data.projects) {
        if (results.length >= limit) break;
        
        const hasResource = project.resources.some(resource => 
          resource.resourceName.toLowerCase().includes(resourceName.toLowerCase())
        );
        
        if (hasResource) {
          results.push(project);
        }
      }

      currentPage++;
      if (currentPage > data.pages) break;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            total: results.length,
            items: results
          }, null, 2),
        },
      ],
    };
  }

  private async getAllocationStatistics(pagesToAnalyze: number = 5) {
    // Input validation
    if (pagesToAnalyze < 1 || pagesToAnalyze > 20) {
      throw new Error("Pages to analyze must be between 1 and 20");
    }

    const projects: Project[] = [];
    const fieldsMap = new Map<string, number>();
    const resourcesMap = new Map<string, number>();
    const institutionsMap = new Map<string, number>();
    const allocationTypesMap = new Map<string, number>();

    // Collect data from multiple pages using parallel fetching for better performance
    const pagesToFetch = Array.from({length: Math.min(pagesToAnalyze, 20)}, (_, i) => i + 1);
    const allProjects = await this.fetchMultiplePages(pagesToFetch);
    projects.push(...allProjects);
      
    // Update statistics
    for (const project of allProjects) {
      fieldsMap.set(project.fos, (fieldsMap.get(project.fos) || 0) + 1);
      institutionsMap.set(project.piInstitution, (institutionsMap.get(project.piInstitution) || 0) + 1);
      allocationTypesMap.set(project.allocationType, (allocationTypesMap.get(project.allocationType) || 0) + 1);
      
      for (const resource of project.resources) {
        resourcesMap.set(resource.resourceName, (resourcesMap.get(resource.resourceName) || 0) + 1);
      }
    }

    // Format statistics
    const topFields = Array.from(fieldsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const topResources = Array.from(resourcesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const topInstitutions = Array.from(institutionsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const allocationTypes = Array.from(allocationTypesMap.entries())
      .sort((a, b) => b[1] - a[1]);

    let statsText = `📊 **ACCESS-CI Allocation Statistics**\n`;
    statsText += `*(Analysis of ${projects.length} projects from ${pagesToAnalyze} pages)*\n\n`;

    statsText += `**🔬 Top Fields of Science:**\n`;
    topFields.forEach(([field, count], i) => {
      statsText += `${i + 1}. ${field}: ${count} projects\n`;
    });

    statsText += `\n**💻 Most Requested Resources:**\n`;
    topResources.forEach(([resource, count], i) => {
      statsText += `${i + 1}. ${resource}: ${count} projects\n`;
    });

    statsText += `\n**🏛️ Top Institutions:**\n`;
    topInstitutions.forEach(([institution, count], i) => {
      statsText += `${i + 1}. ${institution}: ${count} projects\n`;
    });

    statsText += `\n**📈 Allocation Types:**\n`;
    allocationTypes.forEach(([type, count]) => {
      statsText += `• ${type}: ${count} projects\n`;
    });

    return {
      content: [
        {
          type: "text" as const,
          text: statsText,
        },
      ],
    };
  }

  private async findSimilarProjects(
    projectId?: number,
    keywords?: string,
    limit: number = 10,
    similarityThreshold: number = 0.3,
    includeSameField: boolean = true
  ) {
    let referenceProject: Project | null = null;
    let searchTerms: string = "";
    let referenceField: string = "";

    // Input validation
    if (limit > 50) limit = 50;
    if (similarityThreshold < 0) similarityThreshold = 0;
    if (similarityThreshold > 1) similarityThreshold = 1;

    // Get reference project if projectId provided
    if (projectId) {
      let currentPage = 1;
      const maxPages = 20;

      while (currentPage <= maxPages && !referenceProject) {
        const data = await this.fetchProjects(currentPage);
        referenceProject = data.projects.find(p => p.projectId === projectId) || null;
        currentPage++;
        if (currentPage > data.pages) break;
      }

      if (!referenceProject) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: `Project with ID ${projectId} not found in current allocations database.`
              }, null, 2),
            },
          ],
        };
      }

      // Extract sophisticated search terms from reference project
      searchTerms = this.extractKeyTermsFromProject(referenceProject);
      referenceField = referenceProject.fos;
    } else if (keywords) {
      searchTerms = keywords;
      referenceField = ""; // No specific field for keyword searches
    } else {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "Please provide either a project_id or keywords to find similar projects."
            }, null, 2),
          },
        ],
      };
    }

    // Fetch projects for similarity analysis
    const maxPages = 15;
    const actualPages = Array.from({length: maxPages}, (_, i) => i + 1);
    const allProjects = await this.fetchMultiplePages(actualPages);

    // Calculate similarity scores for all projects
    const scoredResults = allProjects
      .filter(project => !referenceProject || project.projectId !== referenceProject.projectId) // Exclude reference project
      .map(project => ({
        project,
        similarity: this.calculateAdvancedSimilarity(project, searchTerms, referenceField, includeSameField)
      }))
      .filter(item => item.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Return in universal {total, items} format with similarity scores
    const items = scoredResults.map(({project, similarity}) => ({
      ...project,
      similarity_score: similarity
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            total: items.length,
            items: items
          }, null, 2),
        },
      ],
    };
  }

  // Extract sophisticated key terms from a project
  private extractKeyTermsFromProject(project: Project): string {
    // Combine title, abstract, and field for comprehensive term extraction
    const titleWords = project.requestTitle.toLowerCase().split(/\s+/);
    const abstractWords = project.abstract.toLowerCase().split(/\s+/);
    const fieldWords = project.fos.toLowerCase().split(/\s+/);

    // Weight terms: title (high), field (medium), abstract (medium)
    const termFrequency = new Map<string, number>();
    
    // Title terms get higher weight
    titleWords.forEach(word => {
      if (word.length > 3 && !this.isStopWord(word)) {
        termFrequency.set(word, (termFrequency.get(word) || 0) + 3);
      }
    });

    // Field terms get medium-high weight
    fieldWords.forEach(word => {
      if (word.length > 3 && !this.isStopWord(word)) {
        termFrequency.set(word, (termFrequency.get(word) || 0) + 2);
      }
    });

    // Abstract terms - focus on first 50 words (usually most relevant)
    abstractWords.slice(0, 50).forEach(word => {
      if (word.length > 3 && !this.isStopWord(word)) {
        termFrequency.set(word, (termFrequency.get(word) || 0) + 1);
      }
    });

    // Return top weighted terms
    return Array.from(termFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
      .join(' ');
  }

  // Advanced similarity calculation with multiple factors
  private calculateAdvancedSimilarity(
    project: Project, 
    searchTerms: string, 
    referenceField: string,
    includeSameField: boolean
  ): number {
    let similarity = 0;
    
    // Field of science similarity (high weight if same field)
    if (referenceField && includeSameField) {
      if (project.fos.toLowerCase() === referenceField.toLowerCase()) {
        similarity += 0.4; // 40% boost for same field
      } else if (project.fos.toLowerCase().includes(referenceField.toLowerCase()) || 
                 referenceField.toLowerCase().includes(project.fos.toLowerCase())) {
        similarity += 0.2; // 20% boost for related fields
      }
    }

    // Text similarity analysis
    const searchWords = searchTerms.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));

    if (searchWords.length === 0) return similarity;

    // Term matching with position-based weighting
    const titleText = project.requestTitle.toLowerCase();
    const abstractText = project.abstract.toLowerCase();
    
    let titleMatches = 0;
    let abstractMatches = 0;
    const totalTerms = searchWords.length;

    searchWords.forEach(term => {
      if (titleText.includes(term)) {
        titleMatches++;
        similarity += 0.15; // Title matches are very valuable
      } else if (abstractText.includes(term)) {
        abstractMatches++;
        similarity += 0.05; // Abstract matches are good
      }
    });

    // Bonus for multiple term clusters
    const termCoverage = (titleMatches + abstractMatches) / totalTerms;
    if (termCoverage > 0.5) {
      similarity += 0.1 * termCoverage; // Bonus for good term coverage
    }

    // Resource type similarity (same computational needs might indicate similar research)
    // This is more sophisticated than basic keyword matching
    const resourceSimilarity = this.calculateResourceSimilarity(project, searchTerms);
    similarity += resourceSimilarity * 0.1;

    // PI institution clustering (same institution might indicate similar research environment)
    // This is a weak signal but can be useful for collaboration discovery
    
    return Math.min(similarity, 1.0); // Cap at 1.0
  }

  // Calculate resource-based similarity
  private calculateResourceSimilarity(project: Project, searchTerms: string): number {
    // Check if resource needs align with search context
    const resourceTypes = project.resources.map(r => r.resourceName.toLowerCase());
    const searchLower = searchTerms.toLowerCase();
    
    let resourceScore = 0;
    
    // GPU resources for AI/ML research
    if ((searchLower.includes('machine') || searchLower.includes('neural') || searchLower.includes('deep')) &&
        resourceTypes.some(r => r.includes('gpu'))) {
      resourceScore += 0.5;
    }
    
    // HPC resources for simulation/modeling
    if ((searchLower.includes('simulation') || searchLower.includes('modeling') || searchLower.includes('computational')) &&
        resourceTypes.some(r => r.includes('cpu') || r.includes('core'))) {
      resourceScore += 0.3;
    }
    
    // Storage for data-intensive research
    if ((searchLower.includes('data') || searchLower.includes('analysis') || searchLower.includes('dataset')) &&
        resourceTypes.some(r => r.includes('storage'))) {
      resourceScore += 0.2;
    }
    
    return Math.min(resourceScore, 1.0);
  }


  private calculateProjectSimilarity(project: Project, searchTerms: string, referenceField?: string): number {
    let score = 0;
    
    // Field of science match (high importance)
    if (referenceField && project.fos.toLowerCase() === referenceField.toLowerCase()) {
      score += 0.6;
    } else if (referenceField && project.fos.toLowerCase().includes(referenceField.toLowerCase())) {
      score += 0.3;
    }

    // Enhanced text similarity with weighted scoring
    const titleText = project.requestTitle.toLowerCase();
    const keywords = searchTerms.toLowerCase()
      .split(' ')
      .filter(word => word.length > 3 && !this.isStopWord(word));
    
    if (keywords.length === 0) return score;
    
    // Title matches (highest weight)
    const titleMatches = keywords.filter(keyword => titleText.includes(keyword));
    score += (titleMatches.length / keywords.length) * 0.4;
    
    // Abstract matches
    const abstractMatches = keywords.filter(keyword => 
      project.abstract.toLowerCase().includes(keyword) && !titleText.includes(keyword)
    );
    score += (abstractMatches.length / keywords.length) * 0.3;
    
    // Bonus for multiple keyword clusters
    if (titleMatches.length > 1 && abstractMatches.length > 0) {
      score += 0.2;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  private isStopWord(word: string): boolean {
    // Standard English stop words commonly used in text analysis
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'cannot',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
      'all', 'any', 'each', 'every', 'some', 'many', 'much', 'more', 'most', 'other',
      'than', 'then', 'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom',
      'from', 'into', 'over', 'under', 'above', 'below', 'up', 'down', 'out', 'off', 
      'through', 'during', 'before', 'after', 'between', 'among', 'within', 'without'
    ];
    return stopWords.includes(word.toLowerCase());
  }

  // Cache management methods
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [page, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp >= this.CACHE_TTL) {
        this.projectCache.delete(page);
        this.cacheTimestamps.delete(page);
      }
    }
  }

  private clearCache(): void {
    this.projectCache.clear();
    this.cacheTimestamps.clear();
  }



  // Helper Methods

  // Formatting helpers
  private formatAllocation(allocation: number, units: string | null, resourceName: string): string {
    // Smart formatting for different resource types
    // IMPORTANT: ACCESS Credits are computational credits, NOT monetary values
    // They should never be displayed with dollar signs or currency formatting
    if (!allocation || !units) {
      return '';
    }

    // ACCESS Credits should never have dollar signs
    if (units.toLowerCase().includes('access credits') || 
        resourceName.toLowerCase().includes('access credits')) {
      return `${allocation.toLocaleString()} ACCESS Credits`;
    }

    // Handle specific unit types
    switch (units.toLowerCase()) {
      case 'su':
      case 'sus':
        return `${allocation.toLocaleString()} SUs (Service Units)`;
      case 'gpu hours':
        return `${allocation.toLocaleString()} GPU Hours`;
      case 'core-hours':
        return `${allocation.toLocaleString()} Core-Hours`;
      case 'gb':
        return `${allocation.toLocaleString()} GB`;
      case 'tb':
        return `${allocation.toLocaleString()} TB`;
      default:
        // For unknown units, avoid currency formatting
        return `${allocation.toLocaleString()} ${units}`;
    }
  }


  // NSF Integration Methods
  private async analyzeProjectFunding(projectId: number) {
    try {
      // Get the ACCESS project details directly
      let accessProject: Project | null = null;
      let currentPage = 1;
      const maxPages = 20;

      while (currentPage <= maxPages && !accessProject) {
        const data = await this.fetchProjects(currentPage);
        accessProject = data.projects.find(p => p.projectId === projectId) || null;
        currentPage++;
        if (currentPage > data.pages) break;
      }

      if (!accessProject) {
        return {
          content: [
            {
              type: "text" as const,
              text: `ACCESS project ${projectId} not found in current allocations database.`,
            },
          ],
        };
      }

      // Step 1: Get multiple name variations for better matching
      const piNameVariations = this.generatePINameVariations(accessProject.pi);

      // Step 2: Search NSF database with exact name matching
      const nsfSearchResults = new Map<string, string>();
      const relevantAwards: string[] = [];

      for (const nameVariation of piNameVariations) {
        try {
          const nsfData = await this.callRemoteServer("nsf-awards", "search_nsf_awards", {
            personnel: nameVariation,
            limit: 3
          }) as { content?: Array<{ text?: string }> };
          const nsfResponse = this.formatNsfResponse(nsfData);

          if (nsfResponse && !nsfResponse.includes("Error") && !nsfResponse.includes("not available")) {
            nsfSearchResults.set(nameVariation, nsfResponse);
            
            // Parse and filter for exact matches
            const exactMatches = this.parseNSFResponseExact(nsfResponse, accessProject.pi);
            relevantAwards.push(...exactMatches);
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (error) {
          console.warn(`Error searching NSF for name variation "${nameVariation}":`, error);
        }
      }

      // Step 3: Cross-validate with institution matching
      const institutionValidatedAwards = relevantAwards.filter(award => 
        this.validateInstitutionMatch(award, accessProject.piInstitution)
      );

      // Step 4: Analyze temporal alignment
      const temporalAnalysis = this.analyzeTemporalAlignment(
        institutionValidatedAwards, 
        accessProject.beginDate, 
        accessProject.endDate
      );

      // Step 5: Generate comprehensive analysis
      let result = `🔗 **Comprehensive Funding Analysis**\n`;
      result += `**ACCESS Project ${projectId}**\n\n`;
      
      result += `**📋 Project Details:**\n`;
      result += `• **Title:** ${accessProject.requestTitle}\n`;
      result += `• **PI:** ${accessProject.pi} (${accessProject.piInstitution})\n`;
      result += `• **Field:** ${accessProject.fos}\n`;
      result += `• **Period:** ${accessProject.beginDate} to ${accessProject.endDate}\n`;
      result += `• **Resources:** ${this.summarizeResources(accessProject.resources)}\n\n`;

      result += `**🔍 NSF Award Search Strategy:**\n`;
      result += `• **Name Variations Searched:** ${piNameVariations.join(', ')}\n`;
      result += `• **Total NSF Responses:** ${nsfSearchResults.size}\n`;
      result += `• **Raw Awards Found:** ${relevantAwards.length}\n`;
      result += `• **Institution-Validated Awards:** ${institutionValidatedAwards.length}\n\n`;

      if (institutionValidatedAwards.length > 0) {
        result += `**🏆 Validated NSF Awards:**\n`;
        institutionValidatedAwards.forEach((award, index) => {
          result += `${index + 1}. ${award}\n`;
        });
        result += `\n`;

        result += `**⏰ Temporal Analysis:**\n${temporalAnalysis}\n\n`;

        result += `**🎯 Funding Integration Insights:**\n`;
        result += `• **Strong Correlation:** ${institutionValidatedAwards.length} validated NSF award(s) for this PI\n`;
        result += `• **Research Continuity:** NSF funding supports computational research on ACCESS\n`;
        result += `• **Resource Optimization:** Federal investment leverages cyberinfrastructure\n`;
        result += `• **Impact Multiplier:** Combined funding amplifies research potential\n`;
      } else {
        result += `**🏆 NSF Award Analysis:**\n`;
        if (relevantAwards.length > 0) {
          result += `Found ${relevantAwards.length} potential awards but none passed institution validation:\n`;
          relevantAwards.slice(0, 3).forEach((award, index) => {
            result += `${index + 1}. ${award}\n`;
          });
          result += `\n**⚠️ Validation Issues:**\n`;
          result += `• Institution names may differ between ACCESS and NSF systems\n`;
          result += `• PI may have moved institutions since award\n`;
          result += `• Awards may be under different name formats\n`;
        } else {
          result += `No NSF awards found for PI "${accessProject.pi}" variations.\n\n`;
          result += `**💡 Possible Explanations:**\n`;
          result += `• PI may have NSF funding under different name format\n`;
          result += `• Research may be funded by other federal agencies (DOE, NIH, etc.)\n`;
          result += `• Early career researcher or industry collaboration\n`;
          result += `• Exploratory ACCESS allocation for preliminary work\n`;
        }

        result += `\n**🔬 Alternative Analysis:**\n`;
        result += `• **Field-based Assessment:** Compare with other ${accessProject.fos} projects\n`;
        result += `• **Resource Utilization:** Analyze computational requirements vs. allocation\n`;
        result += `• **Institution Profile:** Review overall ${accessProject.piInstitution} funding patterns\n`;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error analyzing project funding: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  /**
   * Generate comprehensive PI name variations to handle different name formats.
   * Handles: format variations, middle initials, hyphenated names, suffixes, etc.
   *
   * CRITICAL FIX: Enhanced to handle more name format variations
   */
  private generatePINameVariations(piName: string): string[] {
    const variations = [piName];

    // Remove common suffixes for matching (Jr., Sr., II, III, etc.)
    const suffixes = /\b(Jr\.?|Sr\.?|II|III|IV|PhD|Ph\.D\.)\s*$/i;
    const nameWithoutSuffix = piName.trim().replace(suffixes, '').trim();
    if (nameWithoutSuffix !== piName.trim()) {
      variations.push(nameWithoutSuffix);
    }

    // Handle common name formats
    const parts = nameWithoutSuffix.split(/\s+/);

    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      const middleParts = parts.slice(1, -1);

      // Basic format variations
      variations.push(
        `${lastName}, ${firstName}`, // Last, First
        `${firstName} ${lastName}`, // First Last (no middle)
        `${lastName}, ${firstName[0]}.`, // Last, F.
        `${firstName[0]}. ${lastName}`, // F. Last
      );

      // Handle hyphenated last names (e.g., "Mary Smith-Jones")
      if (lastName.includes('-')) {
        const hyphenParts = lastName.split('-');
        // Try each part separately
        for (const part of hyphenParts) {
          variations.push(
            `${firstName} ${part}`,
            `${part}, ${firstName}`,
            `${firstName[0]}. ${part}`
          );
        }
        // Try without hyphen
        const lastNameNoHyphen = hyphenParts.join('');
        variations.push(
          `${firstName} ${lastNameNoHyphen}`,
          `${lastNameNoHyphen}, ${firstName}`
        );
        // Try with space instead of hyphen
        const lastNameWithSpace = hyphenParts.join(' ');
        variations.push(
          `${firstName} ${lastNameWithSpace}`,
          `${lastNameWithSpace}, ${firstName}`
        );
      }

      // Handle hyphenated first names (e.g., "Mary-Ann Smith")
      if (firstName.includes('-')) {
        const hyphenParts = firstName.split('-');
        // Try each part separately
        for (const part of hyphenParts) {
          variations.push(
            `${part} ${lastName}`,
            `${lastName}, ${part}`,
            `${part[0]}. ${lastName}`
          );
        }
        // Try without hyphen
        const firstNameNoHyphen = hyphenParts.join('');
        variations.push(
          `${firstNameNoHyphen} ${lastName}`,
          `${lastName}, ${firstNameNoHyphen}`
        );
      }

      // Handle middle names/initials
      if (middleParts.length > 0) {
        const middleInitial = middleParts[0].charAt(0);
        const middleName = middleParts[0];

        variations.push(
          `${firstName} ${middleInitial}. ${lastName}`,
          `${firstName} ${middleInitial} ${lastName}`,
          `${lastName}, ${firstName} ${middleInitial}.`,
          `${lastName}, ${firstName} ${middleInitial}`,
          `${firstName[0]}. ${middleInitial}. ${lastName}`,
          `${firstName[0]}${middleInitial}. ${lastName}`,
          // Full middle name variations
          `${firstName} ${middleName} ${lastName}`,
          `${lastName}, ${firstName} ${middleName}`,
          // No middle name/initial
          `${firstName} ${lastName}`,
          `${lastName}, ${firstName}`
        );

        // If multiple middle names/initials
        if (middleParts.length > 1) {
          const allMiddleInitials = middleParts.map(p => p.charAt(0)).join('. ') + '.';
          variations.push(
            `${firstName} ${allMiddleInitials} ${lastName}`,
            `${lastName}, ${firstName} ${allMiddleInitials}`
          );
        }
      }

      // Handle initials-only formats (e.g., "J.R. Smith" → "JR Smith", "J R Smith")
      const firstInitial = firstName.charAt(0);
      if (middleParts.length > 0) {
        const middleInitial = middleParts[0].charAt(0);
        variations.push(
          `${firstInitial}${middleInitial} ${lastName}`,
          `${firstInitial} ${middleInitial} ${lastName}`,
          `${firstInitial}.${middleInitial}. ${lastName}`
        );
      }

      // Common database format variations
      variations.push(
        `${lastName} ${firstName}`, // Last First (no comma)
        `${lastName} ${firstName[0]}`, // Last F (no punctuation)
        `${lastName}, ${firstName[0]}`, // Last, F (no period)
      );
    }

    // Remove duplicates and empty strings
    return [...new Set(variations.filter(v => v && v.trim().length > 0))];
  }

  // Enhanced NSF response parsing with exact matching
  private parseNSFResponseExact(nsfResponse: string, expectedPI: string): string[] {
    if (!nsfResponse || nsfResponse.includes("not available") || nsfResponse.includes("Error")) {
      return [];
    }

    const awards: string[] = [];
    const lines = nsfResponse.split('\n');
    
    let currentAward = '';
    let currentPI = '';
    let currentInstitution = '';
    let isExactPIMatch = false;
    
    for (const line of lines) {
      if (line.includes('Award Number:') || line.includes('Title:')) {
        // Process previous award
        if (currentAward && isExactPIMatch) {
          awards.push(`${currentAward} | ${currentPI} | ${currentInstitution}`);
        }
        
        // Start new award
        currentAward = line.trim();
        currentPI = '';
        currentInstitution = '';
        isExactPIMatch = false;
      } else if (line.includes('Principal Investigator:')) {
        currentPI = line.trim();
        // Exact name matching with multiple variations
        const piInResponse = line.toLowerCase();
        const expectedVariations = this.generatePINameVariations(expectedPI);
        
        isExactPIMatch = expectedVariations.some(variation => {
          const normalizedVariation = variation.toLowerCase().replace(/[.,]/g, '');
          const normalizedResponse = piInResponse.replace(/[.,]/g, '');
          return normalizedResponse.includes(normalizedVariation) || 
                 normalizedVariation.includes(normalizedResponse.replace(/principal investigator:\s*/i, ''));
        });
      } else if (line.includes('Institution:')) {
        currentInstitution = line.trim();
      } else if (line.includes('Amount:') && currentAward) {
        currentAward += ' | ' + line.trim();
      }
    }
    
    // Don't forget the last award
    if (currentAward && isExactPIMatch) {
      awards.push(`${currentAward} | ${currentPI} | ${currentInstitution}`);
    }
    
    return awards.slice(0, 5); // Limit to 5 most relevant
  }

  // Validate institution matching between ACCESS and NSF
  private validateInstitutionMatch(nsfAward: string, accessInstitution: string): boolean {
    const institutionVariants = this.getInstitutionVariants(accessInstitution);
    const nsfLower = nsfAward.toLowerCase();
    
    return institutionVariants.some(variant => 
      nsfLower.includes(variant.toLowerCase()) || 
      variant.toLowerCase().includes(accessInstitution.toLowerCase().split(' ')[0]) // First word match
    );
  }

  // Analyze temporal alignment between NSF awards and ACCESS project
  private analyzeTemporalAlignment(nsfAwards: string[], accessStart: string, accessEnd: string): string {
    if (nsfAwards.length === 0) {
      return 'No awards to analyze for temporal alignment.';
    }

    let analysis = '';
    const accessStartYear = new Date(accessStart).getFullYear();
    const accessEndYear = new Date(accessEnd).getFullYear();

    nsfAwards.forEach((award, index) => {
      // Try to extract dates from award text (this is approximate since NSF format varies)
      const yearMatches = award.match(/(\d{4})/g);
      if (yearMatches && yearMatches.length > 0) {
        const awardYears = yearMatches.map(y => parseInt(y)).filter(y => y >= 2000 && y <= 2030);
        const overlap = awardYears.some(year => year >= accessStartYear && year <= accessEndYear);
        
        analysis += `• **Award ${index + 1}:** `;
        if (overlap) {
          analysis += `✅ Temporal overlap detected (${awardYears.join(', ')})\n`;
        } else {
          analysis += `⚠️ No clear temporal overlap (${awardYears.join(', ')} vs ${accessStartYear}-${accessEndYear})\n`;
        }
      } else {
        analysis += `• **Award ${index + 1}:** Unable to extract award dates for comparison\n`;
      }
    });

    return analysis;
  }

  private async findFundedProjects(piName?: string, institutionName?: string, fieldOfScience?: string, limit: number = 10) {
    // Input validation
    if (limit < 1 || limit > 50) {
      throw new Error("Limit must be between 1 and 50");
    }

    if (piName && piName.trim().length < 3) {
      throw new Error("PI name must be at least 3 characters");
    }

    if (institutionName && institutionName.trim().length < 3) {
      throw new Error("Institution name must be at least 3 characters");
    }

    try {
      // Step 1: Get ACCESS projects
      let accessProjects: Project[] = [];
      let searchQuery = "";
      const searchMetadata = {
        piNameVariations: [] as string[],
        institutionVariants: [] as string[]
      };

      if (piName) {
        // Generate name variations for better matching
        searchMetadata.piNameVariations = this.generatePINameVariations(piName);

        // Search for projects by PI name, filtering by field if specified
        accessProjects = await this.searchProjectsByPIName(piName, fieldOfScience, limit * 2);
        searchQuery += `PI: ${piName}`;
        if (fieldOfScience) searchQuery += `, Field: ${fieldOfScience}`;
      } else if (institutionName) {
        // Generate institution variants for better matching
        const normalized = this.normalizeInstitutionName(institutionName);
        searchMetadata.institutionVariants = this.getInstitutionVariants(normalized);

        // Search for projects by institution, filtering by field if specified
        accessProjects = await this.searchProjectsByInstitution(institutionName, fieldOfScience, limit * 2);
        searchQuery += `Institution: ${institutionName}`;
        if (fieldOfScience) searchQuery += `, Field: ${fieldOfScience}`;
      } else if (fieldOfScience) {
        // This should work correctly now
        accessProjects = await this.getProjectsByField(fieldOfScience, limit * 2);
        searchQuery += `Field: ${fieldOfScience}`;
      } else {
        accessProjects = await this.getTopProjects(limit);
        searchQuery = "Top ACCESS projects across all fields";
      }

      // Step 2: For each ACCESS project PI, find corresponding NSF awards
      const fundedProjectCorrelations = await this.crossReferenceWithNSF(accessProjects, limit);

      // Step 3: Build comprehensive result
      let result = `🎯 **Funded Projects Analysis**\n\n`;
      result += `**Search Criteria:** ${searchQuery}\n`;
      result += `**Projects Found:** ${accessProjects.length} ACCESS projects\n`;

      // Add search metadata if available
      if (searchMetadata.piNameVariations.length > 0) {
        result += `**Name Variations Tried:** ${Math.min(searchMetadata.piNameVariations.length, 5)} format(s)\n`;
      }
      if (searchMetadata.institutionVariants.length > 0) {
        result += `**Institution Variants:** ${searchMetadata.institutionVariants.slice(0, 3).join(', ')}\n`;
      }
      result += `\n`;

      if (fundedProjectCorrelations.length === 0) {
        result += `**🏛️ ACCESS Projects (${fieldOfScience || 'All Fields'}):**\n`;
        result += this.formatProjectSummaries(accessProjects.slice(0, limit));
        result += `\n\n**🏆 NSF Funding Status:**\n`;
        result += `✅ **No NSF awards found** for these PIs after trying multiple name format variations.\n\n`;
        result += `**💡 What this means:**\n`;
        result += `• Advanced name matching tried multiple formats (First Last, Last First, with/without initials, etc.)\n`;
        result += `• Results are filtered to primary institutions only (collaborations excluded)\n`;
        result += `• If you expected to find awards, this could indicate:\n`;
        result += `  - PIs may have NSF funding under different name spellings\n`;
        result += `  - Projects funded by other federal agencies (DOE, NIH, NASA, etc.)\n`;
        result += `  - Exploratory/startup allocations without federal grant backing\n`;
        result += `  - Early-career researchers or industry collaborations\n`;
        result += `  - Institution name changes or department-level variations\n\n`;
        result += `**🔍 Troubleshooting Tips:**\n`;
        result += `• Try searching by individual PI name for detailed matching\n`;
        result += `• Use analyze_project_funding() with specific project ID for detailed analysis\n`;
        result += `• Check if institution appears under different official names\n`;
      } else {
        result += `**🔗 Cross-Referenced Funded Projects:**\n\n`;
        fundedProjectCorrelations.forEach((correlation, index) => {
          result += `**${index + 1}. ${correlation.accessProject.requestTitle}**\n`;
          result += `• **ACCESS PI:** ${correlation.accessProject.pi} (${correlation.accessProject.piInstitution})\n`;
          result += `• **Field:** ${correlation.accessProject.fos}\n`;
          result += `• **Resources:** ${this.summarizeResources(correlation.accessProject.resources)}\n`;
          result += `• **NSF Awards:** ${correlation.nsfAwards.length} award(s) found\n`;
          correlation.nsfAwards.forEach(award => {
            result += `  - ${award}\n`;
          });
          result += `\n`;
        });

        result += `**📊 Correlation Insights:**\n`;
        result += `• **${fundedProjectCorrelations.length}** of ${accessProjects.length} ACCESS projects have identifiable NSF funding\n`;
        result += `• Cross-platform funding indicates sustained research programs\n`;
        result += `• ACCESS resources support federally-funded computational research\n`;
        result += `• Strong correlation suggests effective resource allocation\n`;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error finding funded projects: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  // Helper method to get projects by field directly
  private async getProjectsByField(fieldOfScience: string, limit: number): Promise<Project[]> {
    const allProjects = await this.fetchMultiplePages([1, 2, 3, 4, 5]);
    return allProjects
      .filter(project => project.fos.toLowerCase().includes(fieldOfScience.toLowerCase()))
      .slice(0, limit);
  }

  // Helper method to get top projects
  private async getTopProjects(limit: number): Promise<Project[]> {
    const allProjects = await this.fetchMultiplePages([1, 2, 3]);
    return allProjects.slice(0, limit);
  }

  // Helper method to search projects by PI name
  private async searchProjectsByPIName(piName: string, fieldOfScience?: string, limit: number = 20): Promise<Project[]> {
    const allProjects = await this.fetchMultiplePages([1, 2, 3, 4, 5]);
    return allProjects.filter(project => {
      const piMatch = project.pi.toLowerCase().includes(piName.toLowerCase());
      const fieldMatch = !fieldOfScience || project.fos.toLowerCase().includes(fieldOfScience.toLowerCase());
      return piMatch && fieldMatch;
    }).slice(0, limit);
  }

  // Helper method to search projects by institution
  private async searchProjectsByInstitution(institutionName: string, fieldOfScience?: string, limit: number = 20): Promise<Project[]> {
    const allProjects = await this.fetchMultiplePages([1, 2, 3, 4, 5]);
    return allProjects.filter(project => {
      const institutionMatch = project.piInstitution.toLowerCase().includes(institutionName.toLowerCase());
      const fieldMatch = !fieldOfScience || project.fos.toLowerCase().includes(fieldOfScience.toLowerCase());
      return institutionMatch && fieldMatch;
    }).slice(0, limit);
  }

  // Core cross-referencing logic
  private async crossReferenceWithNSF(accessProjects: Project[], limit: number): Promise<Array<{
    accessProject: Project;
    nsfAwards: string[];
  }>> {
    const correlations: Array<{accessProject: Project; nsfAwards: string[]}> = [];
    
    // Process projects in batches to avoid overwhelming the NSF server
    const batchSize = 5;
    for (let i = 0; i < Math.min(accessProjects.length, limit) && correlations.length < limit; i += batchSize) {
      const batch = accessProjects.slice(i, i + batchSize);
      
      for (const project of batch) {
        try {
          // Search for NSF awards by PI name
          const nsfData = await this.callRemoteServer("nsf-awards", "search_nsf_awards", {
            personnel: project.pi,
            limit: 3
          }) as { content?: Array<{ text?: string }> };
          const nsfResponse = this.formatNsfResponse(nsfData);

          // Parse NSF response to extract award summaries
          const nsfAwards = this.parseNSFResponse(nsfResponse, project.pi);
          
          if (nsfAwards.length > 0) {
            correlations.push({
              accessProject: project,
              nsfAwards: nsfAwards
            });
          }

          // Add small delay to be respectful to NSF server
          if (i % 3 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.warn(`Error checking NSF funding for ${project.pi}:`, error);
        }
      }
    }
    
    return correlations;
  }

  // Parse NSF server response and extract relevant awards
  private parseNSFResponse(nsfResponse: string, expectedPI: string): string[] {
    if (!nsfResponse || nsfResponse.includes("not available") || nsfResponse.includes("Error")) {
      return [];
    }

    const awards: string[] = [];
    const lines = nsfResponse.split('\n');
    
    let currentAward = '';
    let isRelevant = false;
    
    for (const line of lines) {
      if (line.includes('Award Number:') || line.includes('Title:')) {
        if (currentAward && isRelevant) {
          awards.push(currentAward);
        }
        currentAward = line.trim();
        isRelevant = false;
      } else if (line.includes('Principal Investigator:')) {
        currentAward += ' | ' + line.trim();
        // Check if this award is actually for the expected PI (fuzzy match)
        const piInResponse = line.toLowerCase();
        const expectedParts = expectedPI.toLowerCase().split(' ');
        isRelevant = expectedParts.some(part => part.length > 2 && piInResponse.includes(part));
      } else if (line.includes('Institution:') && currentAward) {
        currentAward += ' | ' + line.trim();
      } else if (line.includes('Amount:') && currentAward) {
        currentAward += ' | ' + line.trim();
        if (isRelevant) {
          awards.push(currentAward);
          currentAward = '';
          isRelevant = false;
        }
      }
    }
    
    return awards.slice(0, 3); // Limit to 3 most relevant awards
  }

  // Helper methods for formatting
  private formatProjectSummaries(projects: Project[]): string {
    return projects.map((project, index) => {
      const resources = this.summarizeResources(project.resources);
      return `${index + 1}. **${project.requestTitle}** (${project.pi}, ${project.piInstitution})\n   Resources: ${resources}`;
    }).join('\n');
  }

  private summarizeResources(resources: AllocationResource[]): string {
    if (resources.length === 0) return 'None specified';
    return resources.slice(0, 2).map(r => {
      const allocation = this.formatAllocation(r.allocation || 0, r.units, r.resourceName);
      return allocation || r.resourceName;
    }).join(', ') + (resources.length > 2 ? ` +${resources.length - 2} more` : '');
  }

  private async institutionalFundingProfile(institutionName: string, limit: number = 20) {
    // Input validation
    if (!institutionName || typeof institutionName !== 'string' || institutionName.trim().length === 0) {
      throw new Error("Institution name must be a non-empty string");
    }
    
    if (limit < 1 || limit > 100) {
      throw new Error("Limit must be between 1 and 100");
    }

    try {
      // Step 1: Normalize institution name for better matching
      const normalizedInstitution = this.normalizeInstitutionName(institutionName);
      const institutionVariants = this.getInstitutionVariants(normalizedInstitution);

      // Step 2: Get ACCESS projects for this institution using variants
      let accessProjects: Project[] = [];
      let bestVariant = institutionName;
      let maxMatches = 0;

      for (const variant of institutionVariants) {
        const projects = await this.getProjectsByInstitution(variant, limit * 2);
        if (projects.length > maxMatches) {
          maxMatches = projects.length;
          accessProjects = projects;
          bestVariant = variant;
        }
      }

      // Step 3: Get NSF awards using multiple institution variants
      // CRITICAL FIX: Filter by primary institution only to avoid false positives
      const nsfAwardsByVariant = new Map<string, string>();
      let totalNSFAwards = 0;

      for (const variant of institutionVariants.slice(0, 3)) { // Try top 3 variants
        try {
          // Use primary_only parameter - filtering now handled by NSF server
          const nsfData = await this.callRemoteServer("nsf-awards", "search_nsf_awards", {
            institution: variant,
            limit: Math.ceil(limit / 2),
            primary_only: true  // Filter at source for cleaner architecture
          }) as { content?: Array<{ text?: string }> };
          const nsfResponse = this.formatNsfResponse(nsfData);

          if (nsfResponse && !nsfResponse.includes("Error") && !nsfResponse.includes("not available")) {
            nsfAwardsByVariant.set(variant, nsfResponse);
            const awardCount = (nsfResponse.match(/Award Number:/g) || []).length;
            totalNSFAwards += awardCount;
          }
        } catch (error) {
          console.warn(`Error fetching NSF data for variant "${variant}":`, error);
        }
      }

      // Step 4: Cross-reference ACCESS PIs with NSF awards
      const piCrossReference = await this.crossReferenceInstitutionPIs(accessProjects);

      // Step 5: Build comprehensive result
      let result = `🏛️ **Institutional Funding Profile: ${institutionName}**\n\n`;
      
      // Institution matching info
      result += `**🎯 Institution Matching:**\n`;
      result += `• **Primary Match:** ${bestVariant}\n`;
      result += `• **Variants Searched:** ${institutionVariants.slice(0, 3).join(', ')}\n\n`;

      // ACCESS Projects Section
      result += `**📊 ACCESS Computational Allocations (${accessProjects.length} projects):**\n`;
      if (accessProjects.length > 0) {
        result += this.formatInstitutionalAccessProjects(accessProjects.slice(0, limit));
        
        // Resource summary
        const resourceStats = this.analyzeInstitutionalResources(accessProjects);
        result += `\n**Resource Portfolio:**\n${resourceStats}\n`;
      } else {
        result += `No ACCESS projects found for ${institutionName}.\n`;
        result += `Try variations like "${institutionVariants.slice(1, 3).join('" or "')}"\n`;
      }

      // NSF Awards Section (CRITICAL FIX: Now filtered by primary institution only)
      result += `\n**🏆 NSF Research Portfolio (${totalNSFAwards} primary awards found):**\n`;
      result += `*Note: Only showing awards where ${institutionName} is the PRIMARY recipient institution*\n\n`;

      if (nsfAwardsByVariant.size > 0) {
        for (const [variant, awards] of nsfAwardsByVariant) {
          result += `\n*${variant}:*\n${awards}\n`;
        }
      } else {
        result += `✅ **No NSF awards found where "${institutionName}" is the primary recipient.**\n\n`;
        result += `**💡 What this means:**\n`;
        result += `• These results are filtered to show ONLY awards where this institution is the primary recipient\n`;
        result += `• Collaborations and co-PI mentions are excluded to ensure accuracy\n`;
        result += `• If you expected to see awards, this could indicate:\n`;
        result += `  - Institution name formatting differences (try: "${institutionVariants.slice(1, 3).join('", "')}")\n`;
        result += `  - Awards under department/college names instead of university name\n`;
        result += `  - Recent institutional name changes or mergers\n`;
        result += `  - Awards may be under affiliated research centers\n\n`;
        result += `**🔍 Alternative Search Options:**\n`;
        result += `• Search by specific PI names from ACCESS projects\n`;
        result += `• Try department-specific searches (e.g., "Computer Science Dept, ${institutionName}")\n`;
        result += `• Check for institution name variations in NSF databases\n`;
      }

      // Cross-reference analysis
      result += `\n**🔗 Cross-Platform Analysis:**\n`;
      if (piCrossReference.matches > 0) {
        result += `• **${piCrossReference.matches}** ACCESS PIs have identifiable NSF awards\n`;
        result += `• **Strong institutional research profile** with federal funding\n`;
        result += `• ACCESS resources effectively supporting NSF-funded research\n`;
        result += piCrossReference.details;
      } else {
        result += `• No direct PI matches found between ACCESS and NSF databases\n`;
        result += `• This may indicate:\n`;
        result += `  - Different name formats between systems\n`;
        result += `  - Recent hiring/institutional changes\n`;
        result += `  - Computational vs. experimental research focus\n`;
      }

      // Strategic insights
      result += `\n**📈 Strategic Insights:**\n`;
      result += `• **Computational Capacity:** ${accessProjects.length} active ACCESS allocations\n`;
      result += `• **Federal Funding:** ${totalNSFAwards} NSF awards across institution variants\n`;
      result += `• **Research Diversity:** ${this.getUniqueFieldsCount(accessProjects)} fields of science represented\n`;
      result += `• **Resource Utilization:** Multi-resource computational research programs\n`;

      return {
        content: [
          {
            type: "text" as const,
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error generating institutional funding profile: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  // Advanced institution name normalization 
  private normalizeInstitutionName(name: string): string {
    return name
      // Normalize punctuation variations
      .replace(/,\s*(at|in|of)\s*/gi, ' $1 ')  // "Colorado, Boulder" → "Colorado at Boulder"
      .replace(/,\s+/g, ' ')                   // Remove other commas
      .replace(/\s*-\s*/g, '-')                // Normalize hyphens
      .replace(/\s*&\s*/g, ' and ')            // Normalize ampersands
      // Normalize institution type words
      .replace(/\b(University|College|Institute|School|Center|Laboratory|Lab)\b/gi, (match) => {
        const mappings: Record<string, string> = {
          'university': 'University',
          'college': 'College', 
          'institute': 'Institute',
          'school': 'School',
          'center': 'Center',
          'laboratory': 'Laboratory',
          'lab': 'Laboratory'
        };
        return mappings[match.toLowerCase()] || match;
      })
      // Handle common abbreviations
      .replace(/\bU\b/g, 'University')
      .replace(/\bUniv\b/gi, 'University')
      .replace(/\bColl\b/gi, 'College')
      .replace(/\bInst\b/gi, 'Institute')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getInstitutionVariants(normalizedName: string): string[] {
    const variants = [normalizedName];
    
    // Generate systematic variations
    const systematicVariants = this.generateSystematicInstitutionVariants(normalizedName);
    variants.push(...systematicVariants);

    // Add location-specific variations
    const locationVariants = this.generateLocationVariants(normalizedName);
    variants.push(...locationVariants);

    // Add common abbreviations/expansions
    const knownVariants = this.getKnownInstitutionVariants(normalizedName);
    variants.push(...knownVariants);

    return [...new Set(variants)]; // Remove duplicates
  }

  private generateSystematicInstitutionVariants(name: string): string[] {
    const variants: string[] = [];
    
    // Pattern variations for different institution formats
    const patterns = [
      // "University of X" ↔ "X University" 
      { from: /University of ([^,]+?)(?:\s+at\s+([^,]+))?$/i, to: (match: string, p1: string, p2: string) => 
          p2 ? `${p1} University at ${p2}` : `${p1} University` },
      { from: /^([^,]+?)\s+University(?:\s+at\s+([^,]+))?$/i, to: (match: string, p1: string, p2: string) => 
          p2 ? `University of ${p1} at ${p2}` : `University of ${p1}` },
      
      // "X at Y" ↔ "X, Y" ↔ "X-Y"
      { from: /^(.+?)\s+at\s+(.+)$/i, to: (match: string, p1: string, p2: string) => `${p1}, ${p2}` },
      { from: /^(.+?)\s+at\s+(.+)$/i, to: (match: string, p1: string, p2: string) => `${p1}-${p2}` },
      { from: /^(.+?),\s*(.+)$/i, to: (match: string, p1: string, p2: string) => `${p1} at ${p2}` },
      { from: /^(.+?)-(.+)$/i, to: (match: string, p1: string, p2: string) => `${p1} at ${p2}` },
      
      // State/Campus variations
      { from: /^(.+?)\s+University\s+of\s+(.+?)(?:\s+at\s+(.+))?$/i, to: (match: string, p1: string, p2: string, p3: string) => 
          p3 ? `University of ${p2} ${p1} at ${p3}` : `University of ${p2} ${p1}` },
    ];

    patterns.forEach(pattern => {
      const match = name.match(pattern.from);
      if (match && typeof pattern.to === 'function') {
        const variant = pattern.to(match[0], match[1], match[2], match[3]);
        if (variant && variant !== name) {
          variants.push(variant);
        }
      }
    });

    // Simple transformations
    const simpleReplacements = [
      { from: /\band\b/g, to: '&' },
      { from: /&/g, to: 'and' },
      { from: /\s+/g, to: ' ' }
    ];

    simpleReplacements.forEach(replacement => {
      const variant = name.replace(replacement.from, replacement.to).trim();
      if (variant !== name) {
        variants.push(variant);
      }
    });

    return variants;
  }

  private generateLocationVariants(name: string): string[] {
    const variants: string[] = [];
    
    // Common location format variations
    const locationPatterns = [
      // Campus-specific variations
      /University of (.+?) (?:at )?(.+?)$/i,
      /(.+?) University (?:at )?(.+?)$/i,
      /(.+?) State University (?:at )?(.+?)$/i
    ];

    locationPatterns.forEach(pattern => {
      const match = name.match(pattern);
      if (match) {
        const [, institution, location] = match;
        // Generate multiple format variations
        variants.push(`University of ${institution} at ${location}`);
        variants.push(`University of ${institution}, ${location}`);
        variants.push(`University of ${institution}-${location}`);
        variants.push(`${institution} University at ${location}`);
        variants.push(`${institution} University, ${location}`);
        variants.push(`${institution} University-${location}`);
      }
    });

    return variants;
  }

  /**
   * Get known institution variants with SAFE matching logic.
   *
   * CRITICAL FIX: Previous version had substring matching bug where "MIT" matched "UT"
   * because "ut" is substring of "mit". Now uses word-boundary aware matching.
   */
  private getKnownInstitutionVariants(name: string): string[] {
    const variants: string[] = [];
    const nameLower = name.toLowerCase().trim();
    const nameWords = new Set(nameLower.split(/\s+/));

    // Comprehensive mapping of known institution variations
    const knownMappings: Record<string, string[]> = {
      // Major research universities
      'University of Illinois at Urbana-Champaign': [
        'UIUC', 'U of I', 'University of Illinois Urbana-Champaign',
        'University of Illinois, Urbana-Champaign', 'UI Urbana-Champaign'
      ],
      'Massachusetts Institute of Technology': ['MIT'],
      'California Institute of Technology': ['Caltech', 'CIT'],
      'Carnegie Mellon University': ['CMU'],
      'Georgia Institute of Technology': ['Georgia Tech', 'GIT', 'GT'],

      // University of California system
      'University of California Berkeley': ['UC Berkeley', 'Berkeley', 'Cal'],
      'University of California Los Angeles': ['UCLA', 'UC Los Angeles'],
      'University of California San Diego': ['UCSD', 'UC San Diego'],
      'University of California Santa Barbara': ['UCSB', 'UC Santa Barbara'],

      // University of Colorado system
      'University of Colorado Boulder': [
        'CU Boulder', 'UC Boulder', 'University of Colorado at Boulder',
        'University of Colorado, Boulder', 'Colorado University Boulder'
      ],
      'University of Colorado Denver': [
        'CU Denver', 'UC Denver', 'University of Colorado at Denver',
        'University of Colorado, Denver'
      ],

      // Texas system
      'University of Texas at Austin': [
        'UT Austin', 'UT', 'University of Texas Austin',
        'University of Texas, Austin'
      ],
      'Texas A&M University': ['TAMU', 'Texas A and M University', 'Texas A&M'],

      // State universities
      'Ohio State University': ['OSU', 'The Ohio State University'],
      'Pennsylvania State University': ['Penn State', 'PSU'],
      'Michigan State University': ['MSU'],
      'Arizona State University': ['ASU'],
      'Florida State University': ['FSU'],

      // Private institutions
      'Stanford University': ['Stanford'],
      'Harvard University': ['Harvard'],
      'Princeton University': ['Princeton'],
      'Yale University': ['Yale'],
      'Columbia University': ['Columbia'],
      'University of Chicago': ['UChicago', 'Chicago'],

      // International variations
      'University College London': ['UCL'],
      'Swiss Federal Institute of Technology': ['ETH Zurich', 'ETHZ']
    };

    // Look for SAFE matches using word-boundary aware logic
    for (const [canonical, alternates] of Object.entries(knownMappings)) {
      const canonicalLower = canonical.toLowerCase();
      let matched = false;

      // 1. Exact match (highest confidence)
      if (nameLower === canonicalLower) {
        variants.push(canonical, ...alternates);
        continue;
      }

      // 2. Safe substring match for long strings (15+ chars)
      // Prevents "MIT" from matching "Committee" but allows "University of X" variations
      if (name.length >= 15 && canonical.length >= 15) {
        if (nameLower.includes(canonicalLower) || canonicalLower.includes(nameLower)) {
          variants.push(canonical, ...alternates);
          continue;
        }
      }

      // 3. Check alternates with word-boundary aware logic
      for (const alt of alternates) {
        if (matched) break;

        const altLower = alt.toLowerCase().trim();

        // Exact match
        if (nameLower === altLower) {
          variants.push(canonical, ...alternates);
          matched = true;
          break;
        }

        // CRITICAL: Use word boundaries, not naive substring matching
        // This prevents "MIT" from matching "UT" (substring) but allows "UT Austin" to match "UT" (word)

        // For single-word abbreviations, require exact word match
        if (!alt.includes(' ') && alt.length <= 6) {
          // Check if abbreviation appears as complete word in name
          const wordBoundaryRegex = new RegExp(`\\b${alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (wordBoundaryRegex.test(name)) {
            variants.push(canonical, ...alternates);
            matched = true;
            break;
          }
        }

        // For multi-word matches, check significant word overlap
        if (alt.includes(' ') && name.includes(' ')) {
          const altWords = new Set(altLower.split(/\s+/));
          const overlap = [...nameWords].filter(word =>
            altWords.has(word) && word.length > 3
          );

          // Require at least 50% word overlap and minimum 2 matching words
          const overlapRatio = overlap.length / Math.max(nameWords.size, altWords.size);
          if (overlapRatio >= 0.5 && overlap.length >= 2) {
            variants.push(canonical, ...alternates);
            matched = true;
            break;
          }
        }

        // Long string safe substring (10+ chars each)
        if (alt.length >= 10 && name.length >= 10) {
          if (nameLower.includes(altLower) || altLower.includes(nameLower)) {
            variants.push(canonical, ...alternates);
            matched = true;
            break;
          }
        }
      }
    }

    return [...new Set(variants)]; // Remove duplicates
  }

  private async getProjectsByInstitution(institutionName: string, limit: number): Promise<Project[]> {
    const allProjects = await this.fetchMultiplePages([1, 2, 3, 4, 5]);
    
    // Generate institution variants for better matching
    const institutionVariants = this.getInstitutionVariants(this.normalizeInstitutionName(institutionName));
    
    return allProjects
      .filter(project => this.matchesInstitution(project.piInstitution, institutionVariants))
      .slice(0, limit);
  }


  private formatInstitutionalAccessProjects(projects: Project[]): string {
    const grouped = new Map<string, Project[]>();
    projects.forEach(project => {
      const field = project.fos;
      if (!grouped.has(field)) grouped.set(field, []);
      grouped.get(field)!.push(project);
    });

    let result = '';
    Array.from(grouped.entries()).slice(0, 5).forEach(([field, fieldProjects]) => {
      result += `\n**${field} (${fieldProjects.length} projects):**\n`;
      fieldProjects.slice(0, 3).forEach(project => {
        const resources = this.summarizeResources(project.resources);
        result += `• ${project.requestTitle} (${project.pi}) - ${resources}\n`;
      });
      if (fieldProjects.length > 3) {
        result += `  ... and ${fieldProjects.length - 3} more projects\n`;
      }
    });

    return result;
  }

  private analyzeInstitutionalResources(projects: Project[]): string {
    const resourceCounts = new Map<string, number>();

    projects.forEach(project => {
      project.resources.forEach(resource => {
        resourceCounts.set(resource.resourceName, (resourceCounts.get(resource.resourceName) || 0) + 1);
      });
    });

    const topResources = Array.from(resourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    let result = '';
    topResources.forEach(([resource, count]) => {
      result += `• **${resource}:** ${count} allocations\n`;
    });

    return result;
  }

  private async crossReferenceInstitutionPIs(accessProjects: Project[]): Promise<{
    matches: number;
    details: string;
  }> {
    let matches = 0;
    let details = '\n**PI Cross-Reference Details:**\n';

    for (const project of accessProjects.slice(0, 10)) { // Limit to first 10 for performance
      try {
        const nsfData = await this.callRemoteServer("nsf-awards", "search_nsf_awards", {
          personnel: project.pi,
          limit: 2
        }) as { content?: Array<{ text?: string }> };
        const nsfResponse = this.formatNsfResponse(nsfData);

        if (nsfResponse && !nsfResponse.includes("Error") && !nsfResponse.includes("not available")) {
          const relevantAwards = this.parseNSFResponse(nsfResponse, project.pi);
          if (relevantAwards.length > 0) {
            matches++;
            details += `• **${project.pi}:** ${relevantAwards.length} NSF award(s) - ${project.fos}\n`;
          }
        }

        // Small delay to be respectful
        if (matches % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn(`Error cross-referencing ${project.pi}:`, error);
      }
    }

    return { matches, details };
  }

  private getUniqueFieldsCount(projects: Project[]): number {
    const fields = new Set(projects.map(p => p.fos));
    return fields.size;
  }

  // Helper method to format NSF server responses
  private formatNsfResponse(response: { content?: Array<{ text?: string }> }): string {
    if (response.content && response.content[0] && response.content[0].text) {
      return response.content[0].text;
    }
    return JSON.stringify(response);
  }

  /**
   * Check if an institution name matches any of the search variants.
   * Uses multi-tier matching strategy to avoid false positives.
   *
   * CRITICAL FIX: Excludes common institution words (university, institute, college)
   * from word overlap matching to prevent false positives where "Stanford University"
   * matches "Carnegie Mellon University" just because both contain "university".
   */
  private matchesInstitution(institutionText: string, searchVariants: string[]): boolean {
    const normalizedText = this.normalizeInstitutionName(institutionText).toLowerCase();

    // Common words that should be ignored in word overlap matching
    // These appear in almost all institution names and cause false positives
    const COMMON_INSTITUTION_WORDS = new Set([
      'university', 'institute', 'college', 'school', 'center',
      'academy', 'polytechnic', 'tech', 'state', 'national'
    ]);

    for (const variant of searchVariants) {
      const normalizedVariant = variant.toLowerCase();

      // Tier 1: Exact match (highest confidence)
      if (normalizedText === normalizedVariant) {
        return true;
      }

      // Tier 2: Full variant contained in text (with length check to avoid false positives)
      if (normalizedVariant.length > 8 && normalizedText.includes(normalizedVariant)) {
        return true;
      }

      // Tier 3: Check significant word overlap (FIXED: excludes common words)
      // Extract all words > 3 chars and exclude common institution words
      const textWords = new Set(
        normalizedText.split(/\s+/)
          .filter(w => w.length > 3 && !COMMON_INSTITUTION_WORDS.has(w))
      );

      const variantWords = normalizedVariant.split(/\s+/)
        .filter(w => w.length > 3 && !COMMON_INSTITUTION_WORDS.has(w));

      if (variantWords.length > 0 && textWords.size > 0) {
        const matchingWords = variantWords.filter(word => textWords.has(word));
        const overlapRatio = matchingWords.length / variantWords.length;

        // CRITICAL: Require EITHER high overlap (75%+) OR at least 2 matching significant words
        if (overlapRatio >= 0.75 || (matchingWords.length >= 2 && overlapRatio >= 0.5)) {
          return true;
        }
      }
    }

    return false;
  }
}