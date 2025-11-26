import { describe, it, expect, beforeEach, vi } from "vitest";
import { SoftwareDiscoveryServer } from "./server.js";

describe("SoftwareDiscoveryServer", () => {
  let server: SoftwareDiscoveryServer;
  let mockSdsClient: any;

  beforeEach(() => {
    server = new SoftwareDiscoveryServer();
    mockSdsClient = { get: vi.fn() };
    Object.defineProperty(server, "sdsClient", {
      get: () => mockSdsClient,
      configurable: true,
    });
  });

  describe("Enhanced Filtering", () => {
    const mockSoftwareWithAI = [
      {
        software_name: "TensorFlow",
        software_description: "Machine learning framework",
        ai_description: "Deep learning framework for neural networks",
        ai_general_tags: "machine-learning, deep-learning, gpu, python",
        ai_research_area: "Computer & Information Sciences",
        ai_research_discipline: "Artificial Intelligence & Intelligent Systems",
        ai_research_field: "Computer & Information Sciences",
        ai_software_type: "Machine Learning Framework",
        ai_software_class: "Library",
        ai_core_features: "Flexible architecture for machine learning",
        ai_example_use: "Building neural networks for image classification",
        rp_name: "delta.ncsa.access-ci.org",
        rp_group_id: "delta",
      },
      {
        software_name: "GROMACS",
        software_description: "Molecular dynamics package",
        ai_description: "Molecular dynamics simulation software",
        ai_general_tags: "molecular-dynamics, chemistry, physics, mpi",
        ai_research_area: "Chemistry",
        ai_research_discipline: "Biophysics",
        ai_research_field: "Chemistry",
        ai_software_type: "Simulation Software",
        ai_software_class: "Application",
        ai_core_features: "Efficient molecular dynamics algorithms",
        ai_example_use: "Protein folding simulations",
        rp_name: "anvil.purdue.access-ci.org",
        rp_group_id: "anvil",
      },
      {
        software_name: "ParaView",
        software_description: "Data visualization application",
        ai_description: "Scientific visualization and analysis tool",
        ai_general_tags: "visualization, data-analysis, parallel, graphics",
        ai_research_area: "Computer & Information Sciences",
        ai_research_discipline: "Visualization & Graphics",
        ai_research_field: "Computer & Information Sciences",
        ai_software_type: "Visualization Tool",
        ai_software_class: "Application",
        ai_core_features: "Parallel data visualization and analysis",
        ai_example_use: "Visualizing computational fluid dynamics results",
        rp_name: "bridges2.psc.access-ci.org",
        rp_group_id: "bridges2",
      },
    ];

    describe("search_software with AI metadata", () => {
      it("should include AI metadata when requested", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {
              query: "tensorflow",
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total).toBe(3);
        expect(responseData.items).toBeDefined();
        expect(responseData.items[0].ai_metadata).toBeDefined();
        expect(responseData.items[0].ai_metadata.tags).toContain("machine-learning");
        expect(responseData.items[0].ai_metadata.research_area).toBe("Computer & Information Sciences");
        expect(responseData.items[0].ai_metadata.research_discipline).toBe("Artificial Intelligence & Intelligent Systems");
        expect(responseData.items[0].ai_metadata.research_field).toBe("Computer & Information Sciences");
        expect(responseData.items[0].ai_metadata.software_class).toBe("Library");
        expect(responseData.items[0].ai_metadata.core_features).toContain("machine learning");
        expect(responseData.items[0].ai_metadata.example_use).toContain("neural networks");
      });

      it("should always include AI metadata in universal response", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {
              query: "tensorflow",
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total).toBe(3);
        expect(responseData.items).toBeDefined();
        expect(responseData.items[0].ai_metadata).toBeDefined();
      });
    });

    describe("search_software with filters", () => {
      it("should filter by research area with query", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {
              query: "software",
              tags: ["chemistry"],
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total).toBeGreaterThanOrEqual(1);
        const gromacsResult = responseData.items.find((s: any) => s.name === "GROMACS");
        expect(gromacsResult).toBeDefined();
      });

      it("should filter all software without query", async () => {
        // Mock the getAllSoftware API calls
        mockSdsClient.get.mockResolvedValueOnce({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {
              tags: ["chemistry"],
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total).toBeGreaterThanOrEqual(1);
        const gromacsResult = responseData.items.find((s: any) => s.name === "GROMACS");
        expect(gromacsResult).toBeDefined();
      });

      it("should filter by tags", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {
              query: "software",
              tags: ["visualization", "graphics"],
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total).toBeGreaterThanOrEqual(1);
        const paraviewResult = responseData.items.find((s: any) => s.name === "ParaView");
        expect(paraviewResult).toBeDefined();
      });

      it("should filter by software type via tags", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {
              query: "software",
              tags: ["machine-learning"],
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total).toBeGreaterThanOrEqual(1);
        const tensorflowResult = responseData.items.find((s: any) => s.name === "TensorFlow");
        expect(tensorflowResult).toBeDefined();
      });

      it("should apply multiple filters", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {
              query: "software",
              tags: ["machine-learning"],
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total).toBeGreaterThanOrEqual(1);
        const tensorflowResult = responseData.items.find((s: any) => s.name === "TensorFlow");
        expect(tensorflowResult).toBeDefined();
      });

      it("should include new AI metadata fields in results", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {
              query: "tensorflow",
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total).toBeGreaterThanOrEqual(1);
        const tensorflowResult = responseData.items.find((s: any) => s.name === "TensorFlow");
        expect(tensorflowResult).toBeDefined();
        expect(tensorflowResult.ai_metadata.software_class).toBe("Library");
        expect(tensorflowResult.ai_metadata.research_discipline).toBe("Artificial Intelligence & Intelligent Systems");
        expect(tensorflowResult.ai_metadata.example_use).toContain("neural networks");
      });

      it("should list popular software when no query provided", async () => {
        // Mock successful wildcard API response
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {},
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData).toHaveProperty("total");
        expect(responseData).toHaveProperty("items");
        expect(Array.isArray(responseData.items)).toBe(true);
        expect(responseData.total).toBeGreaterThan(0);

        // Should include AI metadata
        if (responseData.items.length > 0) {
          expect(responseData.items[0]).toHaveProperty("ai_metadata");
        }
      });

      it("should respect limit when listing all software", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {
              limit: 2,
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.items.length).toBeLessThanOrEqual(2);
      });
    });

    describe("discover_filter_values", () => {
      it("should discover unique filter values from data with query", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {
              query: "software",
              discover: true,
              limit: 10,
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);

        // With discover, the response should include discovered_values
        expect(responseData).toHaveProperty("discovered_values");
        expect(responseData.discovered_values).toHaveProperty("research_areas");
        expect(responseData.discovered_values).toHaveProperty("software_types");
        expect(responseData.discovered_values).toHaveProperty("top_tags");
      });

      it("should discover filter values from all software when no query provided", async () => {
        // Mock multiple API attempts for getAllSoftware
        mockSdsClient.get
          .mockResolvedValueOnce({ status: 404 }) // First attempt fails
          .mockResolvedValueOnce({ status: 404 }) // Second attempt fails
          .mockResolvedValueOnce({ status: 200, data: mockSoftwareWithAI }); // Third succeeds

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {
              discover: true,
              limit: 10,
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData).toHaveProperty("discovered_values");
        expect(responseData.sample_info.actual_sampled).toBeGreaterThan(0);
      });


      it("should handle empty AI metadata gracefully", async () => {
        const softwareWithoutAI = [
          {
            software_name: "BasicTool",
            software_description: "A basic tool",
            rp_name: "test.access-ci.org",
          },
        ];

        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: softwareWithoutAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {
              query: "tool",
              discover: true,
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.discovered_values).toBeDefined();
        expect(responseData.discovered_values.research_areas).toEqual([]);
        expect(responseData.discovered_values.software_types).toEqual([]);
        expect(responseData.discovered_values.top_tags).toEqual([]);
      });
    });
  });

  describe("API Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      mockSdsClient.get.mockResolvedValue({
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_software",
          arguments: {
            query: "test",
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.error).toBeDefined();
      expect(responseData.error).toContain("SDS API error");
    });

    it("should provide error messages for invalid resource IDs", async () => {
      mockSdsClient.get.mockResolvedValue({
        status: 404,
        statusText: "Not Found",
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_software",
          arguments: {
            resource: "invalid-resource.access-ci.org",
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      // When resource ID is not found, the API returns 404
      // The error handling should provide helpful feedback
      expect(responseData.error).toBeDefined();
      expect(responseData.error).toContain("Resource ID not found");
    });

    it("should handle missing API key", async () => {
      // Temporarily remove API key
      const originalKey = process.env.SDS_API_KEY;
      delete process.env.SDS_API_KEY;
      delete process.env.VITE_SDS_API_KEY;

      const result = await server["handleToolCall"]({
        params: {
          name: "search_software",
          arguments: {
            query: "test",
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.error).toContain("SDS API key not configured");

      // Restore API key
      if (originalKey) {
        process.env.SDS_API_KEY = originalKey;
      }
    });
  });
});