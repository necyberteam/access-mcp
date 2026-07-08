import { describe, it, expect, vi, beforeEach } from "vitest";

// Control axios.create so we can drive login + verb responses and defer sends.
const post = vi.fn();
const get = vi.fn();
const del = vi.fn();
const patch = vi.fn();
vi.mock("axios", () => ({
  default: { create: () => ({ post, get, delete: del, patch }) },
}));

import { DrupalAuthProvider } from "../drupal-auth.js";

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
    post.mockReset(); get.mockReset(); del.mockReset(); patch.mockReset();
    post.mockResolvedValue(LOGIN_OK); // default: login succeeds
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
