import { describe, it, expect, beforeEach, vi } from "vitest";
import { requestContextStorage, RequestContext } from "@access-mcp/shared";

const mockGet = vi.fn();
const mockSetActingUser = vi.fn();
vi.mock("@access-mcp/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@access-mcp/shared")>();
  return {
    ...actual,
    DrupalAuthProvider: vi.fn().mockImplementation(() => ({
      ensureAuthenticated: vi.fn().mockResolvedValue(undefined),
      get: mockGet,
      setActingUser: mockSetActingUser,
    })),
  };
});
import { AllocationsServer } from "../server.js";

describe("get_my_rp_accounts", () => {
  let server: AllocationsServer;
  beforeEach(() => {
    server = new AllocationsServer();
    mockGet.mockReset(); mockSetActingUser.mockReset();
    delete process.env.ACTING_USER;
    process.env.DRUPAL_API_URL = "https://drupal.example";
    process.env.DRUPAL_USERNAME = "svc"; process.env.DRUPAL_PASSWORD = "pw";
  });
  const call = (actingUser?: string) =>
    requestContextStorage.run({ actingUser } as RequestContext, () =>
      server["handleToolCall"]({ method: "tools/call", params: { name: "get_my_rp_accounts", arguments: {} } }));

  it("registers with no required args", () => {
    const tool = server["getTools"]().find((t) => t.name === "get_my_rp_accounts");
    expect(tool).toBeDefined();
    const schema = tool?.inputSchema as { required?: string[] };
    expect(schema?.required ?? []).toEqual([]);
  });

  it("calls the no-id route as the acting user and surfaces resource_ids + balances", async () => {
    mockGet.mockResolvedValue({ data: { state: "rows_fresh", synced_at: "2026-07-07T14:32:00Z",
      accounts: [{ resource_id: "delta.ncsa.access-ci.org", rp_display_name: "NCSA Delta",
        rp_username: "alice", grants: [{ project_balance: 5000, billable_unit: "GPU hours" }] }] } });
    const result = await call("apasquale@access-ci.org");
    expect(mockSetActingUser).toHaveBeenCalledWith("apasquale@access-ci.org");
    expect(mockGet).toHaveBeenCalledWith("/api/1.0/rp-accounts");
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("delta.ncsa.access-ci.org");
    expect(text).toContain("5000");
    expect(text).toContain("GPU hours");
  });

  it("passes through the syncing state", async () => {
    mockGet.mockResolvedValue({ data: { state: "syncing", accounts: [] } });
    const result = await call("apasquale@access-ci.org");
    expect((result.content[0] as { text: string }).text).toContain("syncing");
  });

  it("refuses with the aligned auth error and no endpoint call when there is no acting user", async () => {
    const result = await call();
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toMatch(/authenticate with your ACCESS-CI credentials/i);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("returns isError when the Drupal call fails", async () => {
    mockGet.mockRejectedValue(new Error("Request failed with status code 403"));
    const result = await call("apasquale@access-ci.org");
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toMatch(/error|403/i);
  });

  it("does not gate the public tools", () => {
    const names = server["getTools"]().map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["search_projects", "analyze_funding", "get_allocation_statistics"]));
  });
});
