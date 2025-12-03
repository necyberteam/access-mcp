import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { SoftwareDiscoveryServer } from "./server.js";

interface MockResponse {
  status: number;
  data: unknown;
}

interface MockSdsClient {
  post: Mock<(url: string, data?: unknown) => Promise<MockResponse>>;
}

interface SoftwareComparisonResult {
  software: string;
  found: boolean;
  available_on: string[];
  resource_count: number;
}

interface TransformedSoftwareResult {
  name: string;
  available_on_resources: string[];
}

interface OtherMatchResult {
  name: string;
  resources: string[];
}

interface TextContent {
  type: "text";
  text: string;
}

describe("SoftwareDiscoveryServer", () => {
  let server: SoftwareDiscoveryServer;
  let mockSdsClient: MockSdsClient;

  // Mock data using the new API response format with nested rps object
  const mockSoftwareWithAI = {
    data: [
      {
        software_name: "TensorFlow",
        software_description: "Machine learning framework",
        software_web_page: "https://tensorflow.org",
        software_documentation: "https://tensorflow.org/docs",
        rps: {
          "delta.ncsa.access-ci.org": {
            rp_name: "delta",
            rp_resource_id: ["delta-gpu.ncsa.access-ci.org", "delta-cpu.ncsa.access-ci.org"],
            software_versions: "2.10,2.11,2.12",
            rp_software_documentation: "https://docs.ncsa.edu"
          },
          "anvil.purdue.access-ci.org": {
            rp_name: "anvil",
            rp_resource_id: ["anvil.purdue.access-ci.org"],
            software_versions: "2.11",
            rp_software_documentation: "https://www.rcac.purdue.edu"
          }
        },
        ai_description: "Deep learning framework for neural networks",
        ai_general_tags: "machine-learning, deep-learning, gpu, python",
        ai_research_area: "Computer & Information Sciences",
        ai_research_discipline: "Artificial Intelligence & Intelligent Systems",
        ai_research_field: "Computer & Information Sciences",
        ai_software_type: "Machine Learning Framework",
        ai_software_class: "Library",
        ai_core_features: "Flexible architecture for machine learning",
        ai_example_use: "Building neural networks for image classification",
      },
      {
        software_name: "GROMACS",
        software_description: "Molecular dynamics package",
        software_web_page: "https://www.gromacs.org",
        rps: {
          "anvil.purdue.access-ci.org": {
            rp_name: "anvil",
            rp_resource_id: ["anvil.purdue.access-ci.org"],
            software_versions: "2022.3,2023.1",
            rp_software_documentation: ""
          },
          "expanse.sdsc.access-ci.org": {
            rp_name: "expanse",
            rp_resource_id: ["expanse.sdsc.access-ci.org"],
            software_versions: "2023.1",
            rp_software_documentation: ""
          }
        },
        ai_description: "Molecular dynamics simulation software",
        ai_general_tags: "molecular-dynamics, chemistry, physics, mpi",
        ai_research_area: "Chemistry",
        ai_research_discipline: "Biophysics",
        ai_research_field: "Chemistry",
        ai_software_type: "Simulation Software",
        ai_software_class: "Application",
        ai_core_features: "Efficient molecular dynamics algorithms",
        ai_example_use: "Protein folding simulations",
      },
      {
        software_name: "ParaView",
        software_description: "Data visualization application",
        software_web_page: "https://www.paraview.org",
        rps: {
          "bridges2.psc.access-ci.org": {
            rp_name: "bridges2",
            rp_resource_id: ["bridges2.psc.access-ci.org"],
            software_versions: "5.10,5.11",
            rp_software_documentation: ""
          }
        },
        ai_description: "Scientific visualization and analysis tool",
        ai_general_tags: "visualization, data-analysis, parallel, graphics",
        ai_research_area: "Computer & Information Sciences",
        ai_research_discipline: "Visualization & Graphics",
        ai_research_field: "Computer & Information Sciences",
        ai_software_type: "Visualization Tool",
        ai_software_class: "Application",
        ai_core_features: "Parallel data visualization and analysis",
        ai_example_use: "Visualizing computational fluid dynamics results",
      },
    ]
  };

  beforeEach(() => {
    server = new SoftwareDiscoveryServer();
    mockSdsClient = { post: vi.fn() };
    Object.defineProperty(server, "sdsClient", {
      get: () => mockSdsClient,
      configurable: true,
    });
    // Set a mock API key for tests
    process.env.SDS_API_KEY = "test-api-key";
  });

  describe("search_software", () => {
    it("should search software with query", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "tensorflow",
          },
        },
      });

      expect(mockSdsClient.post).toHaveBeenCalledWith("/api/v1", {
        software: ["tensorflow"],
        fuzz_software: true,
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.total).toBe(3);
      expect(responseData.query).toBe("tensorflow");
      expect(responseData.fuzzy_matching).toBe(true);
      expect(responseData.items).toBeDefined();
    });

    it("should include AI metadata by default", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "tensorflow",
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.items[0].ai_metadata).toBeDefined();
      expect(responseData.items[0].ai_metadata.tags).toContain("machine-learning");
      expect(responseData.items[0].ai_metadata.research_area).toBe("Computer & Information Sciences");
      expect(responseData.items[0].ai_metadata.software_class).toBe("Library");
    });

    it("should extract resources from rps object", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "tensorflow",
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      const tensorflow = responseData.items[0];

      expect(tensorflow.available_on_resources).toContain("delta");
      expect(tensorflow.available_on_resources).toContain("anvil");
      expect(tensorflow.resource_ids).toContain("delta-gpu.ncsa.access-ci.org");
      expect(tensorflow.versions_by_resource).toBeDefined();
      expect(tensorflow.versions_by_resource.delta).toBe("2.10,2.11,2.12");
    });

    it("should filter by resource with fuzzy matching", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "tensorflow",
            resource: "delta",
          },
        },
      });

      expect(mockSdsClient.post).toHaveBeenCalledWith("/api/v1", {
        software: ["tensorflow"],
        fuzz_software: true,
        rps: ["delta"],
        fuzz_rp: true,
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.resource_filter).toBe("delta");
    });

    it("should disable fuzzy matching when requested", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "tensorflow",
            fuzzy: false,
          },
        },
      });

      expect(mockSdsClient.post).toHaveBeenCalledWith("/api/v1", {
        software: ["tensorflow"],
      });
    });

    it("should list all software when no query provided", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {},
        },
      });

      expect(mockSdsClient.post).toHaveBeenCalledWith("/api/v1", {
        software: ["*"],
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.total).toBe(3);
      expect(responseData.query).toBeNull();
    });

    it("should respect limit parameter", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            limit: 2,
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.items.length).toBe(2);
    });

    it("should exclude AI metadata when requested", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "tensorflow",
            include_ai_metadata: false,
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.items[0].ai_metadata).toBeUndefined();
    });
  });

  describe("list_all_software", () => {
    it("should list all software", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "list_all_software",
          arguments: {},
        },
      });

      expect(mockSdsClient.post).toHaveBeenCalledWith("/api/v1", {
        software: ["*"],
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.total).toBe(3);
      expect(responseData.resource_filter).toBe("all resources");
    });

    it("should filter by resource", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "list_all_software",
          arguments: {
            resource: "anvil",
          },
        },
      });

      expect(mockSdsClient.post).toHaveBeenCalledWith("/api/v1", {
        software: ["*"],
        rps: ["anvil"],
        fuzz_rp: true,
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.resource_filter).toBe("anvil");
    });

    it("should exclude AI metadata by default", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "list_all_software",
          arguments: {},
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.items[0].ai_metadata).toBeUndefined();
    });

    it("should include AI metadata when requested", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "list_all_software",
          arguments: {
            include_ai_metadata: true,
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.items[0].ai_metadata).toBeDefined();
    });
  });

  describe("get_software_details", () => {
    it("should get details for a specific software", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: { data: [mockSoftwareWithAI.data[0]] },
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "get_software_details",
          arguments: {
            software_name: "tensorflow",
          },
        },
      });

      expect(mockSdsClient.post).toHaveBeenCalledWith("/api/v1", {
        software: ["tensorflow"],
        fuzz_software: true,
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.found).toBe(true);
      expect(responseData.software_name).toBe("tensorflow");
      expect(responseData.details).toBeDefined();
      expect(responseData.details.name).toBe("TensorFlow");
      expect(responseData.details.ai_metadata).toBeDefined();
    });

    it("should include other matches when multiple results", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "get_software_details",
          arguments: {
            software_name: "software",
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.found).toBe(true);
      expect(responseData.other_matches).toBeDefined();
      expect(responseData.other_matches.length).toBe(2);
    });

    it("should handle software not found", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: { data: [] },
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "get_software_details",
          arguments: {
            software_name: "nonexistent",
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.found).toBe(false);
      expect(responseData.message).toContain("No software found");
    });

    it("should filter by resource when provided", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: { data: [mockSoftwareWithAI.data[0]] },
      });

      await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "get_software_details",
          arguments: {
            software_name: "tensorflow",
            resource: "delta",
          },
        },
      });

      expect(mockSdsClient.post).toHaveBeenCalledWith("/api/v1", {
        software: ["tensorflow"],
        fuzz_software: true,
        rps: ["delta"],
        fuzz_rp: true,
      });
    });
  });

  describe("compare_software_availability", () => {
    it("should compare software availability across resources", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "compare_software_availability",
          arguments: {
            software_names: ["tensorflow", "gromacs"],
          },
        },
      });

      expect(mockSdsClient.post).toHaveBeenCalledWith("/api/v1", {
        software: ["tensorflow", "gromacs"],
        fuzz_software: true,
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.requested_software).toEqual(["tensorflow", "gromacs"]);
      expect(responseData.comparison).toBeDefined();
      expect(responseData.comparison.length).toBe(2);
      expect(responseData.summary).toBeDefined();
    });

    it("should filter by specific resources when provided", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "compare_software_availability",
          arguments: {
            software_names: ["tensorflow", "gromacs"],
            resources: ["anvil", "delta"],
          },
        },
      });

      expect(mockSdsClient.post).toHaveBeenCalledWith("/api/v1", {
        software: ["tensorflow", "gromacs"],
        fuzz_software: true,
        rps: ["anvil", "delta"],
        fuzz_rp: true,
      });
    });

    it("should build correct availability matrix", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "compare_software_availability",
          arguments: {
            software_names: ["tensorflow", "gromacs"],
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);

      const tensorflowComparison = responseData.comparison.find(
        (c: SoftwareComparisonResult) => c.software === "tensorflow"
      );
      expect(tensorflowComparison.found).toBe(true);
      expect(tensorflowComparison.available_on).toContain("delta");
      expect(tensorflowComparison.available_on).toContain("anvil");

      const gromacsComparison = responseData.comparison.find(
        (c: SoftwareComparisonResult) => c.software === "gromacs"
      );
      expect(gromacsComparison.found).toBe(true);
      expect(gromacsComparison.available_on).toContain("anvil");
      expect(gromacsComparison.available_on).toContain("expanse");
    });

    it("should report software not found in summary", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: { data: [mockSoftwareWithAI.data[0]] }, // Only TensorFlow
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "compare_software_availability",
          arguments: {
            software_names: ["tensorflow", "nonexistent"],
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.summary.software_found).toBe(1);
      expect(responseData.summary.software_not_found).toContain("nonexistent");
    });
  });

  describe("Result Sorting (Priority-based)", () => {
    // Mock data where API returns results in non-optimal order
    const mockUnsortedResults = {
      data: [
        {
          software_name: "gpytorch",  // contains "pytorch" but not exact
          rps: { "aces.tamu.access-ci.org": { rp_name: "aces", rp_resource_id: [], software_versions: "1.0" } },
        },
        {
          software_name: "miniforge3_pytorch",  // contains "pytorch"
          rps: { "delta.ncsa.access-ci.org": { rp_name: "delta", rp_resource_id: [], software_versions: "1.0" } },
        },
        {
          software_name: "pytorch",  // exact match - should be first
          rps: {
            "anvil.purdue.access-ci.org": { rp_name: "anvil", rp_resource_id: [], software_versions: "2.0" },
            "delta.ncsa.access-ci.org": { rp_name: "delta", rp_resource_id: [], software_versions: "2.0" },
          },
        },
        {
          software_name: "pytorch-lightning",  // starts with "pytorch"
          rps: { "aces.tamu.access-ci.org": { rp_name: "aces", rp_resource_id: [], software_versions: "1.0" } },
        },
      ]
    };

    it("should sort search_software results: exact > starts-with > contains", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockUnsortedResults,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: { query: "pytorch" },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      const names = responseData.items.map((i: TransformedSoftwareResult) => i.name);

      expect(names[0]).toBe("pytorch");  // exact match first
      expect(names[1]).toBe("pytorch-lightning");  // starts-with second
      // contains matches last
      expect(names).toContain("gpytorch");
      expect(names).toContain("miniforge3_pytorch");
    });

    it("should sort get_software_details results and return exact match as best", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockUnsortedResults,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "get_software_details",
          arguments: { software_name: "pytorch" },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);

      expect(responseData.details.name).toBe("pytorch");  // exact match as best
      expect(responseData.details.available_on_resources).toContain("anvil");
      expect(responseData.details.available_on_resources).toContain("delta");

      // Other matches should be sorted too
      const otherNames = responseData.other_matches.map((m: OtherMatchResult) => m.name);
      expect(otherNames[0]).toBe("pytorch-lightning");  // starts-with before contains
    });

    it("should prioritize exact match in compare_software_availability", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockUnsortedResults,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "compare_software_availability",
          arguments: { software_names: ["pytorch"] },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      const pytorchComparison = responseData.comparison.find((c: SoftwareComparisonResult) => c.software === "pytorch");

      expect(pytorchComparison.found).toBe(true);
      expect(pytorchComparison.resource_count).toBe(2);  // anvil and delta from exact "pytorch"
      expect(pytorchComparison.available_on).toContain("anvil");
      expect(pytorchComparison.available_on).toContain("delta");
    });

    it("should not sort when no query provided in search_software", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockUnsortedResults,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: { limit: 10 },  // no query
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      // Should return in API order when no query
      expect(responseData.items[0].name).toBe("gpytorch");
    });
  });

  describe("API Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 500,
        data: null,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "test",
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.error).toBeDefined();
      expect(responseData.error).toContain("SDS API error");
    });

    it("should handle missing API key", async () => {
      // Temporarily remove API key
      const originalKey = process.env.SDS_API_KEY;
      delete process.env.SDS_API_KEY;
      delete process.env.VITE_SDS_API_KEY;

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "test",
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.error).toContain("SDS API key not configured");

      // Restore API key
      if (originalKey) {
        process.env.SDS_API_KEY = originalKey;
      }
    });

    it("should handle network errors", async () => {
      mockSdsClient.post.mockRejectedValue(new Error("Network error"));

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "test",
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.error).toBeDefined();
    });
  });

  describe("Resource ID Normalization", () => {
    it("should normalize XSEDE resource IDs to ACCESS-CI format", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            resource: "stampede2.tacc.xsede.org",
          },
        },
      });

      expect(mockSdsClient.post).toHaveBeenCalledWith("/api/v1", {
        software: ["*"],
        rps: ["stampede2.tacc.access-ci.org"],
        fuzz_rp: true,
      });
    });

    it("should normalize GPU/CPU suffixed resource IDs", async () => {
      mockSdsClient.post.mockResolvedValue({
        status: 200,
        data: mockSoftwareWithAI,
      });

      await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            resource: "delta-gpu.ncsa.access-ci.org",
          },
        },
      });

      expect(mockSdsClient.post).toHaveBeenCalledWith("/api/v1", {
        software: ["*"],
        rps: ["delta.ncsa.access-ci.org"],
        fuzz_rp: true,
      });
    });
  });

  describe("Tool Definitions", () => {
    it("should define search_software tool with correct schema", () => {
      const tools = server["getTools"]();
      const searchTool = tools.find((t) => t.name === "search_software");

      expect(searchTool).toBeDefined();
      expect(searchTool?.description).toContain("fuzzy matching");

      const properties = searchTool?.inputSchema.properties;
      expect(properties).toBeDefined();
      expect(properties?.query).toBeDefined();
      expect(properties?.resource).toBeDefined();
      expect(properties?.fuzzy).toBeDefined();
      expect(properties?.include_ai_metadata).toBeDefined();
      expect(properties?.limit).toBeDefined();
    });

    it("should define list_all_software tool", () => {
      const tools = server["getTools"]();
      const listTool = tools.find((t) => t.name === "list_all_software");

      expect(listTool).toBeDefined();
      expect(listTool?.description).toContain("List all");
      expect(listTool?.description).toContain("software");
    });

    it("should define get_software_details tool with required parameters", () => {
      const tools = server["getTools"]();
      const detailsTool = tools.find((t) => t.name === "get_software_details");

      expect(detailsTool).toBeDefined();
      expect(detailsTool?.inputSchema.required).toContain("software_name");
    });

    it("should define compare_software_availability tool with required parameters", () => {
      const tools = server["getTools"]();
      const compareTool = tools.find((t) => t.name === "compare_software_availability");

      expect(compareTool).toBeDefined();
      expect(compareTool?.inputSchema.required).toContain("software_names");
    });
  });
});
