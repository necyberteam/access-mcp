import { BaseAccessServer, handleApiError } from '../../shared/dist/index.js';
import axios, { AxiosInstance } from 'axios';

export class SoftwareDiscoveryServer extends BaseAccessServer {
  private _sdsClient?: AxiosInstance;

  constructor() {
    super('access-mcp-software-discovery', '0.1.0', 'https://ara-db.ccs.uky.edu');
  }

  protected get sdsClient(): AxiosInstance {
    if (!this._sdsClient) {
      this._sdsClient = axios.create({
        baseURL: 'https://ara-db.ccs.uky.edu',
        timeout: 10000,
        headers: {
          'User-Agent': 'access-mcp-software-discovery/0.1.0',
        },
        validateStatus: () => true,
      });
    }
    return this._sdsClient;
  }

  protected getTools() {
    return [
      {
        name: 'search_software',
        description: 'Search for software packages across ACCESS-CI resources',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for software names or descriptions',
            },
            resource_filter: {
              type: 'string',
              description: 'Optional: filter results by specific resource ID',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_software_by_resource',
        description: 'List all available software packages for a specific ACCESS-CI resource',
        inputSchema: {
          type: 'object',
          properties: {
            resource_id: {
              type: 'string',
              description: 'The resource ID (e.g., anvil.purdue.access-ci.org)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of packages to return (default: 100)',
            },
          },
          required: ['resource_id'],
        },
      },
      {
        name: 'get_software_details',
        description: 'Get detailed information about a specific software package',
        inputSchema: {
          type: 'object',
          properties: {
            software_name: {
              type: 'string',
              description: 'Name of the software package',
            },
            resource_id: {
              type: 'string',
              description: 'Optional: specific resource to get package details for',
            },
          },
          required: ['software_name'],
        },
      },
      {
        name: 'get_software_categories',
        description: 'Get available software categories and domains',
        inputSchema: {
          type: 'object',
          properties: {
            resource_id: {
              type: 'string',
              description: 'Optional: filter categories by specific resource',
            },
          },
          required: [],
        },
      },
    ];
  }

  protected getResources() {
    return [
      {
        uri: 'accessci://software-discovery',
        name: 'ACCESS-CI Software Discovery Service',
        description: 'Search and discover software packages available on ACCESS-CI resources',
        mimeType: 'application/json',
      },
      {
        uri: 'accessci://software/categories',
        name: 'Software Categories',
        description: 'Browse software by category and domain',
        mimeType: 'application/json',
      },
    ];
  }

  protected async handleToolCall(request: any) {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case 'search_software':
          return await this.searchSoftware(args.query, args.resource_filter);
        case 'list_software_by_resource':
          return await this.listSoftwareByResource(args.resource_id, args.limit);
        case 'get_software_details':
          return await this.getSoftwareDetails(args.software_name, args.resource_id);
        case 'get_software_categories':
          return await this.getSoftwareCategories(args.resource_id);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${handleApiError(error)}`,
          },
        ],
      };
    }
  }

  protected async handleResourceRead(request: any) {
    const { uri } = request.params;

    switch (uri) {
      case 'accessci://software-discovery':
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: 'ACCESS-CI Software Discovery Service - Search and discover software packages available on ACCESS-CI resources.',
            },
          ],
        };
      case 'accessci://software/categories':
        const categories = await this.getSoftwareCategories();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: categories.content[0].text,
            },
          ],
        };
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  private async searchSoftware(query: string, resourceFilter?: string) {
    const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
    
    if (!apiKey) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'SDS API key not configured. Set SDS_API_KEY environment variable.',
              results: []
            }, null, 2),
          },
        ],
      };
    }

    // For search, we'll need to query multiple resources or use a search endpoint
    // For now, implement basic search by getting software for a specific resource if provided
    if (resourceFilter) {
      return await this.listSoftwareByResource(resourceFilter, 100, query);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: 'Global software search requires a resource_filter parameter for now. Use list_software_by_resource with a specific resource ID.',
            query,
            results: []
          }, null, 2),
        },
      ],
    };
  }

  private async listSoftwareByResource(resourceId: string, limit = 100, searchQuery?: string) {
    const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
    
    if (!apiKey) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              resource_id: resourceId,
              error: 'SDS API key not configured. Set SDS_API_KEY environment variable.',
              software: []
            }, null, 2),
          },
        ],
      };
    }

    const apiFields = [
      'software_name',
      'software_description', 
      'software_web_page',
      'software_documentation',
      'software_use_link',
      'software_versions'
    ];

    const response = await this.sdsClient.get(
      `/api=API_0/${apiKey}/rp=${resourceId}?include=${apiFields.join(',')}`
    );

    if (response.status !== 200) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              resource_id: resourceId,
              error: `SDS API error: ${response.status} ${response.statusText}`,
              software: []
            }, null, 2),
          },
        ],
      };
    }

    let softwareList = Array.isArray(response.data) ? response.data : [];

    // Apply search filter if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      softwareList = softwareList.filter((pkg: any) => 
        pkg.software_name?.toLowerCase().includes(query) ||
        pkg.software_description?.toLowerCase().includes(query)
      );
    }

    // Apply limit
    if (limit && softwareList.length > limit) {
      softwareList = softwareList.slice(0, limit);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            resource_id: resourceId,
            total_packages: softwareList.length,
            search_query: searchQuery,
            software: softwareList.map((pkg: any) => ({
              name: pkg.software_name,
              description: pkg.software_description,
              versions: pkg.software_versions || [],
              documentation: pkg.software_documentation,
              website: pkg.software_web_page,
              usage_link: pkg.software_use_link
            }))
          }, null, 2),
        },
      ],
    };
  }

  private async getSoftwareDetails(softwareName: string, resourceId?: string) {
    if (!resourceId) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              software_name: softwareName,
              error: 'resource_id parameter is required to get software details',
              details: null
            }, null, 2),
          },
        ],
      };
    }

    // Get all software for the resource and filter by name
    const allSoftware = await this.listSoftwareByResource(resourceId, 1000);
    const allSoftwareData = JSON.parse(allSoftware.content[0].text);
    
    if (allSoftwareData.error) {
      return allSoftware;
    }

    const softwareDetails = allSoftwareData.software.find((pkg: any) => 
      pkg.name.toLowerCase() === softwareName.toLowerCase()
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            software_name: softwareName,
            resource_id: resourceId,
            found: !!softwareDetails,
            details: softwareDetails || null
          }, null, 2),
        },
      ],
    };
  }

  private async getSoftwareCategories(resourceId?: string) {
    // This would ideally query the SDS API for categories
    // For now, return common software categories found on HPC systems
    const categories = [
      { name: 'Compilers', description: 'Programming language compilers and toolchains' },
      { name: 'Libraries', description: 'Software libraries and frameworks' },
      { name: 'Applications', description: 'End-user applications and tools' },
      { name: 'Development Tools', description: 'Development and debugging tools' },
      { name: 'Scientific Computing', description: 'Scientific and numerical computing packages' },
      { name: 'Data Analytics', description: 'Data analysis and visualization tools' },
      { name: 'Machine Learning', description: 'AI and machine learning frameworks' },
      { name: 'Bioinformatics', description: 'Biological data analysis tools' },
      { name: 'Chemistry', description: 'Computational chemistry packages' },
      { name: 'Physics', description: 'Physics simulation and modeling tools' },
    ];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            resource_id: resourceId,
            categories: categories
          }, null, 2),
        },
      ],
    };
  }
}