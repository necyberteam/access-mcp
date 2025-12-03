import { describe, test, expect } from "vitest";
import { sanitizeGroupId, formatApiUrl, handleApiError } from "../utils.js";

describe("Utils", () => {
  describe("sanitizeGroupId", () => {
    test("should remove invalid characters", () => {
      expect(sanitizeGroupId("test@#$%")).toBe("test");
    });

    test("should keep valid characters", () => {
      expect(sanitizeGroupId("test.group-123")).toBe("test.group-123");
    });

    test("should throw error for empty string", () => {
      expect(() => sanitizeGroupId("")).toThrow("groupId parameter is required and cannot be null or undefined");
    });
  });

  describe("formatApiUrl", () => {
    test("should format API URL correctly", () => {
      expect(formatApiUrl("1.0", "users")).toBe("/1.0/users");
    });

    test("should handle empty endpoint", () => {
      expect(formatApiUrl("2.0", "")).toBe("/2.0/");
    });
  });

  describe("handleApiError", () => {
    test("should extract message from response data", () => {
      const error = {
        response: {
          data: { message: "Custom error message" },
        },
      };
      expect(handleApiError(error)).toBe("Custom error message");
    });

    test("should handle status error", () => {
      const error = {
        response: {
          status: 404,
          statusText: "Not Found",
        },
      };
      expect(handleApiError(error)).toBe("API error: 404 Not Found");
    });

    test("should handle Error instance", () => {
      const error = new Error("Network error");
      expect(handleApiError(error)).toBe("Network error");
    });

    test("should handle unknown error", () => {
      const error = "some string error";
      expect(handleApiError(error)).toBe("Unknown API error");
    });
  });
});
