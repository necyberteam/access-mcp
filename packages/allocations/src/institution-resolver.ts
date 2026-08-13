/**
 * Institution resolution against the allocations controlled vocabulary.
 *
 * `piInstitution` on every project is a verbatim member of the allocations org
 * list (the `current-projects.json?filters=1` `filters.orgs` set), so grouping
 * and filtering by institution is an EXACT join, not fuzzy matching. Distinct
 * institutions that a word-overlap matcher used to conflate — "University of
 * Washington" vs "Washington University in St. Louis" vs "George Washington
 * University"; "University of Miami" vs "Miami University" — are already separate
 * entries in the vocabulary and must stay separate.
 *
 * A user's free-text query, however, is NOT controlled: it may be an acronym
 * ("TAMU", "MIT"), a punctuation variant ("UC Berkeley" vs "University of
 * California, Berkeley"), or a partial ("Texas"). This module resolves that query
 * to canonical vocabulary entries:
 *   - an exact/normalized hit, or a single unambiguous alias/substring hit, is
 *     treated as resolved;
 *   - a partial matching several entries returns the candidate list, so the
 *     caller (the tool-calling agent) can re-query a specific one, aggregate, or
 *     ask the user — rather than the tool silently guessing one and reporting
 *     funding for the wrong institution.
 *
 * There is no fuzzy word-overlap and no "University of X" <-> "X University" swap:
 * the swap manufactures exactly the cross-institution collisions above and is a
 * known entity-resolution anti-pattern.
 */

/** Acronym / short-alias -> the institution's full name, resolved against the vocab. */
export type AliasTable = Record<string, string>;

export interface InstitutionResolution {
  /** The single canonical vocabulary string, when the query resolves unambiguously. */
  resolved?: string;
  /** Candidate canonical strings when the query is ambiguous (resolved is unset). */
  candidates: string[];
}

/**
 * Normalize an institution string for comparison: lowercase, drop punctuation
 * that varies between the vocab and user input (commas, periods, hyphens, the
 * en-dash some Texas A&M campuses use), expand "&" to "and", and collapse
 * whitespace. Applied SYMMETRICALLY to the query and every vocab entry, so
 * "UC Berkeley"/"University of California, Berkeley" punctuation differences do
 * not cause a false miss. Word ORDER is preserved (it carries institution
 * identity: "University of X" != "X University").
 */
export function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[.,]/g, " ")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve a free-text institution query to canonical vocabulary entries.
 *
 * @param query   the user's institution string
 * @param vocab   the controlled vocabulary (distinct piInstitution values)
 * @param aliases acronym/short-form -> full-name map (full name resolved against vocab)
 * @param maxCandidates cap on the ambiguous candidate list
 */
export function resolveInstitution(
  query: string,
  vocab: readonly string[],
  aliases: AliasTable = {},
  maxCandidates = 10,
): InstitutionResolution {
  const q = normalizeForMatch(query);
  if (!q) return { candidates: [] };

  // Precompute normalized vocab once per call.
  const normVocab = vocab.map((v) => ({ canonical: v, norm: normalizeForMatch(v) }));

  // 1. Exact normalized match against the vocab.
  const exact = normVocab.filter((v) => v.norm === q);
  if (exact.length === 1) return { resolved: exact[0].canonical, candidates: [] };
  if (exact.length > 1) {
    // Vocab shouldn't hold exact normalized dupes, but if it does, surface them.
    return { candidates: exact.map((v) => v.canonical).slice(0, maxCandidates) };
  }

  // 2. Acronym / alias pre-normalization: if the query is a known alias, retry
  //    the exact match using the alias's full name. The alias target may itself
  //    differ in punctuation from the vocab, so normalize it too.
  const aliasKey = Object.keys(aliases).find((k) => normalizeForMatch(k) === q);
  if (aliasKey) {
    const aliasTarget = normalizeForMatch(aliases[aliasKey]);
    const aliasHit = normVocab.filter((v) => v.norm === aliasTarget);
    if (aliasHit.length === 1) return { resolved: aliasHit[0].canonical, candidates: [] };
    if (aliasHit.length > 1) {
      return { candidates: aliasHit.map((v) => v.canonical).slice(0, maxCandidates) };
    }
    // Alias didn't land on an exact vocab entry; fall through to substring using
    // the alias target as the needle (helps e.g. "Berkeley" -> the UC Berkeley row).
    return substringResolve(aliasTarget, normVocab, maxCandidates);
  }

  // 3. Substring / token resolution against the vocab.
  return substringResolve(q, normVocab, maxCandidates);
}

/**
 * Resolve by containment, ranked so the most specific match wins:
 *   - a vocab entry whose normalized form EQUALS the needle (already handled, but
 *     re-checked here for the alias-target path),
 *   - a whole-word / prefix containment ranks above a bare substring.
 * A single hit resolves; multiple hits return ranked candidates. This never
 * bridges distinct institutions the way word-overlap did: "washington
 * university" as a needle contains-matches "george washington university" and
 * "washington university in st louis" but NOT "university of washington" (the
 * token order differs), and each is returned as its own distinct candidate.
 */
function substringResolve(
  needle: string,
  normVocab: { canonical: string; norm: string }[],
  maxCandidates: number,
): InstitutionResolution {
  const hits = normVocab
    .map((v) => {
      let rank = -1;
      if (v.norm === needle) rank = 3;
      else if (v.norm.startsWith(needle + " ") || v.norm.endsWith(" " + needle)) rank = 2;
      else if (new RegExp(`\\b${escapeRegExp(needle)}\\b`).test(v.norm)) rank = 1;
      else if (v.norm.includes(needle)) rank = 0;
      return { canonical: v.canonical, rank };
    })
    .filter((h) => h.rank >= 0)
    .sort((a, b) => b.rank - a.rank || a.canonical.localeCompare(b.canonical));

  if (hits.length === 0) return { candidates: [] };
  if (hits.length === 1) return { resolved: hits[0].canonical, candidates: [] };

  // If exactly one hit is an exact-normalized match (rank 3), prefer it as
  // resolved even when weaker substrings also matched.
  const exactRank = hits.filter((h) => h.rank === 3);
  if (exactRank.length === 1) return { resolved: exactRank[0].canonical, candidates: [] };

  return { candidates: hits.slice(0, maxCandidates).map((h) => h.canonical) };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
