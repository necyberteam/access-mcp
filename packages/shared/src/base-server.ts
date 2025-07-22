import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';

export abstract class BaseAccessServer {
  protected server: Server;
  protected transport: StdioServerTransport;
  protected httpClient: AxiosInstance;

  constructor(protected serverName: string, protected version: string) {
    this.server = new Server(
      {
        name: serverName,
        version: version,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.transport = new StdioServerTransport();
    this.httpClient = axios.create({
      baseURL: 'https://support.access-ci.org/api',
      timeout: 10000,
      headers: {
        'User-Agent': `${serverName}/${version}`,
      },
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: this.getResources(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) =>
      this.handleToolCall(request)
    );

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) =>
      this.handleResourceRead(request)
    );
  }

  protected abstract getTools(): any[];
  protected abstract getResources(): any[];
  protected abstract handleToolCall(request: any): Promise<any>;
  protected abstract handleResourceRead(request: any): Promise<any>;

  async start() {
    await this.server.connect(this.transport);
    // MCP servers should not output anything to stderr/stdout when running
    // as it interferes with JSON-RPC communication
  }
}