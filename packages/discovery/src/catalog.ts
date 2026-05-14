import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { Tool } from "@access-mcp/shared";

// Pillar 3 — catalog management.
// See docs/2026-05-12-tool-catalog-architecture.md §Pillar 3.
//
// At boot the discovery server hits each peer's GET /tools endpoint (unauthenticated,
// exposed by BaseAccessServer at base-server.ts:540) and aggregates the results into
// an in-memory catalog keyed by server name. The catalog is persisted to disk so a
// peer that's transiently unreachable at next boot can be served from the last-known
// snapshot rather than disappearing from the agent's view.

const DEFAULT_PEER_FETCH_TIMEOUT_MS = 5000;

export interface PeerCatalogMap {
  [serverName: string]: Tool[];
}

export interface CatalogFile {
  generated_at: string;
  peers: PeerCatalogMap;
}

export interface CatalogLogger {
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
}

export interface CatalogOptions {
  servicesEnv?: string;
  cachePath: string;
  logger: CatalogLogger;
  fetchTimeoutMs?: number;
  // Injectable for tests.
  fetchImpl?: typeof fetch;
}

/**
 * Parse the ACCESS_MCP_SERVICES env var into a {name → url} map.
 * Format matches BaseAccessServer.getServiceEndpoint: "name=url,name=url".
 */
export function parseServicesEnv(servicesEnv: string | undefined): Record<string, string> {
  if (!servicesEnv) return {};
  const result: Record<string, string> = {};
  for (const entry of servicesEnv.split(",")) {
    const [name, url] = entry.split("=");
    if (name && url) {
      result[name.trim()] = url.trim();
    }
  }
  return result;
}

/**
 * Fetch /tools from one peer with a short timeout. Returns the tools array
 * on success, throws on any failure (timeout, non-200, malformed response).
 */
export async function fetchPeerTools(
  baseUrl: string,
  options: { timeoutMs: number; fetchImpl: typeof fetch }
): Promise<Tool[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await options.fetchImpl(`${baseUrl.replace(/\/$/, "")}/tools`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const body = (await response.json()) as { tools?: Tool[] };
    if (!Array.isArray(body.tools)) {
      throw new Error("Malformed response: 'tools' is not an array");
    }
    return body.tools;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read a previously-persisted catalog from disk. Returns null if the file
 * doesn't exist or is unreadable; never throws — the cache is a soft fallback,
 * not a load-bearing dependency.
 */
export async function readCacheFile(
  cachePath: string,
  logger: CatalogLogger
): Promise<CatalogFile | null> {
  try {
    const raw = await fs.readFile(cachePath, "utf8");
    const parsed = JSON.parse(raw) as CatalogFile;
    if (!parsed.peers || typeof parsed.peers !== "object") {
      logger.warn("Cache file present but missing 'peers' object; ignoring", { cachePath });
      return null;
    }
    return parsed;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      logger.warn("Failed to read catalog cache; ignoring", {
        cachePath,
        error: (error as Error).message,
      });
    }
    return null;
  }
}

/**
 * Write the merged catalog to disk. Creates the parent directory if missing.
 * Failures are logged but not thrown — disk-cache failure should not stop the
 * server (we already have an in-memory catalog).
 */
export async function writeCacheFile(
  cachePath: string,
  catalog: CatalogFile,
  logger: CatalogLogger
): Promise<void> {
  try {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(catalog, null, 2), "utf8");
  } catch (error) {
    logger.warn("Failed to write catalog cache", {
      cachePath,
      error: (error as Error).message,
    });
  }
}

/**
 * Run introspection across all configured peers in parallel. Each peer's
 * fetch is independent; one failing doesn't block the others.
 */
export async function introspectPeers(
  peers: Record<string, string>,
  options: { timeoutMs: number; fetchImpl: typeof fetch; logger: CatalogLogger }
): Promise<{ fresh: PeerCatalogMap; failed: string[] }> {
  const fresh: PeerCatalogMap = {};
  const failed: string[] = [];

  const results = await Promise.allSettled(
    Object.entries(peers).map(async ([name, url]) => {
      const tools = await fetchPeerTools(url, options);
      return { name, tools };
    })
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const name = Object.keys(peers)[i];
    if (result.status === "fulfilled") {
      fresh[result.value.name] = result.value.tools;
    } else {
      failed.push(name);
      options.logger.warn("Peer introspection failed", {
        peer: name,
        error: (result.reason as Error).message,
      });
    }
  }

  return { fresh, failed };
}

/**
 * Build the merged catalog: fresh data wins per peer; cached data fills gaps
 * left by failing peers; peers that fail and have no cache entry are absent
 * from the merged catalog (the catalog truly doesn't know about them).
 */
