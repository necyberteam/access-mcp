import { BaseAccessServer, handleApiError } from "@access-mcp/shared";

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
  filters: Record<string, any>;
}

// NSF Award interfaces
interface NSFAward {
  awardNumber: string;
  title: string;
  institution: string;
  principalInvestigator: string;
  coPIs: string[];
  totalIntendedAward: string;
  totalAwardedToDate: string;
  startDate: string;
  endDate: string;
  abstract: string;
  location?: string;
  programOfficer?: string;
  awardType?: string;
  primaryProgram?: string;
  fundingHistory: {
    fiscalYear: string;
    amount: string;
  }[];
}

interface ProjectWithNSF extends Project {
  nsfAward?: NSFAward;
}

export class AllocationsServer extends BaseAccessServer {
  constructor() {
    super(
      "access-allocations",
      "0.2.0",
      "https://allocations.access-ci.org",
    );
  }

  protected getTools() {
    return [
      {
        name: "search_projects",
        description: "Search ACCESS-CI research projects by keyword, PI name, or institution",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for project titles, abstracts, PI names, or institutions",
            },
            field_of_science: {
              type: "string",
              description: "Filter by field of science (e.g., 'Computer Science', 'Physics')",
            },
            allocation_type: {
              type: "string",
              description: "Filter by allocation type (e.g., 'Discover', 'Explore', 'Accelerate')",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 20)",
              default: 20,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_project_details",
        description: "Get detailed information about a specific research project",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "number",
              description: "The project ID number",
            },
          },
          required: ["project_id"],
        },
      },
      {
        name: "list_projects_by_field",
        description: "List projects by field of science",
        inputSchema: {
          type: "object",
          properties: {
            field_of_science: {
              type: "string",
              description: "Field of science (e.g., 'Computer Science', 'Physics', 'Chemistry')",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 20)",
              default: 20,
            },
          },
          required: ["field_of_science"],
        },
      },
      {
        name: "list_projects_by_resource",
        description: "Find projects using specific computational resources",
        inputSchema: {
          type: "object",
          properties: {
            resource_name: {
              type: "string",
              description: "Resource name (e.g., 'NCSA Delta GPU', 'Purdue Anvil', 'ACCESS Credits')",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 20)",
              default: 20,
            },
          },
          required: ["resource_name"],
        },
      },
      {
        name: "get_allocation_statistics",
        description: "Get statistics about resource allocations and research trends",
        inputSchema: {
          type: "object",
          properties: {
            pages_to_analyze: {
              type: "number",
              description: "Number of pages to analyze for statistics (default: 5, max: 20)",
              default: 5,
            },
          },
          required: [],
        },
      },
      {
        name: "find_similar_projects",
        description: "Find projects with similar research focus or abstracts",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "number",
              description: "Reference project ID to find similar projects",
            },
            keywords: {
              type: "string",
              description: "Keywords to find similar projects (alternative to project_id)",
            },
            limit: {
              type: "number",
              description: "Maximum number of similar projects to return (default: 10)",
              default: 10,
            },
          },
          required: [],
        },
      },
      {
        name: "get_nsf_award",
        description: "Get NSF award details for a specific award number",
        inputSchema: {
          type: "object",
          properties: {
            award_number: {
              type: "string",
              description: "NSF award number (e.g., '2138259')",
            },
          },
          required: ["award_number"],
        },
      },
      {
        name: "enrich_project_with_nsf",
        description: "Enrich an ACCESS project with NSF award data by searching for matching PI and institution",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "number",
              description: "ACCESS project ID to enrich with NSF data",
            },
          },
          required: ["project_id"],
        },
      },
      {
        name: "find_nsf_awards_by_pi",
        description: "Find NSF awards for a specific Principal Investigator",
        inputSchema: {
          type: "object",
          properties: {
            pi_name: {
              type: "string",
              description: "Principal Investigator name to search for",
            },
            limit: {
              type: "number",
              description: "Maximum number of awards to return (default: 10)",
              default: 10,
            },
          },
          required: ["pi_name"],
        },
      },
      {
        name: "find_nsf_awards_by_personnel",
        description: "Search NSF awards by Principal Investigator name (Note: Co-PI and Program Officer searches are not reliable in the NSF API)",
        inputSchema: {
          type: "object",
          properties: {
            person_name: {
              type: "string",
              description: "Principal Investigator name to search for",
            },
            limit: {
              type: "number",
              description: "Maximum number of awards to return (default: 10)",
              default: 10,
            },
          },
          required: ["person_name"],
        },
      },
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
    ];
  }

  async handleToolCall(request: any) {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "search_projects":
          return await this.searchProjects(args.query, args.field_of_science, args.allocation_type, args.limit);
        case "get_project_details":
          return await this.getProjectDetails(args.project_id);
        case "list_projects_by_field":
          return await this.listProjectsByField(args.field_of_science, args.limit);
        case "list_projects_by_resource":
          return await this.listProjectsByResource(args.resource_name, args.limit);
        case "get_allocation_statistics":
          return await this.getAllocationStatistics(args.pages_to_analyze || 5);
        case "find_similar_projects":
          return await this.findSimilarProjects(args.project_id, args.keywords, args.limit);
        case "get_nsf_award":
          return await this.getNSFAward(args.award_number);
        case "enrich_project_with_nsf":
          return await this.enrichProjectWithNSF(args.project_id);
        case "find_nsf_awards_by_pi":
          return await this.findNSFAwardsByPI(args.pi_name, args.limit);
        case "find_nsf_awards_by_personnel":
          return await this.findNSFAwardsByPersonnel(args.person_name, args.limit);
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

    throw new Error(`Unknown resource: ${uri}`);
  }

  // Core API methods
  private async fetchProjects(page: number = 1): Promise<ProjectsResponse> {
    const url = `${this.baseURL}/current-projects.json?page=${page}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch projects: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async searchProjects(query: string, fieldOfScience?: string, allocationType?: string, limit: number = 20) {
    // Search through multiple pages to find matching projects
    const results: Project[] = [];
    let currentPage = 1;
    const maxPages = 10; // Limit search scope for performance

    while (results.length < limit && currentPage <= maxPages) {
      const data = await this.fetchProjects(currentPage);
      
      for (const project of data.projects) {
        if (results.length >= limit) break;

        // Check if project matches search criteria
        const matchesQuery = this.projectMatchesQuery(project, query);
        const matchesField = !fieldOfScience || project.fos.toLowerCase().includes(fieldOfScience.toLowerCase());
        const matchesType = !allocationType || project.allocationType.toLowerCase().includes(allocationType.toLowerCase());

        if (matchesQuery && matchesField && matchesType) {
          results.push(project);
        }
      }

      currentPage++;
      if (currentPage > data.pages) break;
    }

    return {
      content: [
        {
          type: "text",
          text: this.formatProjectResults(results, `Search results for "${query}"${fieldOfScience ? ` in ${fieldOfScience}` : ''}${allocationType ? ` (${allocationType})` : ''}`),
        },
      ],
    };
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
              type: "text",
              text: this.formatSingleProject(project),
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
          type: "text",
          text: `Project with ID ${projectId} not found in current allocations.`,
        },
      ],
    };
  }

  private async listProjectsByField(fieldOfScience: string, limit: number = 20) {
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
          type: "text",
          text: this.formatProjectResults(results, `Projects in ${fieldOfScience}`),
        },
      ],
    };
  }

  private async listProjectsByResource(resourceName: string, limit: number = 20) {
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
          type: "text",
          text: this.formatProjectResults(results, `Projects using ${resourceName}`),
        },
      ],
    };
  }

  private async getAllocationStatistics(pagesToAnalyze: number = 5) {
    const projects: Project[] = [];
    const fieldsMap = new Map<string, number>();
    const resourcesMap = new Map<string, number>();
    const institutionsMap = new Map<string, number>();
    const allocationTypesMap = new Map<string, number>();

    // Collect data from multiple pages
    for (let page = 1; page <= Math.min(pagesToAnalyze, 20); page++) {
      const data = await this.fetchProjects(page);
      projects.push(...data.projects);
      
      // Update statistics
      for (const project of data.projects) {
        fieldsMap.set(project.fos, (fieldsMap.get(project.fos) || 0) + 1);
        institutionsMap.set(project.piInstitution, (institutionsMap.get(project.piInstitution) || 0) + 1);
        allocationTypesMap.set(project.allocationType, (allocationTypesMap.get(project.allocationType) || 0) + 1);
        
        for (const resource of project.resources) {
          resourcesMap.set(resource.resourceName, (resourcesMap.get(resource.resourceName) || 0) + 1);
        }
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
          type: "text",
          text: statsText,
        },
      ],
    };
  }

  private async findSimilarProjects(projectId?: number, keywords?: string, limit: number = 10) {
    let referenceProject: Project | null = null;
    let searchTerms: string = "";

    // Get reference project if projectId provided
    if (projectId) {
      let currentPage = 1;
      const maxPages = 20;

      while (currentPage <= maxPages && !referenceProject) {
        const data = await this.fetchProjects(currentPage);
        referenceProject = data.projects.find(p => p.projectId === projectId) || null;
        currentPage++;
      }

      if (!referenceProject) {
        return {
          content: [
            {
              type: "text",
              text: `Project with ID ${projectId} not found.`,
            },
          ],
        };
      }

      // Extract key terms from reference project
      searchTerms = [referenceProject.fos, ...referenceProject.abstract.split(' ').slice(0, 5)].join(' ');
    } else if (keywords) {
      searchTerms = keywords;
    } else {
      return {
        content: [
          {
            type: "text",
            text: "Please provide either a project_id or keywords to find similar projects.",
          },
        ],
      };
    }

    // Search for similar projects
    const results: Project[] = [];
    let currentPage = 1;
    const maxPages = 10;

    while (results.length < limit && currentPage <= maxPages) {
      const data = await this.fetchProjects(currentPage);
      
      for (const project of data.projects) {
        if (results.length >= limit) break;
        
        // Skip the reference project itself
        if (referenceProject && project.projectId === referenceProject.projectId) continue;

        // Check similarity based on field of science and abstract keywords
        const similarity = this.calculateProjectSimilarity(project, searchTerms, referenceProject?.fos);
        if (similarity > 0.3) { // Threshold for similarity
          results.push(project);
        }
      }

      currentPage++;
      if (currentPage > data.pages) break;
    }

    const header = referenceProject 
      ? `Projects similar to "${referenceProject.requestTitle}" (${referenceProject.pi})`
      : `Projects similar to keywords: "${keywords}"`;

    return {
      content: [
        {
          type: "text",
          text: this.formatProjectResults(results, header),
        },
      ],
    };
  }

  private calculateProjectSimilarity(project: Project, searchTerms: string, referenceField?: string): number {
    let score = 0;
    
    // Field of science match
    if (referenceField && project.fos.toLowerCase() === referenceField.toLowerCase()) {
      score += 0.5;
    }

    // Abstract keyword matching
    const projectText = (project.abstract + ' ' + project.requestTitle).toLowerCase();
    const keywords = searchTerms.toLowerCase().split(' ').filter(word => word.length > 3);
    
    const matchingKeywords = keywords.filter(keyword => projectText.includes(keyword));
    score += (matchingKeywords.length / keywords.length) * 0.5;

    return score;
  }

  // NSF Award Integration Methods
  private async getNSFAward(awardNumber: string) {
    try {
      const nsfData = await this.fetchNSFAwardData(awardNumber);
      
      return {
        content: [
          {
            type: "text",
            text: this.formatNSFAward(nsfData),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Could not retrieve NSF award ${awardNumber}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async enrichProjectWithNSF(projectId: number) {
    // First get the ACCESS project details
    let project: Project | null = null;
    let currentPage = 1;
    const maxPages = 20;

    while (currentPage <= maxPages && !project) {
      const data = await this.fetchProjects(currentPage);
      project = data.projects.find(p => p.projectId === projectId) || null;
      currentPage++;
    }

    if (!project) {
      return {
        content: [
          {
            type: "text",
            text: `Project with ID ${projectId} not found in current allocations.`,
          },
        ],
      };
    }

    // Try to find NSF awards by searching for the PI
    try {
      const nsfAwards = await this.searchNSFAwardsByPI(project.pi, 5);
      
      if (nsfAwards.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: this.formatProjectWithNSF(project, null, `No NSF awards found for PI: ${project.pi}`),
            },
          ],
        };
      }

      // Use the first matching award (could be enhanced with better matching logic)
      const bestMatch = nsfAwards[0];
      
      return {
        content: [
          {
            type: "text",
            text: this.formatProjectWithNSF(project, bestMatch),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: this.formatProjectWithNSF(project, null, `Error searching for NSF awards: ${error instanceof Error ? error.message : String(error)}`),
          },
        ],
      };
    }
  }

  private async findNSFAwardsByPI(piName: string, limit: number = 10) {
    try {
      const awards = await this.searchNSFAwardsByPI(piName, limit);
      
      if (awards.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No NSF awards found for PI: ${piName}\n\n` +
                   `**Tip:** Try searching with different name formats or check spelling. ` +
                   `You can also try \`find_nsf_awards_by_personnel\` to search across all roles.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: this.formatNSFAwardsList(awards, `NSF Awards for PI: ${piName}`),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching for NSF awards for ${piName}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }


  private async findNSFAwardsByPersonnel(personName: string, limit: number = 10) {
    try {
      const awards = await this.searchNSFAwardsByPI(personName, limit);
      
      if (awards.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No NSF awards found for ${personName} as Principal Investigator.\n\n` +
                   `**Searched:** Principal Investigator role only\n` +
                   `**Note:** Co-PI and Program Officer searches are not reliable in the NSF API\n` +
                   `**Tip:** Check spelling or try searching for specific award numbers.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: this.formatNSFAwardsList(awards, `NSF Awards for PI: ${personName}`),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching for NSF awards for ${personName}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private formatNSFAwardsList(awards: NSFAward[], title: string): string {
    let result = `🏆 **${title}**\n\n`;
    result += `Found ${awards.length} award${awards.length > 1 ? 's' : ''}:\n\n`;

    awards.forEach((award, index) => {
      result += `**${index + 1}. ${award.title}**\n`;
      result += `• **Award Number:** ${award.awardNumber}\n`;
      result += `• **Institution:** ${award.institution}`;
      if (award.location) {
        result += ` (${award.location})`;
      }
      result += `\n`;
      result += `• **PI:** ${award.principalInvestigator}\n`;
      if (award.coPIs.length > 0) {
        result += `• **Co-PIs:** ${award.coPIs.join(', ')}\n`;
      }
      result += `• **Total Award:** ${award.totalIntendedAward}\n`;
      result += `• **Period:** ${award.startDate} to ${award.endDate}\n`;
      if (award.awardType) {
        result += `• **Award Type:** ${award.awardType}\n`;
      }
      if (award.programOfficer) {
        result += `• **Program Officer:** ${award.programOfficer}\n`;
      }
      if (award.primaryProgram) {
        result += `• **Program:** ${award.primaryProgram}\n`;
      }
      result += `• **Abstract Preview:** ${award.abstract.substring(0, 150)}...\n\n`;
    });

    return result;
  }

  // NSF Data Fetching Methods
  private async fetchNSFAwardData(awardNumber: string): Promise<NSFAward> {
    // Use the NSF API instead of HTML parsing for better reliability
    const printFields = 'id,agency,awardee,awardeeName,startDate,expDate,estimatedTotalAmt,fundsObligatedAmt,poName,title,abstractText,piFirstName,piLastName,coPDPI,awardeeCity,awardeeCountryCode,awardeeDistrictCode,awardeeStateCode,primaryProgram,transType';
    const apiUrl = `https://www.research.gov/awardapi-service/v1/awards.json?id=${awardNumber}&printFields=${printFields}`;
    
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const awards = this.parseNSFAPIResponse(data, 1);
      
      if (awards.length === 0) {
        throw new Error(`Award ${awardNumber} not found`);
      }
      
      return awards[0];
    } catch (error) {
      throw new Error(`Failed to fetch NSF award ${awardNumber}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  private async searchNSFAwardsByPI(piName: string, limit: number): Promise<NSFAward[]> {
    try {
      // Try multiple search formats, prioritizing last name (most effective)
      const searchVariations = [
        piName.split(' ').pop() || piName, // "Smith" (last name only) - MOST EFFECTIVE
        piName.trim(), // "John Smith" (full name with space)
        piName.trim().replace(/\s+/g, '+'), // "John+Smith" (full name with plus)
        piName.split(' ')[0] || piName // "John" (first name only) - least precise
      ];
      
      for (const searchTerm of searchVariations) {
        // Construct NSF API URL with comprehensive field list
        const printFields = 'id,agency,awardee,awardeeName,startDate,expDate,estimatedTotalAmt,fundsObligatedAmt,poName,title,abstractText,piFirstName,piLastName,coPDPI,awardeeCity,awardeeCountryCode,awardeeDistrictCode,awardeeStateCode,primaryProgram,transType';
        const apiUrl = `https://www.research.gov/awardapi-service/v1/awards.json?pdPIName=${encodeURIComponent(searchTerm)}&rpp=${Math.min(limit * 4, 100)}&printFields=${printFields}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          continue; // Try next variation
        }
        
        const data = await response.json();
        const allResults = this.parseNSFAPIResponse(data, limit * 4); // Get more results to filter
        
        // Filter results to match the searched PI name more precisely
        const filteredResults = allResults.filter(award => {
          return this.nameMatches(award.principalInvestigator, piName);
        });
        
        if (filteredResults.length > 0) {
          return filteredResults.slice(0, limit); // Return filtered results up to limit
        }
        
        // Continue to next search variation instead of returning unfiltered results
      }
      
      return []; // No results found with any variation
      
    } catch (error) {
      console.warn(`Failed to search NSF awards for ${piName}:`, error);
      return [];
    }
  }




  private parseNSFAPIResponse(data: any, limit: number): NSFAward[] {
    const awards: NSFAward[] = [];
    
    try {
      // NSF API response structure: data.response.award[]
      const apiAwards = data?.response?.award || [];
      
      for (let i = 0; i < Math.min(apiAwards.length, limit); i++) {
        const award = apiAwards[i];
        
        // Extract award information from API response based on actual structure
        const awardNumber = award.id || 'Unknown';
        const title = award.title || `NSF Award ${awardNumber}`;
        const institution = award.awardee || award.awardeeName || 'Institution not available';
        
        // Extract PI name from API response
        const pi = award.piFirstName && award.piLastName 
          ? `${award.piFirstName} ${award.piLastName}`.trim()
          : award.piFirstName || award.piLastName || 'PI not available';
        
        // Extract dates (API uses startDate and expDate)
        const startDate = award.startDate || 'Date not available';
        const endDate = award.expDate || 'End date not available';
        
        // Extract funding amount
        let amount = 'Amount not available';
        if (award.estimatedTotalAmt) {
          amount = `$${Number(award.estimatedTotalAmt).toLocaleString()}`;
        } else if (award.fundsObligatedAmt) {
          amount = `$${Number(award.fundsObligatedAmt).toLocaleString()}`;
        }
        
        // Extract geographic information
        const location = this.formatLocation(award.awardeeCity, award.awardeeStateCode, award.awardeeCountryCode);
        
        // Extract program information
        const programOfficer = award.poName || 'Program Officer not available';
        const awardType = award.transType || 'Award type not available';
        const primaryProgram = award.primaryProgram && award.primaryProgram.length > 0 
          ? award.primaryProgram[0] 
          : 'Program not available';
        
        // Extract abstract
        const abstract = award.abstractText || award.abstract || 'Abstract not available';
        
        // Extract Co-PIs if available (structure may vary)
        const coPIs: string[] = [];
        if (award.coPDPI && Array.isArray(award.coPDPI)) {
          award.coPDPI.forEach((copi: any) => {
            if (typeof copi === 'string') {
              coPIs.push(copi);
            } else if (copi.firstName && copi.lastName) {
              coPIs.push(`${copi.firstName} ${copi.lastName}`.trim());
            }
          });
        }
        
        awards.push({
          awardNumber,
          title,
          institution,
          principalInvestigator: pi,
          coPIs,
          totalIntendedAward: amount,
          totalAwardedToDate: amount,
          startDate,
          endDate,
          abstract,
          location,
          programOfficer,
          awardType,
          primaryProgram,
          fundingHistory: []
        });
      }
    } catch (error) {
      console.warn('Failed to parse NSF API response:', error);
    }
    
    return awards;
  }


  // Helper Methods
  private formatLocation(city?: string, state?: string, country?: string): string {
    const parts = [];
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (country && country !== 'US') parts.push(country);
    return parts.length > 0 ? parts.join(', ') : 'Location not available';
  }

  private nameMatches(fullName: string, searchName: string): boolean {
    const searchWords = searchName.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    const nameWords = fullName.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    // For exact matching, we want either:
    // 1. All search words appear as complete words in the name
    // 2. If searching for "First Last", check if first name matches and last name matches
    
    if (searchWords.length === 1) {
      // Single word search - should match any word in the name
      return nameWords.some(word => word === searchWords[0]);
    } else if (searchWords.length === 2) {
      // Two word search - likely "First Last" - check for exact first/last match
      const [searchFirst, searchLast] = searchWords;
      return nameWords.includes(searchFirst) && nameWords.includes(searchLast);
    } else {
      // Multi-word search - all words must be present as complete words
      return searchWords.every(searchWord => 
        nameWords.some(nameWord => nameWord === searchWord)
      );
    }
  }

  // NSF Formatting Methods
  private formatNSFAward(award: NSFAward): string {
    let result = `🏆 **NSF Award Details**\n\n`;
    result += `**Award Number:** ${award.awardNumber}\n`;
    result += `**Title:** ${award.title}\n`;
    result += `**Institution:** ${award.institution}\n\n`;
    
    result += `**Principal Investigator:** ${award.principalInvestigator}\n`;
    if (award.coPIs.length > 0) {
      result += `**Co-Principal Investigators:** ${award.coPIs.join(', ')}\n`;
    }
    result += `\n`;
    
    result += `**Funding Information:**\n`;
    result += `• Total Intended Award: ${award.totalIntendedAward}\n`;
    result += `• Total Awarded to Date: ${award.totalAwardedToDate}\n\n`;
    
    result += `**Project Timeline:**\n`;
    result += `• Start Date: ${award.startDate}\n`;
    result += `• End Date: ${award.endDate}\n\n`;
    
    result += `**Abstract:**\n${award.abstract}\n`;
    
    return result;
  }

  private formatProjectWithNSF(project: Project, nsfAward: NSFAward | null, errorMessage?: string): string {
    let result = `🔬 **ACCESS Project with NSF Award Context**\n\n`;
    
    // ACCESS Project Information
    result += `**ACCESS Project:**\n`;
    result += `• **Title:** ${project.requestTitle}\n`;
    result += `• **Project ID:** ${project.projectId}\n`;
    result += `• **PI:** ${project.pi} (${project.piInstitution})\n`;
    result += `• **Field:** ${project.fos}\n`;
    result += `• **Period:** ${project.beginDate} to ${project.endDate}\n\n`;
    
    if (project.resources.length > 0) {
      const resourceSummaries = project.resources.map(r => {
        const allocation = this.formatAllocation(r.allocation || 0, r.units, r.resourceName);
        return allocation ? `${r.resourceName} (${allocation})` : r.resourceName;
      });
      result += `• **ACCESS Resources:** ${resourceSummaries.join(', ')}\n\n`;
    }
    
    // NSF Award Information
    if (nsfAward) {
      result += `**🏆 Related NSF Award:**\n`;
      result += `• **Award Number:** ${nsfAward.awardNumber}\n`;
      result += `• **Title:** ${nsfAward.title}\n`;
      result += `• **Total Award:** ${nsfAward.totalIntendedAward}\n`;
      result += `• **NSF Period:** ${nsfAward.startDate} to ${nsfAward.endDate}\n\n`;
      
      result += `**💰 Funding vs Resources Analysis:**\n`;
      result += `This ACCESS allocation supports computational work funded by NSF award ${nsfAward.awardNumber} (${nsfAward.totalIntendedAward}). `;
      result += `The project spans ${project.beginDate} to ${project.endDate} on ACCESS resources.\n\n`;
    } else if (errorMessage) {
      result += `**NSF Award Search:** ${errorMessage}\n\n`;
    } else {
      result += `**NSF Award:** No matching NSF awards found for this project.\n\n`;
    }
    
    result += `**ACCESS Project Abstract:**\n${project.abstract}\n`;
    
    return result;
  }

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

  private formatProjectResults(projects: Project[], title: string): string {
    if (projects.length === 0) {
      return `${title}\n\nNo projects found matching the criteria.`;
    }

    let result = `${title}\n\n`;
    result += `Found ${projects.length} project${projects.length > 1 ? 's' : ''}:\n\n`;

    projects.forEach((project, index) => {
      result += `**${index + 1}. ${project.requestTitle}**\n`;
      result += `• **PI:** ${project.pi} (${project.piInstitution})\n`;
      result += `• **Field:** ${project.fos}\n`;
      result += `• **Type:** ${project.allocationType}\n`;
      result += `• **Period:** ${project.beginDate} to ${project.endDate}\n`;
      result += `• **Project ID:** ${project.projectId}\n`;
      
      if (project.resources.length > 0) {
        const resourceSummaries = project.resources.map(r => {
          const allocation = this.formatAllocation(r.allocation || 0, r.units, r.resourceName);
          return allocation ? `${r.resourceName} (${allocation})` : r.resourceName;
        });
        result += `• **Resources:** ${resourceSummaries.join(', ')}\n`;
      }
      
      // Show first 150 characters of abstract
      const abstractPreview = project.abstract.length > 150 
        ? project.abstract.substring(0, 150) + '...'
        : project.abstract;
      result += `• **Abstract:** ${abstractPreview}\n\n`;
    });

    return result;
  }

  private formatSingleProject(project: Project): string {
    let result = `📋 **Project Details**\n\n`;
    result += `**Title:** ${project.requestTitle}\n`;
    result += `**Project ID:** ${project.projectId}\n`;
    result += `**Request Number:** ${project.requestNumber}\n\n`;
    
    result += `**Principal Investigator:** ${project.pi}\n`;
    result += `**Institution:** ${project.piInstitution}\n`;
    result += `**Field of Science:** ${project.fos}\n`;
    result += `**Allocation Type:** ${project.allocationType}\n\n`;
    
    result += `**Project Period:**\n`;
    result += `• Start: ${project.beginDate}\n`;
    result += `• End: ${project.endDate}\n\n`;
    
    if (project.resources.length > 0) {
      result += `**Allocated Resources:**\n`;
      project.resources.forEach(resource => {
        result += `• **${resource.resourceName}**`;
        const allocation = this.formatAllocation(resource.allocation || 0, resource.units, resource.resourceName);
        if (allocation) {
          result += `: ${allocation}`;
        }
        result += `\n`;
      });
      result += `\n`;
    }
    
    result += `**Abstract:**\n${project.abstract}\n`;
    
    return result;
  }
}