/** Shared pagination ceiling. One number, so tools stop scattering 50/100/200 literals. */
export const MAX_LIMIT = 500;

/**
 * Build honest pagination metadata for an in-memory (true-total) list tool.
 * has_more is computed from the true total, so it never claims more when the
 * window already reaches the end. capped is set only when the caller's request
 * exceeded MAX_LIMIT — a previously-silent clamp made visible.
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
  const rawOffset = args.offset;
  const offset = Math.max(0, Math.trunc(Number.isFinite(rawOffset) ? rawOffset : 0));

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
  return args.requestedLimit !== undefined && args.requestedLimit > MAX_LIMIT
    ? { ...base, capped: true as const }
    : base;
}
