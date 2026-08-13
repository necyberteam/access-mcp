/**
 * Resident full-corpus cache for the allocations current-projects data.
 *
 * The tools filter over the COMPLETE project set (so `total` is a true count and
 * matches past the old page cap are no longer dropped — the PNRP bug). Holding
 * the corpus resident avoids a ~50s full fetch per query. Refresh is
 * stale-while-revalidate: a warm request is never blocked by a refresh.
 *
 * Lifecycle contracts (each guards a real failure the naive version reintroduces):
 * - Single-flight: one in-flight refresh shared by request-driven ensure() AND
 *   the background timer — never N concurrent full fetches.
 * - Keep-old-on-partial-failure: a failed refresh keeps serving the previous
 *   complete snapshot (stale-but-complete beats fresh-but-partial). A cold-cache
 *   failure throws — never publish a partial as a complete total.
 * - Atomic swap: a new snapshot is built fully, then assigned in one reference
 *   assignment. Readers never see a half-populated corpus.
 * - Chained scheduling: the next refresh is scheduled only after the previous
 *   settles, so a slow fetch can never overlap its successor.
 * - Staleness surfacing: fetchedAt is exposed; past a hard ceiling the snapshot
 *   is flagged stale so keep-old can't serve ancient data as authoritative.
 */

export interface CorpusSnapshot<T> {
  records: T[];
  /** Page count the upstream reported for this snapshot. */
  pages: number;
  /** True if the corpus exceeded the fetch hardCap (incomplete). */
  truncated: boolean;
  /** ms epoch when this snapshot's fetch completed. */
  fetchedAt: number;
}

export interface CorpusCacheOptions {
  /** ms before a snapshot is considered stale and a background refresh triggers. */
  ttlMs: number;
  /**
   * ms past which a snapshot is flagged `stale` (keep-old can't serve ancient
   * data as authoritative forever). Default 3x ttl.
   */
  staleCeilingMs?: number;
  /** injected clock for tests. */
  now?: () => number;
  /** injected logger for refresh-failure visibility. */
  onError?: (err: unknown) => void;
}

export class CorpusCache<T> {
  private snapshot?: CorpusSnapshot<T>;
  private refreshInFlight?: Promise<CorpusSnapshot<T>>;
  private readonly ttlMs: number;
  private readonly staleCeilingMs: number;
  private readonly now: () => number;
  private readonly onError: (err: unknown) => void;

  /** @param fetchCorpus builds a fresh snapshot (fetch all pages). */
  constructor(
    private readonly fetchCorpus: () => Promise<CorpusSnapshot<T>>,
    options: CorpusCacheOptions,
  ) {
    this.ttlMs = options.ttlMs;
    this.staleCeilingMs = options.staleCeilingMs ?? options.ttlMs * 3;
    this.now = options.now ?? Date.now;
    this.onError = options.onError ?? (() => {});
  }

  private isExpired(s: CorpusSnapshot<T>): boolean {
    return this.now() - s.fetchedAt >= this.ttlMs;
  }

  /**
   * Return a complete snapshot to filter over.
   * - warm + fresh: return it.
   * - warm + stale: return it NOW (stale-while-revalidate) and kick a background
   *   refresh; the request never blocks.
   * - cold: await the single-flight fetch (the only blocking case).
   */
  async ensure(): Promise<CorpusSnapshot<T>> {
    const current = this.snapshot;
    if (current && !this.isExpired(current)) return current;

    if (current) {
      // Stale-while-revalidate: serve stale, refresh in the background.
      void this.refresh();
      return current;
    }

    // Cold cache: must await. Single-flight so N concurrent callers share one fetch.
    return this.refresh();
  }

  /**
   * Trigger a refresh. Single-flight: concurrent callers (and the timer) share
   * one in-flight fetch. On failure, resolves to the OLD snapshot if one exists
   * (keep-old), otherwise rejects (cold-cache failure must surface).
   */
  refresh(): Promise<CorpusSnapshot<T>> {
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = (async () => {
      try {
        const next = await this.fetchCorpus();
        // Atomic swap: single reference assignment of a fully-built snapshot.
        this.snapshot = next;
        return next;
      } catch (err) {
        this.onError(err);
        if (this.snapshot) return this.snapshot; // keep-old-on-partial-failure
        throw err; // cold cache: never publish a partial as total
      } finally {
        this.refreshInFlight = undefined;
      }
    })();

    return this.refreshInFlight;
  }

  /** Current snapshot without triggering a fetch (may be undefined/stale). */
  peek(): CorpusSnapshot<T> | undefined {
    return this.snapshot;
  }

  /**
   * True if the current snapshot is past the TTL (a background refresh is due).
   * Distinct from isStale(): expiry is the soft TTL, staleness is the hard ceiling.
   */
  isExpiredNow(): boolean {
    const s = this.snapshot;
    return !!s && this.isExpired(s);
  }

  /** True if the current snapshot is older than the hard staleness ceiling. */
  isStale(): boolean {
    const s = this.snapshot;
    return !!s && this.now() - s.fetchedAt >= this.staleCeilingMs;
  }
}
