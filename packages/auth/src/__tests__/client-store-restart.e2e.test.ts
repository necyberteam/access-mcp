import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import type { Express } from "express";
import request from "supertest";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { SqliteClientStore } from "../sqlite-client-store.js";
import { CILogonOAuthProvider } from "../cilogon-provider.js";

/**
 * End-to-end regression guard for PR #56 (persistent OAuth client store).
 *
 * Simulates a real container restart: register a client through the actual
 * DCR HTTP endpoint against a store backed by a real temp-file DB, close
 * that store (dropping every in-process reference — the SDK router, the
 * provider, the store, the app), then build a COMPLETELY FRESH app/provider/
 * store trio pointed at the same file and confirm the client is still there.
 *
 * ":memory:" cannot stand in here — a new connection to ":memory:" is a
 * distinct, empty database, so it would silently pass a broken wiring (the
 * exact bug PR #56 fixed) as well as a working one. Only a real file proves
 * persistence.
 */

const EXTERNAL_BASE_URL = "https://mcp.access-ci.org/auth";

interface Booted {
  app: Express;
  store: SqliteClientStore;
}

/** Mirrors index.ts's wiring (store -> provider -> app + mcpAuthRouter), built directly
 * against a given DB path rather than through the cached index.ts module — importing
 * index.js twice would reuse the same module-level app/provider/store (ESM caching),
 * which can't simulate two independent process lifetimes. */
function boot(dbPath: string): Booted {
  const store = new SqliteClientStore(dbPath);
  const provider = new CILogonOAuthProvider({
    clientId: "test-cilogon-client-id",
    clientSecret: "test-cilogon-client-secret",
    externalBaseUrl: EXTERNAL_BASE_URL,
    clientStore: store,
  });

  const app = express();
  app.use(express.json());
  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl: new URL(EXTERNAL_BASE_URL),
      scopesSupported: ["openid", "email", "org.cilogon.userinfo"],
      resourceName: "ACCESS-CI MCP Servers",
    })
  );

  return { app, store };
}

describe("OAuth client store survives a simulated container restart (e2e)", () => {
  const dirs: string[] = [];
  const openStores: SqliteClientStore[] = [];

  afterEach(() => {
    // Close whatever phase 2 left open; phase 1's store is closed mid-test to
    // simulate the restart, so it's popped out of this list before that point.
    while (openStores.length) openStores.pop()!.close();
    while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
  });

  it("a client registered via DCR before restart resolves via a fresh store/provider/app after restart", async () => {
    const dir = mkdtempSync(join(tmpdir(), "auth-restart-e2e-"));
    dirs.push(dir);
    const dbPath = join(dir, "clients.db");

    // ---- PHASE 1 (pre-restart): register a client through the real HTTP DCR endpoint ----
    const phase1 = boot(dbPath);
    openStores.push(phase1.store);

    const registerRes = await request(phase1.app)
      .post("/register")
      .send({
        redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
        client_name: "Restart E2E Test Connector",
      })
      .set("Content-Type", "application/json");

    expect(registerRes.status).toBe(201);
    const clientId: string = registerRes.body.client_id;
    expect(clientId).toBeTruthy();

    // ---- Simulate process exit: close store #1, drop every phase-1 reference ----
    phase1.store.close();
    openStores.pop(); // already closed; afterEach must not double-close it

    // ---- PHASE 2 (post-restart): brand-new store/provider/app on the same file ----
    const phase2 = boot(dbPath);
    openStores.push(phase2.store);

    // Non-vacuous: phase 2's store started empty. This client_id is only
    // knowable if it was read back from the persisted file — if persistence
    // or the store/provider/router wiring regresses, this resolves nothing.
    const resolved = await phase2.store.getClient(clientId);
    expect(resolved).toBeDefined();
    expect(resolved!.client_id).toBe(clientId);
    expect(resolved!.redirect_uris).toEqual([
      "https://claude.ai/api/mcp/auth_callback",
    ]);
    expect(resolved!.client_name).toBe("Restart E2E Test Connector");

    // Also confirm it resolves through the full HTTP-facing stack on the new
    // app, not just the raw store: exercise /authorize, which looks the
    // client up via provider.clientsStore under the hood on a real request path.
    const authorizeRes = await request(phase2.app)
      .get("/authorize")
      .query({
        client_id: clientId,
        response_type: "code",
        redirect_uri: "https://claude.ai/api/mcp/auth_callback",
        code_challenge: "test-challenge",
        code_challenge_method: "S256",
      });

    // A 302 to CILogon proves the client was found and passed validation; a
    // stale/missing client would 400 instead.
    expect(authorizeRes.status).toBe(302);
    expect(authorizeRes.headers.location).toContain("cilogon.org/authorize");
  });
});
