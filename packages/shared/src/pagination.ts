/** Shared pagination ceiling. One number, so tools stop scattering 50/100/200 literals. */
export const MAX_LIMIT = 500;

/**
 * Coerce a caller-supplied offset to a safe forward offset: negative,
 * non-finite, or non-integer values become a valid `>= 0` integer, never a
 * slice-from-the-end footgun. This is the SINGLE source of offset coercion —
 * `buildPagination` uses it for the metadata it reports, and upstream-paginated
 * callers (e.g. nsf-awards) that must translate offset into a fetch param
 * BEFORE `buildPagination` runs MUST call this so the value they fetch with is
 * identical to the value reported. (A prior nsf-awards bug was exactly the two
 * coercions drifting: metadata said offset 0 while the fetch used a negative.)
 */
export function coerceOffset(raw: number | undefined): number {
  return Math.max(0, Math.trunc(Number.isFinite(raw) ? (raw as number) : 0));
}

/**
 * Coerce a caller-supplied limit to a safe value for callers (e.g. events)
 * that slice locally instead of going through `buildPagination` — sliceing
 * with a raw negative limit is a slice-from-the-end footgun just like an
 * uncoerced offset is (`slice(2, 2 + -1)` === `slice(2, 1)`), so this is the
 * limit-side counterpart to `coerceOffset`.
 *
 * `undefined`/`null` fall back to `defaultLimit`, matching coerceOffset's
 * "missing input" handling. An EXPLICIT `0`, however, is preserved as-is:
 * `search_events`'s count-only contract (`limit:0` → `items:[]`, honest
 * metadata, no error) depends on 0 surviving coercion, so 0 must NOT be
 * clamped up to 1 or up to defaultLimit — only genuinely invalid input
 * (negative, NaN, Infinity) falls back to defaultLimit. Non-integers are
 * truncated (10.5 → 10). This does not enforce MAX_LIMIT — the existing
 * fetchSize/500-ceiling logic downstream of this call handles that.
 */
export function coerceLimit(raw: number | null | undefined, defaultLimit: number): number {
  if (raw === undefined || raw === null) {
    return defaultLimit;
  }
  if (!Number.isFinite(raw)) {
    return defaultLimit;
  }
  const truncated = Math.trunc(raw);
  return truncated < 0 ? defaultLimit : truncated;
}

/**
 * Build honest pagination metadata for an in-memory (true-total) list tool.
 * has_more is computed from the true total, so it never claims more when the
 * window already reaches the end. capped is set only when the caller's request
 * exceeded MAX_LIMIT — a previously-silent clamp made visible.
 *
 * For callers that use buildPagination, this is the limit/offset enforcement
 * point. It is not the only one — callers with no true total (e.g. events,
 * which slices a fetched page rather than a fully-known list) can't use the
 * throwing contract here and instead use coerceOffset/coerceLimit directly.
 *
 * Validates both inputs so every caller — query branch and list branches alike
 * — gets identical behavior for adversarial input, instead of trusting numbers
 * that may arrive negative, non-integer, or non-finite:
 *  - offset: negative/non-finite/non-integer is coerced to a safe forward
 *    offset (never negative, never a slice-from-the-end footgun).
 *  - limit: an explicitly-provided limit that comes out < 1 after truncation
 *    (0, negative, NaN, Infinity) is invalid input and throws, matching the
 *    pre-existing list-branch "Limit must be at least 1" contract — so the
 *    query branch can no longer silently accept limit:0 while list branches
 *    reject it.
 */
export function buildPagination(args: {
  requestedLimit: number | undefined;
  offset: number;
  total: number;
  defaultLimit: number;
}): { limit: number; offset: number; total: number; has_more: boolean; capped?: true } {
  const offset = coerceOffset(args.offset);

  let asked = args.defaultLimit;
  if (args.requestedLimit !== undefined) {
    const truncated = Math.trunc(
      Number.isFinite(args.requestedLimit) ? args.requestedLimit : NaN
    );
    if (!Number.isFinite(truncated) || truncated < 1) {
      throw new Error("Limit must be at least 1");
    }
    asked = truncated;
  }

  const limit = Math.min(asked, MAX_LIMIT);
  const returned = Math.max(0, Math.min(limit, args.total - offset));
  const base = {
    limit,
    offset,
    total: args.total,
    has_more: offset + returned < args.total,
  };
  // capped iff the ceiling actually reduced the effective limit — compare the
  // post-truncation `asked`, not the raw requestedLimit, so limit:500.9 (asked
  // 500 = MAX_LIMIT, nothing clamped) is NOT reported as capped.
  return limit < asked ? { ...base, capped: true as const } : base;
}
