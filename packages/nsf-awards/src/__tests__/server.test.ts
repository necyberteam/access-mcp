import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { NSFAwardsServer } from "../server.js";

// Mock the global fetch function
global.fetch = vi.fn();

type MockFetch = Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;

describe("NSFAwardsServer", () => {
  let server: NSFAwardsServer;
  let mockFetch: MockFetch;

  beforeEach(() => {
    server = new NSFAwardsServer();
    mockFetch = vi.mocked(fetch);
    mockFetch.mockClear();
  });

  describe("Tool Registration", () => {
    it("should register search_nsf_awards tool", () => {
      const tools = server["getTools"]();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe("search_nsf_awards");
    });

    it("should have proper input schema", () => {
      const tools = server["getTools"]();
      const tool = tools[0];

      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
      expect(tool.inputSchema.properties.id).toBeDefined();
      expect(tool.inputSchema.properties.query).toBeDefined();
      expect(tool.inputSchema.properties.pi).toBeDefined();
      expect(tool.inputSchema.properties.institution).toBeDefined();
    });
  });

  describe("Tool Call Handler", () => {
    it("should handle unknown tool with error response", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "unknown_tool",
          arguments: {}
        }
      });

      expect(result).toHaveProperty("isError", true);
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("error");
      expect(response.error).toContain("Unknown tool");
    });
  });

  describe("Search by Award ID", () => {
    const mockAwardResponse = {
      response: {
        award: [{
          id: "2138259",
          title: "Test Award Title",
          awardeeName: "Test University",
          piFirstName: "John",
          piLastName: "Doe",
          coPDPI: "Jane Smith; Bob Johnson",
          estimatedTotalAmt: "500000",
          fundsObligatedAmt: "400000",
          startDate: "09/01/2021",
          expDate: "08/31/2024",
          abstractText: "This is a test abstract for the award.",
          primaryProgram: "Computer Science",
          poName: "Program Officer Name",
          ueiNumber: "TEST123456789"
        }]
      }
    };

    it("should fetch individual NSF award successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAwardResponse
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { id: "2138259" }
        }
      });

      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("total", 1);
      expect(response).toHaveProperty("items");
      expect(response.items[0].awardNumber).toBe("2138259");
      expect(response.items[0].title).toBe("Test Award Title");
      expect(response.items[0].principalInvestigator).toBe("John Doe");
    });

    it("should handle award not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: { award: [] } })
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { id: "9999999" }
        }
      });

      expect(result).toHaveProperty("isError", true);
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("error");
      expect(response.error).toContain("No NSF award found");
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { id: "2138259" }
        }
      });

      expect(result).toHaveProperty("isError", true);
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("error");
    });
  });

  describe("Search by PI", () => {
    const mockPISearchResponse = {
      response: {
        award: [
          {
            id: "2138259",
            title: "Award 1",
            awardeeName: "University A",
            piFirstName: "John",
            piLastName: "Smith",
            estimatedTotalAmt: "500000",
            startDate: "09/01/2021",
            expDate: "08/31/2024",
            primaryProgram: "Computer Science"
          },
          {
            id: "1234567",
            title: "Award 2",
            awardeeName: "University B",
            piFirstName: "John",
            piLastName: "Smith",
            estimatedTotalAmt: "750000",
            startDate: "01/01/2022",
            expDate: "12/31/2025",
            primaryProgram: "Mathematics"
          }
        ]
      }
    };

    it("should search awards by PI successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPISearchResponse
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { pi: "John Smith", limit: 10 }
        }
      });

      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("total", 2);
      expect(response).toHaveProperty("items");
      expect(response.items).toHaveLength(2);
      expect(response.items[0].principalInvestigator).toBe("John Smith");
    });

    it("should handle no results found", async () => {
      // Mock multiple failed search attempts (different strategies)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ response: { award: [] } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ response: { award: [] } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ response: { award: [] } })
        });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { pi: "NonExistent Person" }
        }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("total", 0);
      expect(response).toHaveProperty("items");
      expect(response.items).toHaveLength(0);
    });

    it("should respect limit parameter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPISearchResponse
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { pi: "John Smith", limit: 1 }
        }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("total");
      expect(response).toHaveProperty("items");
      // Limit is applied in the search method, so we get limited results
      expect(response.items.length).toBeLessThanOrEqual(1);
    });
  });

  describe("Search by Institution", () => {
    it("should search awards by institution", async () => {
      const mockInstitutionResponse = {
        response: {
          award: [{
            id: "1111111",
            title: "PI Award",
            awardeeName: "Stanford University",
            piFirstName: "Jane",
            piLastName: "Doe"
          }]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInstitutionResponse
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { institution: "Stanford University" }
        }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("total", 1);
      expect(response).toHaveProperty("items");
      expect(response.items[0].institution).toContain("Stanford");
    });
  });

  describe("Search by Keywords", () => {
    it("should search awards by keywords", async () => {
      const mockKeywordResponse = {
        response: {
          award: [{
            id: "2222222",
            title: "Machine Learning Research",
            awardeeName: "MIT",
            piFirstName: "AI",
            piLastName: "Researcher",
            abstractText: "This project focuses on machine learning algorithms..."
          }]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockKeywordResponse
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { query: "machine learning" }
        }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("total", 1);
      expect(response).toHaveProperty("items");
      expect(response.items[0].abstract).toContain("machine learning");
    });
  });

  describe("Award Parsing", () => {
    it("should parse NSF award data correctly", async () => {
      const rawAward = {
        id: "1234567",
        title: "Test Title",
        awardeeName: "Test University",
        piFirstName: "Test",
        piLastName: "Researcher",
        coPDPI: "Co-PI One; Co-PI Two",
        estimatedTotalAmt: "1000000",
        fundsObligatedAmt: "500000",
        startDate: "01/01/2023",
        expDate: "12/31/2025",
        abstractText: "Test abstract",
        primaryProgram: "Test Program",
        poName: "Test Officer",
        ueiNumber: "TEST123"
      };

      const parsed = server["parseNSFAward"](rawAward);

      expect(parsed.awardNumber).toBe("1234567");
      expect(parsed.title).toBe("Test Title");
      expect(parsed.institution).toBe("Test University");
      expect(parsed.principalInvestigator).toBe("Test Researcher");
      expect(parsed.coPIs).toHaveLength(2);
      expect(parsed.coPIs[0]).toBe("Co-PI One");
      expect(parsed.coPIs[1]).toBe("Co-PI Two");
      expect(parsed.totalIntendedAward).toBe("$1,000,000");
      expect(parsed.totalAwardedToDate).toBe("$500,000");
    });

    it("should handle missing fields gracefully", async () => {
      const rawAward = {
        id: "1234567"
        // Most fields missing
      };

      const parsed = server["parseNSFAward"](rawAward);

      expect(parsed.awardNumber).toBe("1234567");
      expect(parsed.title).toBe("No title available");
      expect(parsed.institution).toBe("Unknown institution");
      expect(parsed.principalInvestigator).toBe("Unknown PI");
      expect(parsed.coPIs).toHaveLength(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      mockFetch.mockClear();
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { id: "1234567" }
        }
      });

      expect(result).toHaveProperty("isError", true);
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("error");
    });

    it("should handle malformed API responses", async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: "response" })
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { id: "1234567" }
        }
      });

      expect(result).toHaveProperty("isError", true);
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("error");
      expect(response.error).toContain("No NSF award found");
    });

    it("should require at least one search parameter", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: {}
        }
      });

      expect(result).toHaveProperty("isError", true);
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("error");
      expect(response.error).toContain("Provide");
    });
  });

  describe("Institution Filtering (primary_only)", () => {
    it("should filter to primary institution only when primary_only=true", async () => {
      const mockAwards = [
        {
          id: "1",
          title: "Test Award 1",
          awardeeName: "University of Chicago",
          piFirstName: "John",
          piLastName: "Doe",
          estimatedTotalAmt: "100000",
          fundsObligatedAmt: "100000",
          startDate: "2024-01-01",
          expDate: "2025-01-01",
          abstractText: "Test abstract",
          primaryProgram: "Test Program",
          poName: "Test Officer",
          ueiNumber: "123456"
        },
        {
          id: "2",
          title: "Collaborative Award",
          awardeeName: "Stanford University",
          piFirstName: "Jane",
          piLastName: "Smith",
          estimatedTotalAmt: "200000",
          fundsObligatedAmt: "200000",
          startDate: "2024-01-01",
          expDate: "2025-01-01",
          abstractText: "Collaborative project",
          primaryProgram: "Test Program",
          poName: "Test Officer",
          ueiNumber: "789012"
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: { award: mockAwards } })
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: {
            institution: "University of Chicago",
            primary_only: true,
            limit: 10
          }
        }
      });

      const response = JSON.parse(result.content[0].text);

      // Should only include University of Chicago award
      expect(response.total).toBe(1);
      expect(response.items).toHaveLength(1);
      expect(response.items[0].institution).toBe("University of Chicago");
    });

    it("should include all awards when primary_only=false", async () => {
      const mockAwards = [
        {
          id: "1",
          title: "Test Award 1",
          awardeeName: "University of Chicago",
          piFirstName: "John",
          piLastName: "Doe",
          estimatedTotalAmt: "100000",
          fundsObligatedAmt: "100000",
          startDate: "2024-01-01",
          expDate: "2025-01-01",
          abstractText: "Test abstract",
          primaryProgram: "Test Program",
          poName: "Test Officer",
          ueiNumber: "123456"
        },
        {
          id: "2",
          title: "Collaborative Award",
          awardeeName: "Stanford University",
          piFirstName: "Jane",
          piLastName: "Smith",
          estimatedTotalAmt: "200000",
          fundsObligatedAmt: "200000",
          startDate: "2024-01-01",
          expDate: "2025-01-01",
          abstractText: "Collaborative project",
          primaryProgram: "Test Program",
          poName: "Test Officer",
          ueiNumber: "789012"
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: { award: mockAwards } })
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: {
            institution: "University of Chicago",
            primary_only: false,
            limit: 10
          }
        }
      });

      const response = JSON.parse(result.content[0].text);

      // Should include both awards
      expect(response.total).toBe(2);
      expect(response.items).toHaveLength(2);
    });

    it("should handle institution name variations", async () => {
      const mockAwards = [
        {
          id: "1",
          title: "Test Award",
          awardeeName: "Univ of Chicago",
          piFirstName: "John",
          piLastName: "Doe",
          estimatedTotalAmt: "100000",
          fundsObligatedAmt: "100000",
          startDate: "2024-01-01",
          expDate: "2025-01-01",
          abstractText: "Test abstract",
          primaryProgram: "Test Program",
          poName: "Test Officer",
          ueiNumber: "123456"
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: { award: mockAwards } })
      });

      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: {
            institution: "University of Chicago",
            primary_only: true,
            limit: 10
          }
        }
      });

      const response = JSON.parse(result.content[0].text);

      // Should match despite name variation
      expect(response.total).toBe(1);
      expect(response.items[0].institution).toContain("Chicago");
    });
  });
});
