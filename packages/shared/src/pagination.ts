/** Shared pagination ceiling. One number, so tools stop scattering 50/100/200 literals. */
export const MAX_LIMIT = 500;

/**
 * Build honest pagination metadata for an in-memory (true-total) list tool.
 * has_more is computed from the true total, so it never claims more when the
 * window already reaches the end. capped is set only when the caller's request
 * exceeded MAX_LIMIT — a previously-silent clamp made visible.
 */
export function buildPagination(args: {
  requestedLimit: number | undefined;
  offset: number;
  total: number;
  defaultLimit: number;
}): { limit: number; offset: number; total: number; has_more: boolean; capped?: true } {
  const asked = args.requestedLimit ?? args.defaultLimit;
  const limit = Math.min(asked, MAX_LIMIT);
  const returned = Math.max(0, Math.min(limit, args.total - args.offset));
  const base = {
    limit,
    offset: args.offset,
    total: args.total,
    has_more: args.offset + returned < args.total,
  };
  return args.requestedLimit !== undefined && args.requestedLimit > MAX_LIMIT
    ? { ...base, capped: true as const }
    : base;
}
