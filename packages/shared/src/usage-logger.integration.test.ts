import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { UsageLogger } from "./usage-logger.js";

const url = process.env.MCP_USAGE_TEST_DB_URL;
const maybe = url ? describe : describe.skip;

maybe("UsageLogger integration", () => {
  let pool: pg.Pool;
  beforeAll(() => { pool = new pg.Pool({ connectionString: url }); });
  afterAll(async () => {
    await pool.query("DROP SCHEMA IF EXISTS mcp_usage CASCADE;");
    await pool.end();
  });

  it("creates the schema and inserts one row, names-only", async () => {
    const logger = new UsageLogger(url);
    await logger.record({
      server: "allocations", tool: "search_projects",
      args: { query: "secret text", rp_name: "delta" },
      success: true, durationMs: 33, actingUser: "alice@access-ci.org",
    });
    const { rows } = await pool.query(
      "SELECT server, tool, arg_keys, success, user_hash, was_authenticated FROM mcp_usage.tool_calls"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].server).toBe("allocations");
    expect(rows[0].arg_keys.sort()).toEqual(["query", "rp_name"]);
    expect(rows[0].was_authenticated).toBe(true);
    expect(rows[0].user_hash).toMatch(/^[0-9a-f]{16}$/);
    // No argument VALUES were persisted anywhere.
    const dump = JSON.stringify(rows[0]);
    expect(dump).not.toContain("secret text");
  });
});
