/**
 * Fetch a paginated upstream to true completion.
 *
 * The failure this exists to prevent: filtering a selectively-narrowed query
 * over a *capped* fetch window silently drops matches that sit past the cap
 * (the allocations current-projects.json bug — 9 PNRP projects hidden past
 * page 10, reported as total:0). This helper fetches every page so callers can
 * filter over the complete set and report a true total.
 *
 * Hardened against the upstream's observed misbehaviors:
 * - It fails OPEN on over-range pages: `?page=999` returns page-1 content while
 *   still reporting the real page count. So we capture `totalPages` ONCE from
 *   page 1, fetch strictly [1, totalPages], and dedupe by a stable key; a later
 *   page whose first key equals page 1's is the fail-open signature.
 * - A malformed page (missing/undefined page count, or an HTTP-200 body that is
 *   actually an error) is a HARD error, never treated as "0 pages"/NaN.
 * - `hardCap` is a safety bound, not a terminator. If the corpus exceeds it we
 *   return what we fetched with `truncated: true`; a truncated result is never
 *   to be reported as a complete total.
 *
 * Generic so other servers with the same anti-pattern (nsf-awards, events) can
 * reuse it: the caller supplies `fetchPage`, `keyOf`, and an optional `project`.
 */

export interface PageResult<Raw> {
  /** Items on this page. */
  items: Raw[];
  /**
   * The total page count the upstream reports on THIS page. Read only from the
   * first page by the caller of fetchAllPages; here it is validated per page so
   * a malformed page is caught.
   */
  totalPages: number;
}

export interface FetchAllPagesOptions {
  /** Max pages fetched concurrently. Default 10. */
  concurrency?: number;
  /**
   * Safety bound on total pages. If the upstream reports more than this, we
   * fetch up to hardCap and flag `truncated`. Default 1000.
   */
  hardCap?: number;
  /** Per-page retry attempts on failure. Default 3. */
  retries?: number;
  /** Base backoff in ms between retries (exponential). Default 200. */
  backoffMs?: number;
}

export interface FetchAllPagesResult<Out> {
  records: Out[];
  /** Total pages the upstream reported (captured once from page 1). */
  pages: number;
  /** True only if the corpus exceeded hardCap and was cut short. */
  truncated: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetries<T>(
  fn: () => Promise<T>,
  retries: number,
  backoffMs: number,
  what: string,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(backoffMs * 2 ** attempt);
    }
  }
  throw new Error(
    `${what} failed after ${retries + 1} attempts: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}

/**
 * Fetch every page and return the complete, deduped, projected record set.
 *
 * @param fetchPage  fetches one page (1-indexed) → { items, totalPages }. Must
 *                   throw or return a non-finite totalPages for a malformed page.
 * @param keyOf      stable unique key per raw item (e.g. p => p.projectId), used
 *                   to dedupe and to detect the over-range fail-open.
 * @param project    optional projection applied to each raw item at ingest
 *                   (e.g. drop the heavy unused `publications` field). Identity
 *                   by default.
 */
export async function fetchAllPages<Raw, Out = Raw>(
  fetchPage: (page: number) => Promise<PageResult<Raw>>,
  keyOf: (item: Raw) => string | number,
  options: FetchAllPagesOptions = {},
  project: (item: Raw) => Out = (item) => item as unknown as Out,
): Promise<FetchAllPagesResult<Out>> {
  const { concurrency = 10, hardCap = 1000, retries = 3, backoffMs = 200 } = options;

  // Page 1: capture the page count ONCE. Never re-read it from later pages (it
  // is echoed on every page and can drift while we fetch).
  const first = await withRetries(() => fetchPage(1), retries, backoffMs, "page 1");
  const reportedPages = first.totalPages;
  if (!Number.isFinite(reportedPages) || reportedPages < 1) {
    throw new Error(`fetchAllPages: upstream reported invalid page count ${String(reportedPages)}`);
  }

  const truncated = reportedPages > hardCap;
  const lastPage = truncated ? hardCap : reportedPages;

  // The over-range fail-open sentinel: a later page whose first item's key
  // equals page 1's first key is a re-serve of page 1, not real data.
  const firstKeyOfPage1 = first.items.length ? keyOf(first.items[0]) : undefined;

  const seen = new Set<string | number>();
  const records: Out[] = [];
  const ingest = (items: Raw[]) => {
    for (const item of items) {
      const k = keyOf(item);
      if (seen.has(k)) continue;
      seen.add(k);
      records.push(project(item));
    }
  };
  ingest(first.items);

  // Fetch pages 2..lastPage in bounded-concurrency batches.
  for (let start = 2; start <= lastPage; start += concurrency) {
    const batch: number[] = [];
    for (let p = start; p < start + concurrency && p <= lastPage; p++) batch.push(p);

    const results = await Promise.all(
      batch.map((p) => withRetries(() => fetchPage(p), retries, backoffMs, `page ${p}`)),
    );

    for (const res of results) {
      // Fail-open guard: a page>1 that begins with page 1's key is a re-serve.
      if (
        firstKeyOfPage1 !== undefined &&
        res.items.length > 0 &&
        keyOf(res.items[0]) === firstKeyOfPage1
      ) {
        throw new Error(
          "fetchAllPages: upstream returned duplicate page-1 content for a later page " +
            "(over-range fail-open) — refusing to build a corrupt corpus",
        );
      }
      ingest(res.items);
    }
  }

  return { records, pages: reportedPages, truncated };
}
