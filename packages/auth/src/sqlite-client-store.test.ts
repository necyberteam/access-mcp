import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteClientStore, resolveClientStorePath } from "./sqlite-client-store.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";

const sampleClient = (id: string): OAuthClientInformationFull => ({
  client_id: id,
  redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
  client_name: "Test Connector",
} as OAuthClientInformationFull);

describe("SqliteClientStore", () => {
  const stores: SqliteClientStore[] = [];
  const dirs: string[] = [];
  const makeStore = (path: string) => {
    const s = new SqliteClientStore(path);
    stores.push(s);
    return s;
  };
  const tmpDbPath = () => {
    const dir = mkdtempSync(join(tmpdir(), "clientstore-"));
    dirs.push(dir);
    return join(dir, "clients.db");
  };
  afterEach(() => {
    while (stores.length) stores.pop()!.close();
    while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
  });

  it("creates its table on construction against a fresh path", async () => {
    const store = makeStore(tmpDbPath());
    // A fresh store with no rows returns undefined, not an error — proves the
    // table exists (a missing table would throw on SELECT).
    expect(await store.getClient("nope")).toBeUndefined();
  });

  it("survives a restart — a client registered in one store instance is readable by a new instance on the same file", async () => {
    const path = tmpDbPath();
    const first = makeStore(path);
    await first.registerClient(sampleClient("client-abc"));
    first.close();
    stores.pop(); // already closed; don't double-close in afterEach

    // Simulate a container restart: brand-new store instance, same file.
    const second = makeStore(path);
    const got = await second.getClient("client-abc");
    expect(got).toBeDefined();
    expect(got!.client_id).toBe("client-abc");
    expect(got!.redirect_uris).toEqual(["https://claude.ai/api/mcp/auth_callback"]);
  });

  it("returns undefined for an unknown client id", async () => {
    const store = makeStore(":memory:");
    expect(await store.getClient("unknown")).toBeUndefined();
  });

  it("registerClient returns the client and is idempotent by client_id (re-register updates)", async () => {
    const store = makeStore(":memory:");
    const returned = await store.registerClient(sampleClient("client-x"));
    expect(returned.client_id).toBe("client-x");

    const updated = { ...sampleClient("client-x"), client_name: "Renamed" };
    await store.registerClient(updated);
    const got = await store.getClient("client-x");
    expect(got!.client_name).toBe("Renamed");
  });
});

describe("resolveClientStorePath", () => {
  it("returns the path when CLIENT_STORE_PATH is set", () => {
    expect(resolveClientStorePath({ CLIENT_STORE_PATH: "/data/clients.db" } as NodeJS.ProcessEnv))
      .toBe("/data/clients.db");
  });
  it("returns :memory: when unset in test env", () => {
    expect(resolveClientStorePath({ NODE_ENV: "test" } as NodeJS.ProcessEnv))
      .toBe(":memory:");
  });
  it("throws when unset outside test env (no silent non-persistent prod)", () => {
    expect(() => resolveClientStorePath({ NODE_ENV: "production" } as NodeJS.ProcessEnv))
      .toThrow(/CLIENT_STORE_PATH must be set/);
  });
  it("throws when unset and NODE_ENV is absent entirely", () => {
    expect(() => resolveClientStorePath({} as NodeJS.ProcessEnv))
      .toThrow(/CLIENT_STORE_PATH must be set/);
  });
});
