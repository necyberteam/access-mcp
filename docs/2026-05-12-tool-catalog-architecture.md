# Tool-Catalog Architecture — Spec

**Status:** Working spec. 
**Extends:** [`STANDARDIZATION_RECOMMENDATIONS.md`](./STANDARDIZATION_RECOMMENDATIONS.md) (2025-11-25).
**Relationship to launch:** Lands before Phase 7's measurement window opens. Access-agent consumes Pillar 3 via a `USE_TOOL_DISCOVERY` flag (Pillars 1 + 2 land unconditionally — there is no longer a flagged legacy path in the agent).

## Problem

The tool-calling loop pays the tool-schema cost per iteration, not per query. With 24 tools across 10 servers at ~300 tokens each, every iteration carries ~7.2k tokens of schema before any work. A 5-call query pays 36k tokens on schema redundancy alone.

Response shapes are partway standardized but inconsistent. `UniversalResponse<T> = { total, items }` is defined in `packages/shared/src/types.ts:15` and used by ~6 servers; PR #3 adds `pagination`, `query_relevance`, and `links` as response siblings; three servers (`xdmod`, `system-status`, `jsm`) never adopted the base envelope at all.

## Goals

1. Reduce per-iteration token cost in the tool-calling loop — both schema bloat and response bloat.
2. Finish `STANDARDIZATION_RECOMMENDATIONS.md` adoption.
3. Phase 7 measures the full new architecture.

## Non-goals

- Gateway / consolidated audit logging.
- Code Mode / sandboxed-TS execution.
- Deleting access-agent's `mcp-tool-catalog.json` — the flat-catalog path stays usable when `USE_TOOL_DISCOVERY=false`.
- A2A / AG-UI / WebMCP integration.
- Touching XDMoD's progressive-disclosure metadata tools (`describe_realms` etc.) — only XDMoD's listing tools get the envelope treatment.

---

## The three pillars

### Pillar 1 — Envelope

All MCP servers return the same shape. Target:

```typescript
interface StandardToolResponse<T> extends UniversalResponse<T> {
  // total, items — already exist on UniversalResponse<T>
  metadata?: {
    query?: string;
    filters_applied?: Record<string, unknown>;
    aggregations?: {
      popular_tags?: string[];
      top_resources?: Array<{ name: string; count: number }>;
      counts?: Record<string, number>;
    };
    pagination?: { limit: number; offset: number; has_more: boolean };
    query_relevance?: "exact" | "loose_match";
  };
  documentation?: {
    usage_notes?: string;
    next_steps?: NextStep[];
    related_tools?: string[];
    links?: Record<string, string>;
  };
}
```

