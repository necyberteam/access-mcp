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
          name: "search_nsf_awards",
          arguments: { id: "2138259" },
        },
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("total", 1);
      expect(response).toHaveProperty("items");
      expect(response.items[0].awardNumber).toBe("2138259");
    }, 15000); // 15 second timeout

    it("should search for awards by PI name", async () => {
      // Search for a common name that should return results
      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { pi: "Smith", limit: 3 },
        },
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("total");
      expect(response).toHaveProperty("items");
      expect(Array.isArray(response.items)).toBe(true);
    }, 15000);

    it("should search for awards by institution", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { institution: "Stanford University", limit: 3 },
        },
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("total");
      expect(response).toHaveProperty("items");
      expect(response.total).toBeGreaterThan(0); // Stanford should have NSF awards
    }, 15000);

    it("should search for awards by keywords", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { query: "computer science", limit: 3 },
        },
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("total");
      expect(response).toHaveProperty("items");
      expect(response.total).toBeGreaterThan(0); // Should find computer science awards
    }, 15000);

    it("should handle personnel search", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { pi: "Johnson", limit: 2 },
        },
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("total");
      expect(response).toHaveProperty("items");
    }, 15000);

    it("should handle non-existent award gracefully", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { id: "9999999" },
        },
      });

      expect(result).toHaveProperty("isError", true);
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("error");
    }, 10000);

    it("should format award results with required fields", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { institution: "MIT", limit: 1 },
        },
      });

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("total");
      expect(response).toHaveProperty("items");

      if (response.total > 0 && response.items.length > 0) {
        // Check that awards have required fields
        const award = response.items[0];
        expect(award).toHaveProperty("awardNumber");
        expect(award).toHaveProperty("title");
        expect(award).toHaveProperty("principalInvestigator");
        expect(award).toHaveProperty("institution");
        expect(award).toHaveProperty("totalIntendedAward");
      }
    }, 15000);
  });

  describe("Error Handling with Real API", () => {
    it("should handle API rate limiting gracefully", async () => {
      // Make multiple rapid requests to potentially trigger rate limiting
      const promises = Array(5)
        .fill(0)
        .map(() =>
          server["handleToolCall"]({
            params: {
              name: "search_nsf_awards",
              arguments: { id: "2138259" },
            },
          }).catch((err) => ({ error: err.message }))
        );

      const results = await Promise.all(promises);

      // At least some requests should succeed
      const successfulResults = results.filter((r) => !r.error);
      expect(successfulResults.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe("Data Validation", () => {
    it("should return properly structured award data", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_nsf_awards",
          arguments: { id: "2138259" },
        },
      });

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty("total");
      expect(response).toHaveProperty("items");

      // Validate award structure
      const award = response.items[0];
      expect(award).toHaveProperty("awardNumber");
      expect(award).toHaveProperty("title");
      expect(award).toHaveProperty("principalInvestigator");
      expect(award).toHaveProperty("institution");
      expect(award).toHaveProperty("totalIntendedAward");
      expect(award).toHaveProperty("abstract");
      expect(award).toHaveProperty("startDate");
      expect(award).toHaveProperty("endDate");
    }, 15000);
  });
});
