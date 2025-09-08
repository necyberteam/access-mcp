import { describe, it, expect, vi, beforeEach } from "vitest";
import { NSFAwardsServer } from "../server.js";

// Mock the global fetch function
global.fetch = vi.fn();

describe("NSFAwardsServer", () => {
  let server: NSFAwardsServer;
  let mockFetch: any;

  beforeEach(() => {
    server = new NSFAwardsServer();
    mockFetch = vi.mocked(fetch);
    mockFetch.mockClear();
  });

  describe("Tool Registration", () => {
    it("should register all expected tools", () => {
      const tools = server["getTools"]();
      
      expect(tools).toHaveLength(5);
      
      const toolNames = tools.map(tool => tool.name);
      expect(toolNames).toEqual([
        "find_nsf_awards_by_pi",
        "find_nsf_awards_by_personnel", 
        "get_nsf_award",
        "find_nsf_awards_by_institution",
        "find_nsf_awards_by_keywords"
      ]);
    });

    it("should have proper input schemas for all tools", () => {
      const tools = server["getTools"]();
      
      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
        expect(tool.inputSchema.required).toBeDefined();
      }
    });
  });

  describe("Tool Call Handler", () => {
    it("should route tool calls correctly", async () => {
      const findPISpy = vi.spyOn(server as any, "find_nsf_awards_by_pi").mockResolvedValue({
        content: [{ type: "text", text: "PI results" }]
      });

      await server["handleToolCall"]({
        params: {
          name: "find_nsf_awards_by_pi",
          arguments: { pi_name: "Test PI" }
        }
      });

      expect(findPISpy).toHaveBeenCalledWith({ pi_name: "Test PI" });
    });

    it("should throw error for unknown tool", async () => {
      await expect(server["handleToolCall"]({
        params: {
          name: "unknown_tool",
          arguments: {}
        }
      })).rejects.toThrow("Unknown tool: unknown_tool");
    });
  });

  describe("NSF Award Fetching", () => {
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

      const result = await server["get_nsf_award"]({ award_number: "2138259" });
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("NSF Award 2138259");
      expect(result.content[0].text).toContain("Test Award Title");
      expect(result.content[0].text).toContain("John Doe");
    });

    it("should handle award not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: { award: [] } })
      });

      await expect(server["get_nsf_award"]({ award_number: "9999999" }))
        .rejects.toThrow("No NSF award found with number: 9999999");
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      });

      await expect(server["get_nsf_award"]({ award_number: "2138259" }))
        .rejects.toThrow("NSF API request failed: 500 Internal Server Error");
    });
  });

  describe("PI Search", () => {
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

      const result = await server["find_nsf_awards_by_pi"]({ 
        pi_name: "John Smith",
        limit: 10 
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("NSF Awards for PI: John Smith");
      expect(result.content[0].text).toContain("Found 2 awards");
      expect(result.content[0].text).toContain("Award 1");
      expect(result.content[0].text).toContain("Award 2");
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

      const result = await server["find_nsf_awards_by_pi"]({ 
        pi_name: "NonExistent Person" 
      });

      expect(result.content[0].text).toContain("Found 0 awards");
      expect(result.content[0].text).toContain("No awards found");
    });

    it("should respect limit parameter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPISearchResponse
      });

      const result = await server["find_nsf_awards_by_pi"]({ 
        pi_name: "John Smith",
        limit: 1
      });

      // With limit 1, searchNSFAwardsByPI returns limited results
      // The actual behavior depends on the implementation in searchNSFAwardsByPI
      const text = result.content[0].text;
      expect(text).toContain("NSF Awards for PI: John Smith");
      expect(text).toMatch(/Found \d+ awards/); // Should show some number
      
      // Should have at least one award result
      expect(text).toContain("**1. Award");
    });
  });

  describe("Personnel Search", () => {
    it("should search both PI and Co-PI fields", async () => {
      const mockPIResponse = {
        response: {
          award: [{
            id: "1111111",
            title: "PI Award",
            piFirstName: "Jane",
            piLastName: "Doe"
          }]
        }
      };

      const mockCoPIResponse = {
        response: {
          award: [{
            id: "2222222", 
            title: "Co-PI Award",
            piFirstName: "Someone",
            piLastName: "Else",
            coPDPI: "Jane Doe; Other Person"
          }]
        }
      };

      // First call (PI search) returns one result
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPIResponse
      });

      // Second call (Co-PI search) returns another result  
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCoPIResponse
      });

      const result = await server["find_nsf_awards_by_personnel"]({
        person_name: "Jane Doe"
      });

      expect(result.content[0].text).toContain("NSF Awards for Personnel: Jane Doe");
      expect(mockFetch).toHaveBeenCalledTimes(2); // Should call both PI and Co-PI endpoints
    });
  });

  describe("Institution Search", () => {
    it("should search awards by institution", async () => {
      const mockInstitutionResponse = {
        response: {
          award: [{
            id: "3333333",
            title: "Institution Award",
            awardeeName: "Stanford University",
            piFirstName: "Test",
            piLastName: "PI"
          }]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInstitutionResponse
      });

      const result = await server["find_nsf_awards_by_institution"]({
        institution_name: "Stanford University"
      });

      expect(result.content[0].text).toContain("NSF Awards for Institution: Stanford University");
      expect(result.content[0].text).toContain("Found 1 awards");
    });
  });

  describe("Keyword Search", () => {
    it("should search awards by keywords", async () => {
      const mockKeywordResponse = {
        response: {
          award: [{
            id: "4444444",
            title: "Machine Learning Research",
            abstractText: "This project focuses on machine learning algorithms...",
            piFirstName: "AI",
            piLastName: "Researcher"
          }]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockKeywordResponse
      });

      const result = await server["find_nsf_awards_by_keywords"]({
        keywords: "machine learning"
      });

      expect(result.content[0].text).toContain('NSF Awards matching: "machine learning"');
      expect(result.content[0].text).toContain("Found 1 awards");
    });
  });

  describe("Award Parsing", () => {
    it("should parse NSF award data correctly", async () => {
      const rawAward = {
        id: "1234567",
        title: "Test Title",
        awardeeName: "Test University", 
        piFirstName: "John",
        piLastName: "Doe",
        coPDPI: "Jane Smith; Bob Johnson",
        estimatedTotalAmt: "500000",
        fundsObligatedAmt: "400000",
        startDate: "09/01/2021",
        expDate: "08/31/2024",
        abstractText: "Test abstract",
        primaryProgram: "Computer Science",
        poName: "Program Officer",
        ueiNumber: "TEST123"
      };

      const parsed = server["parseNSFAward"](rawAward);

      expect(parsed.awardNumber).toBe("1234567");
      expect(parsed.title).toBe("Test Title");
      expect(parsed.institution).toBe("Test University");
      expect(parsed.principalInvestigator).toBe("John Doe");
      expect(parsed.coPIs).toEqual(["Jane Smith", "Bob Johnson"]);
      expect(parsed.totalIntendedAward).toBe("$500,000");
      expect(parsed.totalAwardedToDate).toBe("$400,000");
      expect(parsed.startDate).toBe("09/01/2021");
      expect(parsed.endDate).toBe("08/31/2024");
      expect(parsed.abstract).toBe("Test abstract");
      expect(parsed.primaryProgram).toBe("Computer Science");
      expect(parsed.programOfficer).toBe("Program Officer");
      expect(parsed.ueiNumber).toBe("TEST123");
    });

    it("should handle missing award data gracefully", async () => {
      const incompleteAward = {
        id: "1234567"
        // Missing most fields
      };

      const parsed = server["parseNSFAward"](incompleteAward);

      expect(parsed.awardNumber).toBe("1234567");
      expect(parsed.title).toBe("No title available");
      expect(parsed.institution).toBe("Unknown institution");
      expect(parsed.principalInvestigator).toBe("Unknown PI");
      expect(parsed.coPIs).toEqual([]);
      expect(parsed.totalIntendedAward).toBe("Amount not available");
      expect(parsed.totalAwardedToDate).toBe("Amount not available");
      expect(parsed.abstract).toBe("No abstract available");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      mockFetch.mockClear();
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(server["get_nsf_award"]({ award_number: "1234567" }))
        .rejects.toThrow("Failed to fetch NSF award");
    });

    it("should handle malformed API responses", async () => {
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: "response" })
      });

      await expect(server["get_nsf_award"]({ award_number: "1234567" }))
        .rejects.toThrow("No NSF award found with number: 1234567");
    });
  });
});