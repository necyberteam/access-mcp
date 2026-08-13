import { describe, it, expect, vi } from "vitest";
import { CorpusCache, type CorpusSnapshot } from "./corpus-cache.js";

type Rec = { id: number };

function snap(ids: number[], fetchedAt: number): CorpusSnapshot<Rec> {
  return { records: ids.map((id) => ({ id })), pages: 1, truncated: false, fetchedAt };
}

describe("CorpusCache lifecycle", () => {
  it("single-flight: N concurrent cold ensure() calls trigger exactly one fetch", async () => {
    let calls = 0;
    let resolveFetch!: (s: CorpusSnapshot<Rec>) => void;
    const fetchCorpus = vi.fn(() => {
      calls++;
      return new Promise<CorpusSnapshot<Rec>>((r) => {
        resolveFetch = r;
      });
    });
    const cache = new CorpusCache(fetchCorpus, { ttlMs: 1000, now: () => 0 });

    const waiters = Promise.all([cache.ensure(), cache.ensure(), cache.ensure(), cache.ensure()]);
    resolveFetch(snap([1, 2], 0));
    const results = await waiters;

    expect(calls).toBe(1); // one fetch, not four
    expect(results.every((r) => r.records.length === 2)).toBe(true);
  });

  it("stale-while-revalidate: a stale ensure() serves the OLD snapshot immediately and refreshes in background", async () => {
    let t = 0;
    const now = () => t;
    let fetchCount = 0;
    const fetchCorpus = vi.fn(async () => {
      fetchCount++;
      return snap(fetchCount === 1 ? [1] : [1, 2, 3], t);
    });
    const cache = new CorpusCache(fetchCorpus, { ttlMs: 100, now });

    const first = await cache.ensure(); // cold -> fetch #1
    expect(first.records).toHaveLength(1);

    t = 200; // now stale
    const served = await cache.ensure(); // SWR: serves OLD immediately
    expect(served.records).toHaveLength(1); // old snapshot, not blocked on refresh

    // background refresh completes
    await new Promise((r) => setTimeout(r, 0));
    const afterRefresh = cache.peek();
    expect(afterRefresh?.records).toHaveLength(3); // refreshed in background
    expect(fetchCount).toBe(2);
  });

  it("keep-old-on-partial-failure: a failed refresh retains the previous good snapshot", async () => {
    let t = 0;
    const now = () => t;
    const errors: unknown[] = [];
    let call = 0;
    const fetchCorpus = vi.fn(async () => {
      call++;
      if (call === 1) return snap([1, 2, 3], t);
      throw new Error("upstream 500 on refresh");
    });
    const cache = new CorpusCache(fetchCorpus, {
      ttlMs: 100,
      now,
      onError: (e) => errors.push(e),
    });

    await cache.ensure(); // snapshot #1 (3 records)
    t = 200;
    await cache.ensure(); // serves old, triggers background refresh which fails
    await new Promise((r) => setTimeout(r, 0));

    expect(cache.peek()?.records).toHaveLength(3); // still snapshot #1, total unchanged
    expect(errors).toHaveLength(1); // failure was surfaced, not silent
  });

  it("cold-cache partial failure throws (never publishes a partial as total)", async () => {
    const fetchCorpus = vi.fn(async () => {
      throw new Error("upstream down");
    });
    const cache = new CorpusCache(fetchCorpus, { ttlMs: 100, now: () => 0 });
    await expect(cache.ensure()).rejects.toThrow(/upstream down/);
    expect(cache.peek()).toBeUndefined();
  });

  it("atomic swap: a reader during a slow refresh sees the full old snapshot, never a partial", async () => {
    let t = 0;
    const now = () => t;
    let resolveSecond!: (s: CorpusSnapshot<Rec>) => void;
    let call = 0;
    const fetchCorpus = vi.fn(() => {
      call++;
      if (call === 1) return Promise.resolve(snap([1, 2, 3], t));
      return new Promise<CorpusSnapshot<Rec>>((r) => {
        resolveSecond = r;
      });
    });
    const cache = new CorpusCache(fetchCorpus, { ttlMs: 100, now });

    await cache.ensure(); // snapshot #1
    t = 200;
    await cache.ensure(); // triggers slow refresh #2 (not yet resolved)

    // While refresh #2 is in flight, a reader must see the complete old snapshot
    expect(cache.peek()?.records).toHaveLength(3);

    resolveSecond(snap([1, 2, 3, 4, 5], t));
    await new Promise((r) => setTimeout(r, 0));
    expect(cache.peek()?.records).toHaveLength(5); // now the full new one
  });

  it("cached within TTL: a second ensure() does not re-fetch", async () => {
    const fetchCorpus = vi.fn(async () => snap([1, 2], 0));
    const cache = new CorpusCache(fetchCorpus, { ttlMs: 1000, now: () => 0 });
    await cache.ensure();
    await cache.ensure();
    expect(fetchCorpus).toHaveBeenCalledTimes(1);
  });

  it("isStale flags a snapshot past the hard staleness ceiling", async () => {
    let t = 0;
    const cache = new CorpusCache(async () => snap([1], t), {
      ttlMs: 100,
      staleCeilingMs: 300,
      now: () => t,
    });
    await cache.ensure();
    t = 200;
    expect(cache.isStale()).toBe(false); // stale for TTL, not past ceiling
    t = 400;
    expect(cache.isStale()).toBe(true); // past 300ms ceiling
  });
});
