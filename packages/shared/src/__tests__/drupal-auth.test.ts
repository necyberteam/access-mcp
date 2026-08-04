import { describe, it, expect, vi, beforeEach } from "vitest";

// Control axios.create so we can drive login + verb responses and defer sends.
const post = vi.fn();
const get = vi.fn();
const del = vi.fn();
const patch = vi.fn();
const create = vi.fn((_cfg?: unknown) => ({ post, get, delete: del, patch }));
vi.mock("axios", () => ({
  default: { create: (cfg: unknown) => create(cfg) },
}));

import { DrupalAuthProvider, DrupalApiError } from "../drupal-auth.js";

const LOGIN_OK = {
  status: 200,
  headers: { "set-cookie": ["SESS=abc; path=/; HttpOnly"] },
  data: { csrf_token: "csrf-1", logout_token: "lo-1", current_user: { uuid: "u-1" } },
};

function newProvider() {
  return new DrupalAuthProvider("https://drupal.example", "svc", "pw");
}

describe("DrupalAuthProvider per-call acting user", () => {
  beforeEach(() => {
    post.mockReset(); get.mockReset(); del.mockReset(); patch.mockReset(); create.mockClear();
    post.mockResolvedValue(LOGIN_OK); // default: login succeeds
  });

  it("creates the axios client with maxRedirects:0 so an auth 302 to CILogon is not followed", () => {
    // Root cause of the CILogon-HTML-as-tool-result bug: without maxRedirects:0,
    // axios follows Drupal's 302 auth redirect to CILogon and returns the login
    // page HTML as a fake 200. Stopping redirects keeps the 3xx status so the
    // caller surfaces a structured error instead of leaking the login page.
    newProvider();
    expect(create).toHaveBeenCalled();
    const cfg = create.mock.calls[0]?.[0] as { maxRedirects?: number };
    expect(cfg.maxRedirects).toBe(0);
  });

  it("getAuthHeaders puts the actingUser argument in X-Acting-User", async () => {
    const p = newProvider();
    await p.ensureAuthenticated();
    const headers = p.getAuthHeaders("alice@access-ci.org");
    expect(headers["X-Acting-User"]).toBe("alice@access-ci.org");
    expect(headers["Cookie"]).toContain("SESS=abc");
    expect(headers["X-CSRF-Token"]).toBe("csrf-1");
  });

  it("get forwards its actingUser argument as the header", async () => {
    const p = newProvider();
    get.mockResolvedValue({ status: 200, data: { ok: true } });
    await p.get("bob@access-ci.org", "/api/1.0/thing");
    const cfg = get.mock.calls.at(-1)![1];
    expect(cfg.headers["X-Acting-User"]).toBe("bob@access-ci.org");
  });

  it("delete forwards its actingUser argument as the header", async () => {
    const p = newProvider();
    del.mockResolvedValue({ status: 200, data: { status: "cancelled" } });
    await p.delete("carol@access-ci.org", "/api/1.0/thing/1");
    const cfg = del.mock.calls.at(-1)![1];
    expect(cfg.headers["X-Acting-User"]).toBe("carol@access-ci.org");
  });

  it("post forwards its actingUser argument as the header", async () => {
    const p = newProvider();
    // post is the login mock by default; make the NEXT post (the verb call) succeed.
    post.mockResolvedValueOnce(LOGIN_OK).mockResolvedValueOnce({ status: 200, data: { ok: true } });
    await p.post("erin@access-ci.org", "/api/1.0/thing", { field: 1 });
    const cfg = post.mock.calls.at(-1)![2]; // post(path, data, config) → config is 3rd arg
    expect(cfg.headers["X-Acting-User"]).toBe("erin@access-ci.org");
  });

  it("the 401 re-auth retry preserves the actingUser argument", async () => {
    const p = newProvider();
    // First GET → 403 (triggers invalidate + re-login + retry), retry → 200.
    get.mockResolvedValueOnce({ status: 403, data: {} })
       .mockResolvedValueOnce({ status: 200, data: { ok: true } });
    await p.get("dave@access-ci.org", "/api/1.0/thing");
    // Both the initial and retried GET must carry dave's header.
    for (const call of get.mock.calls) {
      expect(call[1].headers["X-Acting-User"]).toBe("dave@access-ci.org");
    }
  });

  it("requestRaw returns status and body on 409 without throwing", async () => {
    const p = newProvider();
    // Login is the default post mock; make the NEXT post (the verb call) a 409.
    post.mockResolvedValueOnce(LOGIN_OK).mockResolvedValueOnce({
      status: 409,
      data: { error: "already_registered", message: "You are already registered." },
    });
    const res = await p.requestRaw(
      "actor@access-ci.org",
      "POST",
      "/api/1.0/events/5/register",
      { confirmed: true }
    );
    expect(res.status).toBe(409);
    expect(res.data.error).toBe("already_registered");
    expect(res.data.message).toBe("You are already registered.");
    // Acting user must be forwarded exactly as post/delete do.
    const cfg = post.mock.calls.at(-1)![2]; // post(path, data, config) → config is 3rd arg
    expect(cfg.headers["X-Acting-User"]).toBe("actor@access-ci.org");
    expect(cfg.headers["Content-Type"]).toBe("application/json");
  });

  it("requestRaw returns status and body on a 2xx GET without throwing", async () => {
    const p = newProvider();
    get.mockResolvedValue({ status: 200, data: { id: "8504", title: "OnDemand" } });
    const res = await p.requestRaw("actor@access-ci.org", "GET", "/api/1.0/events/8504");
    expect(res.status).toBe(200);
    expect(res.data.id).toBe("8504");
    const cfg = get.mock.calls.at(-1)![1]; // get(path, config) → config is 2nd arg
    expect(cfg.headers["X-Acting-User"]).toBe("actor@access-ci.org");
  });

  it("requestRaw returns status and body on a 2xx POST without throwing", async () => {
    const p = newProvider();
    post.mockResolvedValueOnce(LOGIN_OK).mockResolvedValueOnce({
      status: 200,
      data: { success: true, status: "registered", registrant_id: "u-123" },
    });
    const res = await p.requestRaw(
      "actor@access-ci.org",
      "POST",
      "/api/1.0/events/5/register",
      { confirmed: true }
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.registrant_id).toBe("u-123");
  });

  it("requestRaw does NOT auto-retry on a 403 (caller branches on status)", async () => {
    const p = newProvider();
    await p.ensureAuthenticated(); // log in up front so post is only the verb call
    post.mockResolvedValueOnce({
      status: 403,
      data: { message: "X-Acting-User did not resolve to an active user." },
    });
    const res = await p.requestRaw(
      "actor@access-ci.org",
      "POST",
      "/api/1.0/events/5/register",
      { confirmed: true }
    );
    expect(res.status).toBe(403);
    // Exactly one verb POST — no re-auth retry (login post happened in ensureAuthenticated).
    expect(post.mock.calls.length).toBe(2); // 1 login + 1 verb, no retry
  });

  // Bug #30: the throwing methods (get/post/patch/delete) flatten Drupal's
  // status + body into a plain Error string, losing both. They now throw a
  // DrupalApiError that carries .status (the number) and .body (parsed Drupal
  // body), while keeping the SAME message text so message-based catchers still
  // work. Cancel (events) and delete_announcement need to branch on status.
  it("delete throws a DrupalApiError with .status and .body on a JSON:API 404", async () => {
    const p = newProvider();
    del.mockResolvedValue({
      status: 404,
      statusText: "Not Found",
      data: { errors: [{ detail: "The resource was not found." }] },
    });
    let caught: unknown;
    try {
      await p.delete("actor@access-ci.org", "/api/2.3/announcements/gone");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(DrupalApiError);
    const err = caught as DrupalApiError;
    expect(err.status).toBe(404);
    expect(err.body).toEqual({ errors: [{ detail: "The resource was not found." }] });
    // Back-compat: message unchanged from the old plain-Error text.
    expect(err.message).toBe("Drupal API error (404): The resource was not found.");
    expect(err.message).toContain("404");
    expect(err).toBeInstanceOf(Error); // still an Error for existing catchers
    expect(err.name).toBe("DrupalApiError");
  });

  it("get throws a DrupalApiError with .status and .body on a 403", async () => {
    const p = newProvider();
    // get() re-auths once on 403 then retries; make BOTH the initial and retry
    // GET return 403 so handleResponse throws on the retry response.
    get.mockResolvedValue({
      status: 403,
      statusText: "Forbidden",
      data: { errors: [{ detail: "Access denied." }] },
    });
    let caught: unknown;
    try {
      await p.get("actor@access-ci.org", "/api/2.3/thing");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(DrupalApiError);
    const err = caught as DrupalApiError;
    expect(err.status).toBe(403);
    expect(err.body).toEqual({ errors: [{ detail: "Access denied." }] });
    expect(err.message).toBe("Drupal API error (403): Access denied.");
  });

  it("post throws a DrupalApiError carrying a flat (non-JSON:API-errors) body on 409", async () => {
    const p = newProvider();
    // Login is the default post mock; make the NEXT post (the verb call) a 409
    // with a FLAT body (no .errors array) — hits the statusText message branch.
    post.mockResolvedValueOnce(LOGIN_OK).mockResolvedValueOnce({
      status: 409,
      statusText: "Conflict",
      data: { error: "already_registered", message: "You are already registered." },
    });
    let caught: unknown;
    try {
      await p.post("actor@access-ci.org", "/api/2.3/thing", { field: 1 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(DrupalApiError);
    const err = caught as DrupalApiError;
    expect(err.status).toBe(409);
    // Full parsed body preserved so callers can read .error / .message.
    expect(err.body).toEqual({
      error: "already_registered",
      message: "You are already registered.",
    });
    // Flat-body branch keeps the old "status statusText" message text.
    expect(err.message).toBe("Drupal API error: 409 Conflict");
  });

  it("does not bleed acting users across interleaved concurrent calls (issue #13)", async () => {
    const p = newProvider();
    await p.ensureAuthenticated(); // log in up front so the interleave is GET-only, not a login race
    // Make request A's GET hang until we release it, so B can run in between.
    let releaseA: (v: unknown) => void;
    const aPending = new Promise<unknown>((res) => { releaseA = res; });
    get.mockImplementationOnce(() => aPending)                          // A's GET (deferred)
       .mockResolvedValueOnce({ status: 200, data: { who: "B" } });     // B's GET (immediate)

    const aPromise = p.get("alice@access-ci.org", "/a"); // starts, awaits deferred GET
    // Single tick: A's ensureAuthenticated is already resolved (pre-auth above),
    // so one microtask parks A at the deferred GET before B starts. Do not remove
    // this yield or collapse it — without it B could run before A reaches its GET,
    // and the interleave this test exists to prove would not happen.
    await Promise.resolve();
    await p.get("bob@access-ci.org", "/b");               // B runs fully while A is parked
    releaseA!({ status: 200, data: { who: "A" } });       // let A resume
    await aPromise;

    const aCall = get.mock.calls[0];
    const bCall = get.mock.calls[1];
    expect(aCall[1].headers["X-Acting-User"]).toBe("alice@access-ci.org");
    expect(bCall[1].headers["X-Acting-User"]).toBe("bob@access-ci.org");
  });
});
