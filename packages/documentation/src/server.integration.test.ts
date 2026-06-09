import { describe, it, expect, beforeEach } from "vitest";
import { DocumentationServer } from "./server.js";

interface TextContent {
  type: "text";
  text: string;
}

// The retrieve-docs endpoint returns 401 without a key, so skip the whole
// suite when ACCESS_AI_API_KEY is unset (mirrors software-discovery's gate).
const hasKey = Boolean(process.env.ACCESS_AI_API_KEY);

describe.skipIf(!hasKey)("DocumentationServer Integration Tests", () => {
  let server: DocumentationServer;

  beforeEach(() => {
    server = new DocumentationServer();
  });

  it("retrieves real documentation chunks from UKY", async () => {
    const result = await server["handleToolCall"]({
      params: {
        name: "search_docs",
        arguments: { query: "how do I get an ACCESS allocation" },
      },
    } as never);

    const content = result.content[0] as TextContent;
    const data = JSON.parse(content.text);

    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.total).toBeGreaterThan(0);
    expect(data.items[0]).toHaveProperty("url");
    expect(data.items[0]).toHaveProperty("text");
    expect(data.items[0]).toHaveProperty("rank");
  }, 10000);
});