Every server gets one migration PR to the target shape — no intermediate sibling-shape deploy. Three of them (`xdmod` listing tools, `system-status`, `jsm`) currently have no envelope at all; their PRs include both the base-envelope adoption and the nested-substructure layout. The other seven already use `UniversalResponse<T>`; their PRs reshape any in-progress siblings (e.g. PR #3's `pagination`, `query_relevance`, `links`) into the `metadata` / `documentation` substructures and add `metadata.aggregations` and `documentation.related_tools`.

### Pillar 2 — `_fields` projection

Optional `_fields?: string[]` parameter on enveloped listing tools. Syntax: dotted/bracketed paths.

```typescript
// Without _fields
{ total: 42, items: [{ name, id, description, url, tags, ... }] }

// With _fields=["items[].name", "items[].url", "total"]
{ total: 42, items: [{ name, url }] }
```

Parser lives in `packages/shared`; tools call `projectFields(result, fields)` between envelope-shaping and serialization. Server-side, before transport — `_fields` saves MCP→agent bytes and LLM tokens, not upstream API bandwidth.

Per-tool opt-in via `supportsFieldProjection: true` in the tool's `getTools()` metadata. Default opt-in is `true` for new listing tools; existing tools opt in deliberately as part of their Wave 2 migration. A tool can opt out if its surface (short, already-summarized responses) makes projection a quality loss.

### Pillar 3 — Discovery meta-server

New `packages/discovery` peer server exposing three tools:

- `list_capabilities(query?, category?, limit?)` — tool names, one-line summaries, server tags. No schemas.
- `describe_tools(names: string[])` — full JSON schemas + example invocations for the named tools.
- `execute_tool(name, args, _fields?)` — uniform dispatch; forwards `_fields` projection.

The access-agent loop registers only these three tools at entry. Typical flow: turn 1 `list_capabilities`, turn 2 `describe_tools` on candidates, turn 3 `execute_tool`. Compared to "24 schemas every turn," this is ~3 schemas (constant) plus the 1–3 schemas the loop chose to describe.

**Catalog source.** Discovery introspects each server's enriched `getTools()` at boot and caches to disk. On per-server introspection failure, falls back to the cached entry. On total first-boot failure, refuses to start (loud failure, not silent degradation). Restart-on-redeploy refreshes naturally.

**Auth.** Inherits the dual model already in `base-server.ts`:

- CILogon OAuth at discovery's `/mcp` endpoint, populating `RequestContext.actingUser` via `verifyAccessToken` (`base-server.ts:335`).
- API-key + `X-Acting-User` / `X-Acting-User-Uid` for inter-server REST proxying down to backends (`base-server.ts:571–574` receive / `738–744` send).

The inbound CILogon token is never forwarded; identity *claims* are re-asserted via the sibling header authenticated by a separate service credential. MCP 2025-06-18 "no token passthrough" satisfied by construction.

**`list_capabilities` defaults.** With no filter, returns a round-robin sample across servers (max 2 per server). XDMoD aggregates into one entry — "XDMoD analytics; use `describe_realms` to start" — with its 4 progressive-disclosure tools surfaced only through `describe_tools(["xdmod"])`.

**Denied tools.** `READ_ONLY` deny-list (access-agent commit `e8b2f12`) filters at source in `list_capabilities`; denied tools never reach the agent.

---

## Migration plan

All work lands in one PR on the existing `feat/listing-urls-in-tool-responses` branch (currently PR #3), with a companion access-agent PR landing at the same time. The two PRs deploy together — no period where the agent is talking to a mix of old-shape and new-shape servers.

**POC before broad propagation.** The first Pillar 1 commits implement the target shape on exactly two servers — `system-status` (the flat → final reshape) and `announcements` (the enveloped → final reshape). These two prove out both reshape patterns. Validate eyes-on: run a small set of `tc-*` questions against the agent talking to just those two reshaped servers, confirm the agent reads the new shape correctly, confirm the new fields (`metadata.aggregations`, `documentation.related_tools`) actually carry useful information. **If the POC surfaces a problem with the target shape, the spec gets revised before Pillar 1 fans out to the remaining 8 servers.**

**Build order on the branch is sequential, pillar by pillar.** Each pillar depends on the prior one being in place:

1. **Pillar 1** — POC the two reshape patterns on `system-status` and `announcements`, validate eyes-on, then propagate across the remaining 8 servers. The three flat servers (`system-status`, `xdmod` listing tools, `jsm`) go through base-envelope adoption and nested layout in one pass; the seven already-enveloped servers get the reshape and add `metadata.aggregations` / `documentation.related_tools`.
2. **Pillar 2** — `_fields` syntax (`items[].name`, etc.) requires the envelope shape that Pillar 1 just established. Add `projectFields` to `packages/shared`, add `supportsFieldProjection` opt-in to each enveloped listing tool, hand-test a few projections.
3. **Pillar 3** — `packages/discovery` is cleanest to build once `execute_tool` has a working `_fields` to forward and once the enriched `getTools()` from Pillar 1 is in place.

The branch currently lands `pagination`, `query_relevance`, and `links` as top-level response siblings. During Pillar 1's POC, those fields are moved under their substructures (`metadata.pagination`, `metadata.query_relevance`, `documentation.links`) instead — same fields, nested location, no intermediate sibling-shape deploy. Andrew's review feedback already addressed on the branch (system-status URL fix, query_relevance bug, events `DESCRIPTION_MAX_CHARS`) carries forward unchanged.

The companion access-agent PR's prompt updates and `USE_TOOL_DISCOVERY` flag develop alongside the MCP work — there's no need to wait until the MCP branch is fully done to start on it.

---

## Quality safety paths

### Pillar 1

Structurally can't regress answer quality — field renames and substructure reshapes change *how* the LLM reads the response, not *what's in it*. Per-server migration PR includes the `tc-*` rubric refresh for that server and a before/after snapshot in the PR body. No flag.

### Pillar 2

The agent has discretion over `_fields` and can over-trim. Three levers:

1. **Regression review against the compare-judge HTML report.** Capture a baseline run of the 40-Q phase3 regression battery on `feat/looping-thinking-agent` @ `70739b8` *before* the migration PR lands. Once the migration PR is ready, re-run the battery against the candidate, generate `python -m src.eval compare-judge` → `python -m src.eval html`, and eyes-on review the per-question diffs. The composite is metadata; the HTML report is the verdict. Specific behavioral regressions (dropped field that mattered, lost citation, worse answer on a `tc-*`) trigger a dial-back of prompt encouragement (lever 3) before merge.
2. **Per-tool participation.** `_fields` advertisement is opt-in via `supportsFieldProjection`. Tools with short summarized responses can opt out — agent isn't told `_fields` is available for them.
3. **Permissive prompt defaults.** Initial framing: "When you need only specific fields from a large response, you may pass `_fields` to reduce payload size." Dial-back states: "Rarely use `_fields`; full response except for known-large lists" → silent (parameter still works for hand-crafted calls).

### Pillar 3

`USE_TOOL_DISCOVERY=false` is the off-ramp. Verify it before flipping prod.

- **Pre-flight regression review.** Run the 40-Q phase3 battery against the discovery branch with `USE_TOOL_DISCOVERY=false`, generate the compare-judge HTML against the pre-Pillar-3 baseline, eyes-on review. The off-path must look behaviorally identical, not just composite-comparable. If any question's answer has shifted, the off-ramp is theatre.
- Loud-failure on first-boot introspection failure (above).
- `READ_ONLY` deny-list passthrough verified in unit test on the discovery package.

---

## What goes in access-agent

One flag:

```
USE_TOOL_DISCOVERY=false  # opt into discovery meta-tools at loop entry
```

- `true`: `src/agent/nodes/tool_calling_loop.py` registers only `list_capabilities` + `describe_tools` + `execute_tool` at entry. Loop's system prompt gets a paragraph teaching find→describe→execute. `execute_tool` forwards `_fields`.
- `false`: same loop, flat catalog of 24 tools as today.

Pillars 1 and 2 land unconditionally — there is no flag for the envelope or `_fields`. The agent picks up the new response shapes whenever each MCP server's migration PR deploys. Per-server eval rubric refreshes ride with that server's migration PR.

---

## Phase 7 evidence-package shape

Two arms:

1. **Pre-pillar baseline** — `feat/looping-thinking-agent` @ `70739b8`, current 24-tool flat catalog, no envelope changes, no `_fields`, `USE_TOOL_DISCOVERY=false`. Captured once as the reference HTML report.
2. **Post-pillar candidate** — same loop, against enveloped servers (Pillars 1 + 2 landed) with `USE_TOOL_DISCOVERY=true` (Pillar 3 in the call path).

The compare-judge HTML between these two runs is the Phase 7 evidence. If the post-pillar candidate is ambiguous or worse, the rollback options are tiered:

- **Discovery only:** flip `USE_TOOL_DISCOVERY=false` and redeploy access-agent. Pillars 1 + 2 (envelope + `_fields`) still ship.
- **`_fields` over-trim:** dial back the agent prompt's `_fields` encouragement, or set `supportsFieldProjection: false` on the offending tools.
- **Envelope reshape regression:** revert the offending server's migration PR, redeploy that MCP server.

There is no rollback for "go back to the legacy chain" because that code is gone.

---

## Breakdown

Executed sequentially on the branch:

- **POC first** — Implement Pillar 1's target shape on `system-status` and `announcements` only. Validate eyes-on; revise the spec if the POC surfaces problems.
- **Pillar 1** — Move the in-flight sibling fields (`pagination`, `query_relevance`, `links`) under `metadata` / `documentation`. Bring the three flat servers (`system-status`, `xdmod` listing tools, `jsm`) onto the base envelope. Add `metadata.aggregations` and `documentation.related_tools`. Ship the shared envelope helper in `packages/shared`.
- **Pillar 2** — Add `_fields` projection: `projectFields` parser in `packages/shared`, per-tool `supportsFieldProjection` opt-in, wire the projection step between envelope-shaping and serialization.
- **Pillar 3** — Add `packages/discovery`: `list_capabilities`, `describe_tools`, `execute_tool`; introspection of `getTools()` + disk cache; OAuth at `/mcp`; API-key + `X-Acting-User` proxying to backends.
- **Companion access-agent PR** — Prompt updates for the new shape and `_fields` usage; `USE_TOOL_DISCOVERY` flag in config; `tc-*` rubric refreshes per server.

## Risks

1. **Scope creep across three pillars.** Mitigation: pillars have independent value — if Pillar 3 slips, Pillars 1 + 2 still ship.
2. **Per-server design variance.** Some tools may not fit the listing envelope cleanly. Mitigation: the Pillar 1 commit set explicitly lists every server's disposition; "this server's tools stay out of the envelope because X" is recorded, not forgotten.
3. **Category taxonomy in `list_capabilities` becomes load-bearing.** Once agents learn category names, renames are real (though LLM-tolerable) churn. Server names are the default; taxonomy is reviewed at the Pillar 3 PR.

---

## Open decisions

Items not yet fully locked:

1. **HTML-report regression review as the only Pillar 2 / Pillar 3 gate, with no composite-threshold backstop.** Earlier launch-track gates (no-classify) used a 0.05 absolute composite margin; this spec deliberately doesn't. The judge composite is metadata; the HTML report + eyes-on review is the verdict.
2. **XDMoD as one `list_capabilities` entry.** Alternative: surface all 4 progressive-disclosure tools individually.
3. **`_fields` per-tool opt-in defaulting to `true` for new listing tools.** Alternative: explicit opt-in per tool, with a checklist item on every new tool PR.

---

## Next

- Baseline run: 40-Q phase3 regression battery on `feat/looping-thinking-agent` @ `70739b8`. The HTML report is the regression reference.
- Continue on `feat/listing-urls-in-tool-responses` with the target nested shape as the new goal — first commits are the two-server POC (`system-status` + `announcements`); validate eyes-on; then expand across the remaining servers and add `packages/discovery`.
