import { describe, it, expect } from "vitest";
import { NSFAwardsServer } from "../server.js";

// Integration tests - these make real API calls to NSF.gov
describe("NSFAwardsServer Integration Tests", () => {
  let server: NSFAwardsServer;

  beforeEach(() => {
    server = new NSFAwardsServer();
  });

  describe("Real NSF API Integration", () => {
    it("should fetch a known NSF award", async () => {
      // Using a well-known NSF award that should exist
      const result = await server["handleToolCall"]({
        params: {
          name: "get_nsf_award",
          arguments: { award_number: "2138259" }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("NSF Award");
      expect(result.content[0].text).toContain("2138259");
      expect(result.content[0].text).toContain("Project Information");
      expect(result.content[0].text).toContain("Funding Details");
    }, 15000); // 15 second timeout

    it("should search for awards by PI name", async () => {
      // Search for a common name that should return results
      const result = await server["handleToolCall"]({
        params: {
          name: "find_nsf_awards_by_pi", 
          arguments: { pi_name: "Smith", limit: 3 }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("NSF Awards for PI: Smith");
      
      // Should either find awards or show "No awards found"
      const text = result.content[0].text;
      const foundAwards = text.includes("Found") && !text.includes("Found 0");
      const noAwards = text.includes("No awards found");
      
      expect(foundAwards || noAwards).toBe(true);
    }, 15000);

    it("should search for awards by institution", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "find_nsf_awards_by_institution",
          arguments: { institution_name: "Stanford University", limit: 3 }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("NSF Awards for Institution: Stanford University");
      
      // Stanford should have NSF awards
      expect(result.content[0].text).toMatch(/Found \d+ awards/);
    }, 15000);

    it("should search for awards by keywords", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "find_nsf_awards_by_keywords",
          arguments: { keywords: "computer science", limit: 3 }
        }
      });

      expect(result.content).toHaveLength(1);  
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain('NSF Awards matching: "computer science"');
      
      // Should find computer science awards
      expect(result.content[0].text).toMatch(/Found \d+ awards/);
    }, 15000);

    it("should handle personnel search", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "find_nsf_awards_by_personnel",
          arguments: { person_name: "Johnson", limit: 2 }
        }
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");  
      expect(result.content[0].text).toContain("NSF Awards for Personnel: Johnson");
      
      // Should either find results or show no awards
      const text = result.content[0].text;
      expect(text).toMatch(/Found \d+ awards/);
    }, 15000);

    it("should handle non-existent award gracefully", async () => {
      await expect(server["handleToolCall"]({
        params: {
          name: "get_nsf_award",
          arguments: { award_number: "9999999" }
        }
      })).rejects.toThrow(/No NSF award found with number: 9999999/);
    }, 10000);

    it("should format award results with required fields", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "find_nsf_awards_by_institution",
          arguments: { institution_name: "MIT", limit: 1 }
        }
      });

      const text = result.content[0].text;
      
      if (text.includes("Found") && !text.includes("Found 0")) {
        // If awards were found, check formatting
        expect(text).toContain("Award");
        expect(text).toContain("Title");
        expect(text).toContain("PI");
        expect(text).toContain("Institution");
        expect(text).toContain("Amount");
        expect(text).toContain("Period");
        expect(text).toContain("Program");
      }
    }, 15000);
  });

  describe("Error Handling with Real API", () => {
    it("should handle API rate limiting gracefully", async () => {
      // Make multiple rapid requests to potentially trigger rate limiting
      const promises = Array(5).fill(0).map((_, i) => 
        server["handleToolCall"]({
          params: {
            name: "get_nsf_award",
            arguments: { award_number: "2138259" }
          }
        }).catch(err => ({ error: err.message }))
      );

      const results = await Promise.all(promises);
      
      // At least some requests should succeed
      const successfulResults = results.filter(r => !r.error);
      expect(successfulResults.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe("Data Validation", () => {
    it("should return properly structured award data", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_nsf_award",
          arguments: { award_number: "2138259" }
        }
      });

      const text = result.content[0].text;
      
      // Validate required sections are present
      expect(text).toContain("Project Information");
      expect(text).toContain("Funding Details");
      expect(text).toContain("Abstract");
      expect(text).toContain("Research Impact");
      
      // Validate key fields are present
      expect(text).toContain("**Title**:");
      expect(text).toContain("**Principal Investigator**:");
      expect(text).toContain("**Institution**:");
      expect(text).toContain("**Total Award Amount**:");
      expect(text).toContain("**Project Period**:");
    }, 15000);
  });
});