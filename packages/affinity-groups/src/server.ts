import { BaseAccessServer, handleApiError, sanitizeGroupId } from '../../shared/dist/index.js';

export class AffinityGroupsServer extends BaseAccessServer {
  constructor() {
    super('access-mcp-affinity-groups', '0.1.0');
  }

  protected getTools() {
    return [
      {
        name: 'get_affinity_group',
        description: 'Get information about a specific ACCESS-CI affinity group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The affinity group ID (e.g., bridges2.psc.access-ci.org)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_affinity_group_events',
        description: 'Get events and trainings for a specific ACCESS-CI affinity group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The affinity group ID (e.g., bridges2.psc.access-ci.org)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_affinity_group_kb',
        description: 'Get knowledge base resources for a specific ACCESS-CI affinity group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The affinity group ID (e.g., bridges2.psc.access-ci.org)',
            },
          },
          required: ['group_id'],
        },
      },
    ];
  }

  protected getResources() {
    return [
      {
        uri: 'accessci://affinity-groups',
        name: 'ACCESS-CI Affinity Groups',
        description: 'Information about ACCESS-CI affinity groups, their events, and knowledge base resources',
        mimeType: 'application/json',
      },
    ];
  }

  protected async handleToolCall(request: any) {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'get_affinity_group':
          return await this.getAffinityGroup(args.group_id);
        case 'get_affinity_group_events':
          return await this.getAffinityGroupEvents(args.group_id);
        case 'get_affinity_group_kb':
          return await this.getAffinityGroupKB(args.group_id);
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

    if (uri === 'accessci://affinity-groups') {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: 'ACCESS-CI Affinity Groups API - Use the available tools to query specific groups, events, and knowledge base resources.',
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  }

  private async getAffinityGroup(groupId: string) {
    const sanitizedId = sanitizeGroupId(groupId);
    const response = await this.httpClient.get(`/1.0/affinity_groups/${sanitizedId}`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getAffinityGroupEvents(groupId: string) {
    const sanitizedId = sanitizeGroupId(groupId);
    const response = await this.httpClient.get(`/1.1/events/ag/${sanitizedId}`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getAffinityGroupKB(groupId: string) {
    const sanitizedId = sanitizeGroupId(groupId);
    const response = await this.httpClient.get(`/1.0/kb/${sanitizedId}`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }
}