export function mergeCatalog(
  fresh: PeerCatalogMap,
  cached: CatalogFile | null,
  failed: string[],
  logger: CatalogLogger
): PeerCatalogMap {
  const merged: PeerCatalogMap = { ...fresh };
  for (const name of failed) {
    const cachedEntry = cached?.peers?.[name];
    if (cachedEntry) {
      merged[name] = cachedEntry;
      logger.warn("Using cached entry for unreachable peer", { peer: name });
    }
  }
  return merged;
}

/**
 * High-level boot routine: read cache, fetch fresh, merge, persist. Throws
 * if the final catalog is empty (no peers reachable AND no cache available)
 * — discovery refuses to start in that state, per the spec.
 */
export async function buildCatalog(options: CatalogOptions): Promise<PeerCatalogMap> {
  const peers = parseServicesEnv(options.servicesEnv ?? process.env.ACCESS_MCP_SERVICES);
  const timeoutMs = options.fetchTimeoutMs ?? DEFAULT_PEER_FETCH_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (Object.keys(peers).length === 0) {
    throw new Error(
      "Discovery refuses to start: ACCESS_MCP_SERVICES is empty. Set it to a comma-separated list of name=url entries."
    );
  }

  const cached = await readCacheFile(options.cachePath, options.logger);
  const { fresh, failed } = await introspectPeers(peers, {
    timeoutMs,
    fetchImpl,
    logger: options.logger,
  });
  const merged = mergeCatalog(fresh, cached, failed, options.logger);

  if (Object.keys(merged).length === 0) {
    throw new Error(
      "Discovery refuses to start: no peers reachable and no cached catalog. Verify ACCESS_MCP_SERVICES and peer health."
    );
  }

  await writeCacheFile(
    options.cachePath,
    { generated_at: new Date().toISOString(), peers: merged },
    options.logger
  );

  options.logger.info("Catalog ready", {
    peers: Object.keys(merged),
    fallbacks: failed.filter((name) => merged[name] !== undefined),
    omitted: failed.filter((name) => merged[name] === undefined),
  });

  return merged;
}

export interface CapabilityEntry {
  name: string;
  summary: string;
  server: string;
}

export interface ListCapabilitiesArgs {
  query?: string;
  category?: string;
  limit?: number;
}

const DEFAULT_LIST_LIMIT = 20;
const DEFAULT_ROUND_ROBIN_MAX_PER_SERVER = 2;
const SUMMARY_MAX_CHARS = 140;

function deriveSummary(description: string | undefined): string {
  if (!description) return "";
  const firstLine = description.split("\n")[0].trim();
  if (firstLine.length <= SUMMARY_MAX_CHARS) return firstLine;
  return firstLine.slice(0, SUMMARY_MAX_CHARS - 1) + "…";
}

/**
 * Project the in-memory catalog into the slim shape returned by list_capabilities.
 * No filter → round-robin sample with a per-server cap (default 2). With a query
 * or category filter → no cap; the agent asked for specifics.
 */
export function listCapabilities(
  catalog: PeerCatalogMap,
  args: ListCapabilitiesArgs
): CapabilityEntry[] {
  const limit = args.limit ?? DEFAULT_LIST_LIMIT;
  const hasFilter = Boolean(args.query?.trim() || args.category?.trim());

  // Build candidate entries grouped by server.
  const grouped: Record<string, CapabilityEntry[]> = {};
  for (const [server, tools] of Object.entries(catalog)) {
    if (args.category && args.category.trim() !== server) continue;
    const entries: CapabilityEntry[] = [];
    for (const tool of tools) {
      const entry: CapabilityEntry = {
        name: tool.name,
        summary: deriveSummary(tool.description),
        server,
      };
      if (args.query?.trim()) {
        const haystack = `${entry.name} ${entry.summary}`.toLowerCase();
        if (!haystack.includes(args.query.trim().toLowerCase())) continue;
      }
      entries.push(entry);
    }
    if (entries.length > 0) grouped[server] = entries;
  }

  if (hasFilter) {
    // Flatten in server-key order, then apply limit.
    const flat: CapabilityEntry[] = [];
    for (const server of Object.keys(grouped)) {
      for (const entry of grouped[server]) {
        flat.push(entry);
        if (flat.length >= limit) return flat;
      }
    }
    return flat;
  }

  // Round-robin with per-server cap.
  const cap = DEFAULT_ROUND_ROBIN_MAX_PER_SERVER;
  const serverNames = Object.keys(grouped);
  const cursors: Record<string, number> = Object.fromEntries(serverNames.map((s) => [s, 0]));
  const out: CapabilityEntry[] = [];

  while (out.length < limit) {
    let producedThisRound = false;
    for (const server of serverNames) {
      const cursor = cursors[server];
      if (cursor >= cap) continue;
      const entry = grouped[server][cursor];
      if (!entry) continue;
      out.push(entry);
      cursors[server] = cursor + 1;
      producedThisRound = true;
      if (out.length >= limit) break;
    }
    if (!producedThisRound) break;
  }

  return out;
}
