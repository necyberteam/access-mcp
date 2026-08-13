/**
 * Shared test helper for the StandardWriteResponse envelope contract.
 *
 * The two MCP write servers (events, announcements) each assert their write
 * tools emit a conformant envelope. The STRUCTURAL contract — the exact allowed
 * top-level key-set, the known action set, no `changed`/`success` leakage, a
 * boolean `executed` — is identical across servers and lives here as the single
 * source of truth. Only the STATUS vocabulary differs per server (events emits
 * `cancelled`; announcements does not), so it is passed in by each caller.
 *
 * This is test-only support code, exported from the dedicated `./testkit`
 * subpath (NOT the package root) so it stays off the runtime main entry — the
 * consuming test suites import it as `@access-mcp/shared/testkit`.
 */

/** Exactly the top-level keys a StandardWriteResponse may carry. */
export const WRITE_ENVELOPE_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "action",
  "status",
  "executed",
  "data",
  "warning",
]);

/** The known `action` values across every write tool. */
export const WRITE_ENVELOPE_ACTIONS: ReadonlySet<string> = new Set([
  "register",
  "cancel",
  "create",
  "update",
  "delete",
]);

/**
 * Assert `parsed` is a conformant write envelope: exactly the allowed top-level
 * keys (required ones present, no stray key — catches a future `changed`/
 * `success` regression), a known action, a boolean `executed`, and a status
 * drawn from `statusVocab` (the per-server subset the caller supplies).
 *
 * Takes an `expect` so it works under any harness's global without this module
 * importing a test framework.
 */
export function assertWriteEnvelope(
  parsed: Record<string, unknown>,
  statusVocab: ReadonlySet<string>,
  expect: (actual: unknown) => {
    toBe(expected: unknown): void;
    toHaveProperty(key: string): void;
    not: { toHaveProperty(key: string): void };
  }
): void {
  // The error envelope ({status:"error", executed:false, error:{code,message,
  // hint?}}) is a legitimate sibling shape, not a malformed write envelope —
  // it carries an `error` key outside WRITE_ENVELOPE_ALLOWED_KEYS and a status
  // outside statusVocab by design. Branch on it here rather than widening the
  // allowed-key/status sets, which would silently accept a stray key on the
  // success path too.
  if (parsed.status === "error") {
    expect(parsed.executed).toBe(false);
    expect(typeof parsed.error).toBe("object");
    const error = parsed.error as Record<string, unknown>;
    expect(typeof error.code).toBe("string");
    expect(typeof error.message).toBe("string");
    if (error.hint !== undefined) {
      expect(typeof error.hint).toBe("string");
    }
    return;
  }

  for (const key of Object.keys(parsed)) {
    expect(WRITE_ENVELOPE_ALLOWED_KEYS.has(key)).toBe(true);
  }
  expect(parsed).toHaveProperty("action");
  expect(parsed).toHaveProperty("status");
  expect(parsed).toHaveProperty("executed");
  expect(parsed).not.toHaveProperty("changed");
  expect(parsed).not.toHaveProperty("success");
  expect(WRITE_ENVELOPE_ACTIONS.has(parsed.action as string)).toBe(true);
  expect(statusVocab.has(parsed.status as string)).toBe(true);
  expect(typeof parsed.executed).toBe("boolean");
}
