export interface ResolverCandidate {
  name: string;
  info_resourceid: string;
}

export interface ResolverDeps {
  /** Search resources by a free-text query; returns candidates carrying info_resourceid. */
  search: (query: string) => Promise<ResolverCandidate[]>;
}

export type GlobalResourceResolution =
  | { ok: true; resourceId: string }
  | { ok: false; reason: string };

/**
 * Canonicalize a dotted ACCESS resource id: legacy XSEDE/.edu domains → access-ci.org,
 * and strip resource-type/connective suffixes (delta-gpu.… → delta.…). Ported from
 * software-discovery so both it and resolveGlobalResourceId share one canonical form.
 */
export function normalizeGlobalResourceId(resourceId: string): string {
  if (resourceId.includes(".xsede.org")) {
    resourceId = resourceId.replace(".xsede.org", ".access-ci.org");
  }
  if (resourceId.includes(".illinois.edu")) {
    resourceId = resourceId.replace(".illinois.edu", ".access-ci.org");
  }
  if (resourceId.includes(".edu")) {
    resourceId = resourceId.replace(".edu", ".access-ci.org");
  }
  resourceId = resourceId.replace(/-(gpu|cpu|storage|compute)\./, ".");
  resourceId = resourceId.replace(/-(login|data|transfer)\./, ".");
  return resourceId;
}

/**
 * Resolve a resource name-or-id to its canonical dotted ACCESS Global Resource
 * ID (info_resourceid). NOT info_groupid — that is a catalog grouping id and is
 * not what Drupal's field_access_global_resource_id maps from.
 */
export async function resolveGlobalResourceId(
  input: string,
  deps: ResolverDeps
): Promise<GlobalResourceResolution> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "empty resource identifier" };

  // Already a dotted global resource id → passthrough. Normalize here only:
  // a caller-supplied id may be a legacy XSEDE/.edu or -gpu/-cpu form, so we
  // canonicalize it. Ids we look up below come from the catalog, which is the
  // authority on its own ids — we return those verbatim rather than second-
  // guessing them (canonicalizing a looked-up id could mask a real mismatch).
  if (trimmed.includes(".")) {
    return { ok: true, resourceId: normalizeGlobalResourceId(trimmed) };
  }

  const candidates = await deps.search(trimmed);
  const lower = trimmed.toLowerCase();

  const exact = candidates.find((c) => c.name?.toLowerCase() === lower);
  if (exact && exact.info_resourceid) return { ok: true, resourceId: exact.info_resourceid };

  const partials = candidates.filter((c) =>
    c.name?.toLowerCase().includes(lower)
  );
  if (partials.length === 1 && partials[0].info_resourceid) {
    return { ok: true, resourceId: partials[0].info_resourceid };
  }
  if (partials.length > 1) {
    return {
      ok: false,
      reason: `'${input}' is ambiguous — matches: ${partials.map((p) => p.name).join(", ")}. Use the exact name or the full resource id (e.g. delta.ncsa.access-ci.org).`,
    };
  }
  return { ok: false, reason: `No resource matched '${input}'. Use search_resources to find valid resource ids.` };
}
