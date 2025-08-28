import { describe, it, expect, beforeEach } from "vitest";
import { SystemStatusServer } from "../server.js";

describe("SystemStatusServer Integration Tests", () => {
  let server: SystemStatusServer;

  beforeEach(() => {
    server = new SystemStatusServer();
  });

  describe("Real API Integration", () => {
    it("should fetch current outages from real API", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_current_outages",
          arguments: { limit: 5 }
        }
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toHaveProperty("total_outages");
      expect(responseData).toHaveProperty("affected_resources");
      expect(responseData).toHaveProperty("severity_counts");
      expect(responseData.severity_counts).toHaveProperty("high");
      expect(responseData.severity_counts).toHaveProperty("medium");
      expect(responseData.severity_counts).toHaveProperty("low");
      expect(responseData.severity_counts).toHaveProperty("unknown");
      expect(Array.isArray(responseData.outages)).toBe(true);

      // Check enhanced fields
      if (responseData.outages.length > 0) {
        const outage = responseData.outages[0];
        expect(outage).toHaveProperty("severity");
        expect(outage).toHaveProperty("posted_time");
        expect(outage).toHaveProperty("last_updated");
      }
    }, 10000);

    it("should fetch scheduled maintenance from real API", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_scheduled_maintenance",
          arguments: { limit: 5 }
        }
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toHaveProperty("total_scheduled");
      expect(responseData).toHaveProperty("upcoming_24h");
      expect(responseData).toHaveProperty("upcoming_week");
      expect(responseData).toHaveProperty("affected_resources");
      expect(Array.isArray(responseData.maintenance)).toBe(true);

      // Check enhanced fields
      if (responseData.maintenance.length > 0) {
        const maintenance = responseData.maintenance[0];
        expect(maintenance).toHaveProperty("hours_until_start");
        expect(maintenance).toHaveProperty("has_scheduled_time");
        expect(maintenance.hours_until_start).toSatisfy((val: any) => 
          val === null || typeof val === "number"
        );
      }
    }, 10000);

    it("should fetch past outages from real API", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_past_outages",
          arguments: { limit: 10 }
        }
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toHaveProperty("total_past_outages");
      expect(responseData).toHaveProperty("recent_outages_30_days");
      expect(responseData).toHaveProperty("affected_resources");
      expect(responseData).toHaveProperty("outage_types");
      expect(responseData).toHaveProperty("average_duration_hours");
      expect(Array.isArray(responseData.outages)).toBe(true);

      // Check enhanced fields
      if (responseData.outages.length > 0) {
        const outage = responseData.outages[0];
        expect(outage).toHaveProperty("duration_hours");
        expect(outage).toHaveProperty("days_ago");
        expect(outage).toHaveProperty("outage_type");
        expect(outage.days_ago).toSatisfy((val: any) => 
          val === null || typeof val === "number"
        );
      }
    }, 10000);

    it("should get comprehensive system announcements", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_system_announcements",
          arguments: { limit: 20 }
        }
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toHaveProperty("total_announcements");
      expect(responseData).toHaveProperty("current_outages");
      expect(responseData).toHaveProperty("scheduled_maintenance");
      expect(responseData).toHaveProperty("recent_past_outages");
      expect(responseData).toHaveProperty("categories");
      expect(responseData.categories).toHaveProperty("current");
      expect(responseData.categories).toHaveProperty("scheduled");
      expect(responseData.categories).toHaveProperty("recent_past");
      expect(Array.isArray(responseData.announcements)).toBe(true);

      // Check categorization
      if (responseData.announcements.length > 0) {
        const announcement = responseData.announcements[0];
        expect(announcement).toHaveProperty("category");
        expect(["current", "scheduled", "recent_past"]).toContain(announcement.category);
      }
    }, 15000);

    it("should check resource status with direct method", async () => {
      // Test with common resource names that might exist
      const result = await server["handleToolCall"]({
        params: {
          name: "check_resource_status",
          arguments: { 
            resource_ids: ["anvil", "bridges", "jetstream"],
            use_group_api: false
          }
        }
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toHaveProperty("checked_at");
      expect(responseData).toHaveProperty("resources_checked", 3);
      expect(responseData).toHaveProperty("operational");
      expect(responseData).toHaveProperty("affected");
      expect(responseData).toHaveProperty("api_method", "direct_outages_check");
      expect(Array.isArray(responseData.resource_status)).toBe(true);
      expect(responseData.resource_status).toHaveLength(3);

      // Check resource status structure
      responseData.resource_status.forEach((resource: any) => {
        expect(resource).toHaveProperty("resource_id");
        expect(resource).toHaveProperty("status");
        expect(["operational", "affected"]).toContain(resource.status);
        expect(resource).toHaveProperty("active_outages");
        expect(Array.isArray(resource.outage_details)).toBe(true);
      });
    }, 10000);

    it("should test group API functionality", async () => {
      // Test group API with a resource that might have a group ID
      const result = await server["handleToolCall"]({
        params: {
          name: "check_resource_status",
          arguments: { 
            resource_ids: ["anvil"],
            use_group_api: true
          }
        }
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toHaveProperty("api_method", "resource_group_api");
      expect(responseData).toHaveProperty("resources_checked", 1);
      expect(responseData.resource_status).toHaveLength(1);

      const resourceStatus = responseData.resource_status[0];
      expect(resourceStatus).toHaveProperty("resource_id", "anvil");
      expect(resourceStatus).toHaveProperty("api_method");
      expect(["group_specific", "group_specific_failed"]).toContain(resourceStatus.api_method);
      
      // If it succeeded, check structure
      if (resourceStatus.api_method === "group_specific") {
        expect(resourceStatus).toHaveProperty("status");
        expect(["operational", "affected"]).toContain(resourceStatus.status);
      }
      
      // If it failed, check error handling
      if (resourceStatus.api_method === "group_specific_failed") {
        expect(resourceStatus.status).toBe("unknown");
        expect(resourceStatus).toHaveProperty("error");
      }
    }, 10000);

    it("should filter outages by resource correctly", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_current_outages",
          arguments: { resource_filter: "anvil" }
        }
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toHaveProperty("total_outages");
      
      // If there are any results, they should match the filter
      responseData.outages.forEach((outage: any) => {
        const matchesFilter = 
          outage.Subject?.toLowerCase().includes("anvil") ||
          outage.AffectedResources?.some((resource: any) =>
            resource.ResourceName?.toLowerCase().includes("anvil") ||
            resource.ResourceID?.toString().includes("anvil")
          );
        expect(matchesFilter).toBe(true);
      });
    }, 10000);

    it("should handle resource reads for all endpoints", async () => {
      const resources = [
        "accessci://system-status",
        "accessci://outages/current", 
        "accessci://outages/scheduled",
        "accessci://outages/past"
      ];

      for (const uri of resources) {
        const result = await server["handleResourceRead"]({
          params: { uri }
        });

        expect(result.contents).toHaveLength(1);
        expect(result.contents[0]).toHaveProperty("uri", uri);
        expect(result.contents[0]).toHaveProperty("mimeType");
        expect(result.contents[0]).toHaveProperty("text");

        if (uri !== "accessci://system-status") {
          // JSON resources should have valid JSON
          expect(() => JSON.parse(result.contents[0].text)).not.toThrow();
        }
      }
    }, 15000);
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty API responses", async () => {
      // This tests the robustness of our logic with potentially empty responses
      const result = await server["handleToolCall"]({
        params: {
          name: "get_current_outages",
          arguments: { resource_filter: "nonexistent-resource-xyz" }
        }
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toHaveProperty("total_outages", 0);
      expect(responseData.outages).toHaveLength(0);
      expect(responseData.affected_resources).toHaveLength(0);
    }, 10000);

    it("should handle large limit values gracefully", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_past_outages",
          arguments: { limit: 1000 }
        }
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData).toHaveProperty("total_past_outages");
      // Should not crash or timeout
      expect(responseData.outages.length).toBeLessThanOrEqual(1000);
    }, 15000);
  });
});