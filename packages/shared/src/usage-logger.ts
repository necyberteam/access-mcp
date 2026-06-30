import { createHash } from "node:crypto";

/**
 * Hash an actor identity for anonymous-but-stable usage tracking.
 * Deterministic (same actor → same hash), irreversible (SHA-256, truncated),
 * and stable across servers (no per-server salt) so one actor's usage joins
 * across all MCP servers. Returns null for anonymous (no acting user).
 * Mirrors the agent's usage_logs._hash_user (no PII stored).
 */
export function hashActor(actingUser: string | undefined): string | null {
  if (!actingUser) return null; // Falsy (undefined or empty string) is treated as anonymous.
  // 16 hex = 64 bits — ample for grouping/de-dup of distinct actors at our
  // scale; not intended as a cryptographic-strength privacy guarantee.
  return createHash("sha256").update(actingUser).digest("hex").slice(0, 16);
}

export interface UsageCall {
  server: string;
  tool: string;
  args: Record<string, unknown> | undefined | null;
  success: boolean;
  durationMs: number;
  actingUser: string | undefined;
}

export interface UsageRow {
  server: string;
  tool: string;
  arg_keys: string[];
  success: boolean;
  duration_ms: number;
  user_hash: string | null;
  was_authenticated: boolean;
  client: null; // always null in stage 1; widened to string when the client hook lands (stage 1.5)
}

/** Pure: turn a call into the row we persist. Argument NAMES only, never values. */
export function buildUsageRow(call: UsageCall): UsageRow {
  return {
    server: call.server,
    tool: call.tool,
    arg_keys: call.args ? Object.keys(call.args) : [],
    success: call.success,
    duration_ms: Math.round(call.durationMs),
    user_hash: hashActor(call.actingUser),
    was_authenticated: Boolean(call.actingUser),
    client: null, // future hook — not derivable at this seam today
  };
}
