import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  parseServicesEnv,
  fetchPeerTools,
  readCacheFile,
  writeCacheFile,
  introspectPeers,
  mergeCatalog,
  buildCatalog,
  listCapabilities,
  PeerCatalogMap,
  CatalogLogger,
} from "./catalog.js";

const silentLogger: CatalogLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

function makeTool(name: string, description = `${name} description`) {
  return {
    name,
    description,
    inputSchema: { type: "object", properties: {} },
  };
}

function makeFetch(behaviors: Record<string, () => Promise<Response>>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    for (const [matcher, fn] of Object.entries(behaviors)) {
      if (url.includes(matcher)) return fn();
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
}

describe("parseServicesEnv", () => {
  it("parses comma-separated name=url pairs", () => {
    const result = parseServicesEnv("events=http://a,system-status=http://b");
    expect(result).toEqual({
      events: "http://a",
      "system-status": "http://b",
    });
  });

  it("returns empty object for undefined", () => {
    expect(parseServicesEnv(undefined)).toEqual({});
  });

  it("returns empty object for empty string", () => {
    expect(parseServicesEnv("")).toEqual({});
  });

  it("trims whitespace around name and url", () => {
    expect(parseServicesEnv(" events = http://a , system-status=http://b ")).toEqual({
      events: "http://a",
      "system-status": "http://b",
    });
  });

  it("skips malformed entries (missing url) silently", () => {
    expect(parseServicesEnv("events=http://a,broken,system-status=http://b")).toEqual({
      events: "http://a",
      "system-status": "http://b",
    });
  });
});

describe("fetchPeerTools", () => {
  it("returns the tools array on a 200 response", async () => {
    const tools = [makeTool("search_events")];
    const fetchImpl = makeFetch({
      "/tools": async () => new Response(JSON.stringify({ tools }), { status: 200 }),
    });
    const result = await fetchPeerTools("http://mcp-events:3000", {
      timeoutMs: 1000,
      fetchImpl,
    });
    expect(result).toEqual(tools);
  });

  it("strips trailing slash from baseUrl", async () => {
    const fetchImpl = makeFetch({
      "http://mcp-events:3000/tools": async () =>
        new Response(JSON.stringify({ tools: [] }), { status: 200 }),
    });
    await fetchPeerTools("http://mcp-events:3000/", { timeoutMs: 1000, fetchImpl });
    expect((fetchImpl as unknown as Mock).mock.calls[0][0]).toBe(
      "http://mcp-events:3000/tools"
    );
  });

  it("throws on non-200 response", async () => {
    const fetchImpl = makeFetch({
      "/tools": async () => new Response("nope", { status: 500 }),
    });
    await expect(
      fetchPeerTools("http://x", { timeoutMs: 1000, fetchImpl })
    ).rejects.toThrow(/HTTP 500/);
  });

  it("throws when the response body is missing tools", async () => {
    const fetchImpl = makeFetch({
      "/tools": async () => new Response(JSON.stringify({ wrong: "shape" }), { status: 200 }),
    });
    await expect(
      fetchPeerTools("http://x", { timeoutMs: 1000, fetchImpl })
    ).rejects.toThrow(/Malformed/);
  });
});

describe("cache file I/O", () => {
  let tmpDir: string;
  let cachePath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "discovery-test-"));
    cachePath = path.join(tmpDir, "catalog.json");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("round-trips a catalog through write + read", async () => {
    const peers: PeerCatalogMap = { events: [makeTool("search_events")] };
    await writeCacheFile(
      cachePath,
      { generated_at: "2026-05-14T00:00:00Z", peers },
      silentLogger
    );
    const read = await readCacheFile(cachePath, silentLogger);
    expect(read?.peers).toEqual(peers);
  });

  it("creates the parent directory if missing", async () => {
    const nestedPath = path.join(tmpDir, "deep", "nested", "catalog.json");
    await writeCacheFile(
      nestedPath,
      { generated_at: "2026-05-14T00:00:00Z", peers: {} },
      silentLogger
    );
    const stat = await fs.stat(nestedPath);
    expect(stat.isFile()).toBe(true);
  });

  it("returns null when the cache file doesn't exist", async () => {
    const result = await readCacheFile(path.join(tmpDir, "nonexistent.json"), silentLogger);
    expect(result).toBeNull();
  });

  it("returns null and warns for unparseable cache content", async () => {
    await fs.writeFile(cachePath, "not json at all", "utf8");
    const warn = vi.fn();
    const result = await readCacheFile(cachePath, { ...silentLogger, warn });
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("returns null when the cache structure is wrong", async () => {
    await fs.writeFile(cachePath, JSON.stringify({ no_peers_key: true }), "utf8");
    const result = await readCacheFile(cachePath, silentLogger);
    expect(result).toBeNull();
  });
});

describe("introspectPeers", () => {
  it("aggregates tools from every reachable peer", async () => {
    const fetchImpl = makeFetch({
      "mcp-events": async () =>
        new Response(JSON.stringify({ tools: [makeTool("search_events")] }), { status: 200 }),
      "mcp-system-status": async () =>
        new Response(JSON.stringify({ tools: [makeTool("get_infrastructure_news")] }), {
          status: 200,
        }),
    });
    const result = await introspectPeers(
      { events: "http://mcp-events:3000", "system-status": "http://mcp-system-status:3000" },
      { timeoutMs: 1000, fetchImpl, logger: silentLogger }
    );
    expect(Object.keys(result.fresh)).toEqual(["events", "system-status"]);
    expect(result.failed).toEqual([]);
  });

  it("records per-peer failures without throwing", async () => {
    const fetchImpl = makeFetch({
      "mcp-events": async () =>
        new Response(JSON.stringify({ tools: [makeTool("search_events")] }), { status: 200 }),
      "mcp-broken": async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    const warn = vi.fn();
    const result = await introspectPeers(
      { events: "http://mcp-events:3000", broken: "http://mcp-broken:3000" },
      { timeoutMs: 1000, fetchImpl, logger: { ...silentLogger, warn } }
    );
    expect(Object.keys(result.fresh)).toEqual(["events"]);
    expect(result.failed).toEqual(["broken"]);
    expect(warn).toHaveBeenCalledWith(
      "Peer introspection failed",
      expect.objectContaining({ peer: "broken" })
    );
  });
});

describe("mergeCatalog", () => {
  it("uses fresh data for reachable peers", () => {
    const fresh: PeerCatalogMap = { events: [makeTool("search_events")] };
    const cached = {
      generated_at: "old",
      peers: { events: [makeTool("stale_events")] },
    };
    const result = mergeCatalog(fresh, cached, [], silentLogger);
    expect(result.events?.[0].name).toBe("search_events");
  });

  it("falls back to cached data for failed peers", () => {
    const fresh: PeerCatalogMap = { events: [makeTool("search_events")] };
    const cached = {
      generated_at: "old",
      peers: { announcements: [makeTool("search_announcements")] },
    };
    const result = mergeCatalog(fresh, cached, ["announcements"], silentLogger);
    expect(result.announcements?.[0].name).toBe("search_announcements");
  });

  it("omits failed peers with no cache entry", () => {
    const fresh: PeerCatalogMap = { events: [makeTool("search_events")] };
    const result = mergeCatalog(fresh, null, ["announcements"], silentLogger);
    expect(result.announcements).toBeUndefined();
    expect(Object.keys(result)).toEqual(["events"]);
  });
});

describe("buildCatalog", () => {
  let tmpDir: string;
  let cachePath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "discovery-test-"));
    cachePath = path.join(tmpDir, "catalog.json");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns the merged catalog and persists it to disk on success", async () => {
    const fetchImpl = makeFetch({
      "/tools": async () =>
        new Response(JSON.stringify({ tools: [makeTool("search_events")] }), { status: 200 }),
    });
    const result = await buildCatalog({
      servicesEnv: "events=http://mcp-events:3000",
      cachePath,
      logger: silentLogger,
      fetchImpl,
    });
    expect(result.events).toBeDefined();
    const persisted = JSON.parse(await fs.readFile(cachePath, "utf8"));
    expect(persisted.peers.events).toBeDefined();
  });

  it("throws when ACCESS_MCP_SERVICES is empty", async () => {
    await expect(
      buildCatalog({ servicesEnv: "", cachePath, logger: silentLogger })
    ).rejects.toThrow(/ACCESS_MCP_SERVICES is empty/);
  });

  it("throws when no peers reachable and no cache exists", async () => {
    const fetchImpl = makeFetch({
      "/tools": async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    await expect(
      buildCatalog({
        servicesEnv: "events=http://mcp-events:3000",
        cachePath,
        logger: silentLogger,
        fetchImpl,
      })
    ).rejects.toThrow(/no peers reachable/);
  });

  it("serves from cache when all peers fail but cache exists", async () => {
    // Seed the cache.
    await writeCacheFile(
      cachePath,
      {
        generated_at: "2026-05-13T00:00:00Z",
        peers: { events: [makeTool("search_events")] },
      },
      silentLogger
    );
    const fetchImpl = makeFetch({
      "/tools": async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    const result = await buildCatalog({
      servicesEnv: "events=http://mcp-events:3000",
      cachePath,
      logger: silentLogger,
      fetchImpl,
    });
    expect(result.events?.[0].name).toBe("search_events");
  });
});

describe("listCapabilities", () => {
  const catalog: PeerCatalogMap = {
    events: [
      makeTool("search_events", "Search events"),
      makeTool("get_my_events", "Get my events"),
      makeTool("get_event_details", "Get event details"),
    ],
    "system-status": [
      makeTool("get_infrastructure_news", "Get outages and maintenance"),
    ],
    announcements: [
      makeTool("search_announcements", "Search announcements"),
      makeTool("get_announcement", "Get one announcement"),
      makeTool("get_announcement_context", "Context for an announcement"),
    ],
  };

  it("returns a round-robin sample with default per-server cap of 2", () => {
    const entries = listCapabilities(catalog, {});
    // events × 2, system-status × 1, announcements × 2 = 5
    expect(entries).toHaveLength(5);
    const perServer: Record<string, number> = {};
    for (const e of entries) perServer[e.server] = (perServer[e.server] ?? 0) + 1;
    expect(perServer.events).toBe(2);
    expect(perServer["system-status"]).toBe(1);
    expect(perServer.announcements).toBe(2);
  });

  it("filters by query against name and summary", () => {
    const entries = listCapabilities(catalog, { query: "outages" });
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("get_infrastructure_news");
  });

  it("filters by category (server name)", () => {
    const entries = listCapabilities(catalog, { category: "events" });
    expect(entries).toHaveLength(3);
    expect(entries.every((e) => e.server === "events")).toBe(true);
  });

  it("respects limit when filter is applied (no per-server cap)", () => {
    const entries = listCapabilities(catalog, { category: "events", limit: 2 });
    expect(entries).toHaveLength(2);
  });

  it("derives summary from the first line of description", () => {
    const withMultiline: PeerCatalogMap = {
      events: [
        {
          name: "complex_tool",
          description: "First line only.\nSecond line ignored.",
          inputSchema: { type: "object" },
        },
      ],
    };
    const entries = listCapabilities(withMultiline, {});
    expect(entries[0].summary).toBe("First line only.");
  });

  it("query match is case-insensitive", () => {
    const entries = listCapabilities(catalog, { query: "OUTAGES" });
    expect(entries).toHaveLength(1);
  });
});
