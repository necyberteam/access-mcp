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
