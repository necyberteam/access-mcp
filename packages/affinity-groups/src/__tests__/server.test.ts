import { describe, test, expect, vi, beforeEach } from "vitest";
import { AffinityGroupsServer } from "../server.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

// Mock the base server
vi.mock("@access-mcp/shared", () => ({
  BaseAccessServer: class MockBaseAccessServer {
    constructor(
      public serverName: string,
      public version: string,
      public baseURL?: string
    ) {}
    httpClient = {
      get: vi.fn(),
    };
  },
  handleApiError: vi.fn((error) => error.message || "Unknown error"),
  sanitizeGroupId: vi.fn((id) => id),
}));

describe("AffinityGroupsServer", () => {
  let server: AffinityGroupsServer;

  beforeEach(() => {
    server = new AffinityGroupsServer();
  });

  describe("basic functionality", () => {
    test("should be instantiable", () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(AffinityGroupsServer);
    });

    test("should have correct configuration", () => {
      // Test by using the public server interface
      expect(server["serverName"]).toBe("access-mcp-affinity-groups");
      expect(server["version"]).toBe(version);
    });

    test("should expose see_all_url for list and search contexts", () => {
      expect(server["listingLinks"]("list")?.see_all_url).toBe(
        "https://support.access-ci.org/affinity-groups"
      );
      expect(server["listingLinks"]("search")?.see_all_url).toBe(
        "https://support.access-ci.org/affinity-groups"
      );
      expect(server["listingLinks"]("details")).toBeUndefined();
    });
  });
});
