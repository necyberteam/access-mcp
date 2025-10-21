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
              include_ai_metadata: true,
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.ai_metadata_included).toBe(true);
        expect(responseData.software[0].ai_metadata).toBeDefined();
        expect(responseData.software[0].ai_metadata.tags).toContain("machine-learning");
        expect(responseData.software[0].ai_metadata.research_area).toBe("Computer & Information Sciences");
        expect(responseData.software[0].ai_metadata.research_discipline).toBe("Artificial Intelligence & Intelligent Systems");
        expect(responseData.software[0].ai_metadata.research_field).toBe("Computer & Information Sciences");
        expect(responseData.software[0].ai_metadata.software_class).toBe("Library");
        expect(responseData.software[0].ai_metadata.core_features).toContain("machine learning");
        expect(responseData.software[0].ai_metadata.example_use).toContain("neural networks");
      });

      it("should exclude AI metadata when not requested", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_software",
            arguments: {
              query: "tensorflow",
              include_ai_metadata: false,
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.ai_metadata_included).toBe(false);
        expect(responseData.software[0].ai_metadata).toBeUndefined();
      });
    });

    describe("search_with_filters", () => {
      it("should filter by research area with query", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_with_filters",
            arguments: {
              query: "software",
              filter_research_area: "Chemistry",
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total_after_filter).toBe(1);
        expect(responseData.software[0].name).toBe("GROMACS");
      });
      
      it("should filter all software without query", async () => {
        // Mock the getAllSoftware API calls
        mockSdsClient.get.mockResolvedValueOnce({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_with_filters",
            arguments: {
              filter_research_area: "Chemistry",
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total_after_filter).toBe(1);
        expect(responseData.software[0].name).toBe("GROMACS");
      });

      it("should filter by tags", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_with_filters",
            arguments: {
              query: "software",
              filter_tags: ["visualization", "graphics"],
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total_after_filter).toBe(1);
        expect(responseData.software[0].name).toBe("ParaView");
      });

      it("should filter by software type", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_with_filters",
            arguments: {
              query: "software",
              filter_software_type: "Machine Learning",
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total_after_filter).toBe(1);
        expect(responseData.software[0].name).toBe("TensorFlow");
      });

      it("should apply multiple filters", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_with_filters",
            arguments: {
              query: "software",
              filter_research_area: "Computer",
              filter_tags: ["machine-learning"],
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total_after_filter).toBe(1);
        expect(responseData.software[0].name).toBe("TensorFlow");
      });

      it("should include new AI metadata fields in results", async () => {
        mockSdsClient.get.mockResolvedValue({
          status: 200,
          data: mockSoftwareWithAI,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_with_filters",
            arguments: {
              query: "software",
              filter_software_type: "Framework",
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total_after_filter).toBe(1);
        expect(responseData.software[0].name).toBe("TensorFlow");
        expect(responseData.software[0].ai_metadata.software_class).toBe("Library");
        expect(responseData.software[0].ai_metadata.research_discipline).toBe("Artificial Intelligence & Intelligent Systems");
        expect(responseData.software[0].ai_metadata.example_use).toContain("neural networks");
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
            name: "discover_filter_values",
            arguments: {
              query: "software",
              sample_size: 10,
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        
        expect(responseData.discovered_values.research_areas).toContain("Chemistry");
        expect(responseData.discovered_values.research_areas).toContain("Computer & Information Sciences");
        
        expect(responseData.discovered_values.software_types).toContain("Machine Learning Framework");
        expect(responseData.discovered_values.software_types).toContain("Simulation Software");
        
        // Check that tags are counted and sorted
        const mlTag = responseData.discovered_values.top_tags.find(
          (t: any) => t.value === "machine-learning"
        );
        expect(mlTag).toBeDefined();
        expect(mlTag.count).toBe(1);
      });
      
      it("should discover filter values from all software when no query provided", async () => {
        // Mock multiple API attempts for getAllSoftware
        mockSdsClient.get
          .mockResolvedValueOnce({ status: 404 }) // First attempt fails
          .mockResolvedValueOnce({ status: 404 }) // Second attempt fails
          .mockResolvedValueOnce({ status: 200, data: mockSoftwareWithAI }); // Third succeeds

        const result = await server["handleToolCall"]({
          params: {
            name: "discover_filter_values",
            arguments: {
              sample_size: 10,
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.discovered_values.research_areas.length).toBeGreaterThan(0);
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
            name: "discover_filter_values",
            arguments: {
              query: "tool", // Provide required parameter
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
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
      expect(responseData.error).toContain("SDS API error");
    });

    it("should provide enhanced error messages for invalid resource IDs", async () => {
      mockSdsClient.get.mockResolvedValue({
        status: 404,
        statusText: "Not Found",
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "list_software_by_resource",
          arguments: {
            resource_id: "invalid-resource.access-ci.org",
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.error).toContain("Resource ID not found");
      expect(responseData.solution).toContain("access-compute-resources:search_resources");
      expect(responseData.example).toContain("invalid-resource");
      expect(responseData.workflow).toBeDefined();
      expect(responseData.workflow.step_1).toContain("Search resources");
      expect(responseData.workflow.step_2).toContain("Find your target resource");
      expect(responseData.workflow.step_3).toContain("resource_ids");
      expect(responseData.quick_reference.common_resources).toContain("delta.ncsa.access-ci.org");
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