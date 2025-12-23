import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { ComputeResourcesServer } from "./server.js";

interface MockHttpClient {
  get: Mock<(url: string) => Promise<{ status: number; statusText?: string; data: unknown }>>;
}

interface ComputeResource {
  name?: string;
  organization_names?: string[];
}

interface HardwareItem {
  cider_type?: string;
  name?: string;
}

describe("ComputeResourcesServer", () => {
  let server: ComputeResourcesServer;
  let mockHttpClient: MockHttpClient;

  beforeEach(() => {
    server = new ComputeResourcesServer();
    mockHttpClient = { get: vi.fn() };
    Object.defineProperty(server, "httpClient", {
      get: () => mockHttpClient,
      configurable: true,
    });
  });

  const mockResourceGroups = {
    results: {
      active_groups: [
        {
          info_groupid: 1,
          group_descriptive_name: "Delta",
          group_description: "GPU-focused supercomputer at NCSA",
          rollup_organization_ids: [100],
          rollup_feature_ids: [139, 142], // access allocated, GPU
          rollup_info_resourceids: ["delta.ncsa.access-ci.org"],
          group_logo_url: "https://example.com/delta.png",
        },
        {
          info_groupid: 2,
          group_descriptive_name: "Anvil",
          group_description: "CPU compute cluster at Purdue",
          rollup_organization_ids: [101],
          rollup_feature_ids: [139], // access allocated
          rollup_info_resourceids: ["anvil.purdue.access-ci.org"],
          group_logo_url: "https://example.com/anvil.png",
        },
        {
          info_groupid: 3,
          group_descriptive_name: "Jetstream2",
          group_description: "Cloud computing platform",
          rollup_organization_ids: [102],
          rollup_feature_ids: [139], // access allocated
          rollup_info_resourceids: ["jetstream2.iu.access-ci.org"],
          group_logo_url: "https://example.com/jetstream.png",
        },
      ],
    },
  };

  // Updated to match new /wh2/cider/v1/organizations/ endpoint structure
  const mockOrganizations = {
    results: [
      {
        organization_id: 100,
        organization_name: "National Center for Supercomputing Applications",
        organization_abbrev: "NCSA",
      },
      {
        organization_id: 101,
        organization_name: "Purdue University",
        organization_abbrev: "Purdue",
      },
      {
        organization_id: 102,
        organization_name: "Indiana University",
        organization_abbrev: "IU",
      },
    ],
    status_code: 200,
  };

  describe("Tool Definitions", () => {
    it("should include search_resources tool with universal standard description", () => {
      const tools = server["getTools"]();

      const searchTool = tools.find((t) => t.name === "search_resources");
      expect(searchTool).toBeDefined();
      expect(searchTool?.description).toContain("Search ACCESS-CI compute resources");
      expect(searchTool?.description).toContain("Returns {total, items}");
    });

    it("should have consolidated tools", () => {
      const tools = server["getTools"]();
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain("search_resources");
      expect(toolNames).toContain("get_resource_hardware");
      expect(tools).toHaveLength(2);
    });
  });

  describe("search_resources (list all)", () => {
    it("should list compute resources with organization names", async () => {
      // Mock resource groups first, then organizations (actual call order)
      mockHttpClient.get
        .mockResolvedValueOnce({
          // Resource groups call (first)
          status: 200,
          data: mockResourceGroups,
        })
        .mockResolvedValueOnce({
          // Organizations call (second)
          status: 200,
          data: mockOrganizations,
        });

      // Verify mock is set up
      expect(mockHttpClient.get).toBeDefined();
      expect(vi.isMockFunction(mockHttpClient.get)).toBe(true);

      const result = await server["handleToolCall"]({
        params: {
          name: "search_resources",
          arguments: {},
        },
      });

      // Verify mock was called
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.total).toBe(3);
      expect(responseData.items).toHaveLength(3);

      const delta = responseData.items.find((r: ComputeResource) => r.name === "Delta");
      expect(delta).toBeDefined();
      expect(delta.description).toContain("GPU-focused");
      expect(delta.hasGpu).toBe(true);
      expect(delta.resourceType).toBe("gpu");
      expect(delta.organization_names).toContain("National Center for Supercomputing Applications");
      expect(delta.resourceIds).toContain("delta.ncsa.access-ci.org");
    });

    it("should handle organization lookup failure gracefully", async () => {
      // Mock successful resource groups, failed organization lookup
      mockHttpClient.get
        .mockResolvedValueOnce({
          // Resource groups call succeeds (first)
          status: 200,
          data: mockResourceGroups,
        })
        .mockRejectedValueOnce(new Error("Organizations endpoint not found")); // Organizations call fails (second)

      const result = await server["handleToolCall"]({
        params: {
          name: "search_resources",
          arguments: {},
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.total).toBe(3);

      const delta = responseData.items.find((r: ComputeResource) => r.name === "Delta");
      expect(delta.organization_names).toEqual(["100"]); // Falls back to ID
    });

    it("should handle API errors", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 500,
        statusText: "Internal Server Error",
        data: null,
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_resources",
          arguments: {},
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.error).toBeDefined();
    });
  });

  describe("search_resources", () => {
    // No beforeEach needed - we'll set up mocks in each test

    it("should search resources by query", async () => {
      // Set up mocks for the listComputeResources call inside searchResources
      mockHttpClient.get
        .mockResolvedValueOnce({ status: 200, data: mockResourceGroups })
        .mockResolvedValueOnce({ status: 200, data: mockOrganizations });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_resources",
          arguments: {
            query: "gpu",
            include_ids: true,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.total).toBe(1);
      expect(responseData.items[0].name).toBe("Delta");
      expect(responseData.items[0].resource_ids).toBeDefined();
      expect(responseData.items[0].resource_ids).toContain("delta.ncsa.access-ci.org");
    });

    it("should filter by resource type", async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ status: 200, data: mockResourceGroups })
        .mockResolvedValueOnce({ status: 200, data: mockOrganizations });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_resources",
          arguments: {
            type: "cloud",
            include_ids: true,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.total).toBe(1);
      expect(responseData.items[0].name).toBe("Jetstream2");
      expect(responseData.items[0].resourceType).toBe("cloud");
    });

    it("should filter by GPU capability", async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ status: 200, data: mockResourceGroups })
        .mockResolvedValueOnce({ status: 200, data: mockOrganizations });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_resources",
          arguments: {
            has_gpu: true,
            include_ids: true,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.total).toBe(1);
      expect(responseData.items[0].name).toBe("Delta");
      expect(responseData.items[0].hasGpu).toBe(true);
    });

    it("should search by organization", async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ status: 200, data: mockResourceGroups })
        .mockResolvedValueOnce({ status: 200, data: mockOrganizations });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_resources",
          arguments: {
            query: "purdue",
            include_ids: true,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.total).toBe(1);
      expect(responseData.items[0].name).toBe("Anvil");
    });

    it("should exclude resource_ids when include_ids is false", async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ status: 200, data: mockResourceGroups })
        .mockResolvedValueOnce({ status: 200, data: mockOrganizations });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_resources",
          arguments: {
            query: "delta",
            include_ids: false,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      if (responseData.items.length > 0) {
        expect(responseData.items[0].resource_ids).toBeUndefined();
      }
    });
  });

  describe("search_resources (get specific resource)", () => {
    it("should get specific resource details", async () => {
      const mockResourceDetails = {
        results: [
          {
            info_groupid: 1,
            group_descriptive_name: "Delta",
            group_description: "Detailed Delta description",
            cider_type: "Compute",
            resource_descriptive_name: "GPU Nodes",
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockResourceDetails,
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_resources",
          arguments: {
            id: "1",
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toHaveLength(1);
      expect(responseData[0].group_descriptive_name).toBe("Delta");
    });
  });

  describe("get_resource_hardware", () => {
    it("should extract hardware information", async () => {
      const mockHardwareData = {
        results: [
          {
            info_groupid: 1,
            cider_type: "Compute",
            resource_descriptive_name: "GPU Nodes with A100",
          },
          {
            info_groupid: 1,
            cider_type: "Storage",
            resource_descriptive_name: "High-speed storage",
          },
          {
            info_groupid: 1,
            cider_type: "Network",
            resource_descriptive_name: "Infiniband network",
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHardwareData,
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "get_resource_hardware",
          arguments: {
            id: "1",
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.resource_id).toBe("1");

      // Hardware is now structured into categories (empty categories are removed)
      // The mock "GPU Nodes with A100" gets categorized as gpus (has "gpu" in name)
      // The mock "High-speed storage" gets categorized as storage
      expect(responseData.hardware).toHaveProperty("gpus");
      expect(responseData.hardware).toHaveProperty("storage");
      expect(responseData.hardware.gpus).toHaveLength(1);
      expect(responseData.hardware.storage).toHaveLength(1);

      // Verify the categorization is correct
      expect(responseData.hardware.gpus[0].name).toBe("GPU Nodes with A100");
      expect(responseData.hardware.storage[0].name).toBe("High-speed storage");

      // Check raw_hardware_items has 2 items (Compute and Storage, Network excluded)
      expect(responseData.raw_hardware_items).toHaveLength(2);
      expect(
        responseData.raw_hardware_items.some((h: HardwareItem) => h.cider_type === "Compute")
      ).toBe(true);
      expect(
        responseData.raw_hardware_items.some((h: HardwareItem) => h.cider_type === "Storage")
      ).toBe(true);
    });
  });

  describe("Resource Type Detection", () => {
    it("should detect GPU resources", () => {
      const mockGroup = {
        group_description: "GPU-accelerated computing",
        group_descriptive_name: "Delta GPU",
        rollup_feature_ids: [142], // GPU feature
      };

      const hasGpu = server["detectGpuCapability"](mockGroup);
      expect(hasGpu).toBe(true);
    });

    it("should detect cloud resources", () => {
      const mockGroup = {
        group_description: "Cloud computing platform",
        group_descriptive_name: "Jetstream Cloud",
        rollup_feature_ids: [],
      };

      const resourceType = server["determineResourceType"](mockGroup);
      expect(resourceType).toBe("cloud");
    });

    it("should detect compute resources", () => {
      const mockGroup = {
        group_description: "Traditional HPC cluster",
        group_descriptive_name: "Anvil Compute",
        rollup_feature_ids: [],
      };

      const resourceType = server["determineResourceType"](mockGroup);
      expect(resourceType).toBe("compute");
    });
  });

  describe("Error Handling", () => {
    it("should handle unknown tools", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "unknown_tool",
          arguments: {},
        },
      });

      expect(result.content[0].text).toContain("Unknown tool");
    });

    it("should handle network errors", async () => {
      mockHttpClient.get.mockRejectedValue(new Error("Network error"));

      const result = await server["handleToolCall"]({
        params: {
          name: "search_resources",
          arguments: {},
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.error).toBeDefined();
    });
  });
});
