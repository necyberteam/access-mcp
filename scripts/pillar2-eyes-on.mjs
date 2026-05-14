#!/usr/bin/env node
// Pillar 2 eyes-on — hand-craft a few fields invocations against the POC
// servers (system-status, announcements) and print baseline-vs-projected side
// by side. Run with: node scripts/pillar2-eyes-on.mjs

import { SystemStatusServer } from "../packages/system-status/dist/server.js";
import { AnnouncementsServer } from "../packages/announcements/dist/server.js";

const sys = new SystemStatusServer();
const ann = new AnnouncementsServer();

const ESC = {
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
};

function header(title) {
  console.log(`\n${ESC.bold}${ESC.cyan}━━━ ${title} ━━━${ESC.reset}`);
}

function size(s) {
  return `${(Buffer.byteLength(s, "utf8") / 1024).toFixed(2)} KB`;
}

function topLevelKeys(obj) {
  return Object.keys(obj).sort().join(", ");
}

function preview(obj, lines = 6) {
  const pretty = JSON.stringify(obj, null, 2);
  const split = pretty.split("\n");
  if (split.length <= lines * 2) return pretty;
  return [
    ...split.slice(0, lines),
    `${ESC.dim}  ... [${split.length - lines * 2} lines elided] ...${ESC.reset}`,
    ...split.slice(-lines),
  ].join("\n");
}

async function run(label, server, params) {
  const start = Date.now();
  let result;
  try {
    result = await server["handleToolCall"]({ params });
  } catch (e) {
    console.log(`  ${ESC.yellow}error: ${e.message}${ESC.reset}`);
    return null;
  }
  const elapsed = Date.now() - start;
  const text = result.content?.[0]?.text ?? "";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { _unparseable: text.slice(0, 200) };
  }
  console.log(
    `${ESC.green}${label}${ESC.reset}  ${ESC.dim}(${elapsed}ms, ${size(text)})${ESC.reset}`,
  );
  console.log(`  top-level keys: ${topLevelKeys(parsed)}`);
  if (Array.isArray(parsed.items) && parsed.items.length > 0) {
    console.log(`  items[0] keys:  ${Object.keys(parsed.items[0]).sort().join(", ")}`);
    console.log(`  items.length:   ${parsed.items.length}`);
  }
  console.log(preview(parsed, 4));
  return { parsed, bytes: Buffer.byteLength(text, "utf8") };
}

function delta(baseline, projected, fields) {
  if (!baseline || !projected) return;
  const saved = baseline.bytes - projected.bytes;
  const pct = ((saved / baseline.bytes) * 100).toFixed(1);
  console.log(
    `${ESC.yellow}  → fields=${JSON.stringify(fields)}: saved ${saved} bytes (${pct}%)${ESC.reset}`,
  );
}

async function main() {
  // ── system-status: current outages ──────────────────────────────────────
  header("system-status / get_infrastructure_news (current)");
  const baselineCurrent = await run("baseline (no fields)", sys, {
    name: "get_infrastructure_news",
    arguments: { time: "current" },
  });
  const projCurrent = await run("projected (items[].Subject + total)", sys, {
    name: "get_infrastructure_news",
    arguments: {
      time: "current",
      fields: ["items[].Subject", "items[].severity"],
    },
  });
  delta(baselineCurrent, projCurrent, ["items[].Subject", "items[].severity"]);

  // ── system-status: scheduled (with metadata-only projection) ───────────
  header("system-status / get_infrastructure_news (scheduled — metadata only)");
  const baselineScheduled = await run("baseline (no fields)", sys, {
    name: "get_infrastructure_news",
    arguments: { time: "scheduled" },
  });
  const projScheduledMeta = await run(
    "projected (metadata.aggregations + metadata.pagination)",
    sys,
    {
      name: "get_infrastructure_news",
      arguments: {
        time: "scheduled",
        fields: ["metadata.aggregations", "metadata.pagination"],
      },
    },
  );
  delta(baselineScheduled, projScheduledMeta, [
    "metadata.aggregations",
    "metadata.pagination",
  ]);

  // ── system-status: checkResourceStatus (lookup) ────────────────────────
  header("system-status / get_infrastructure_news (lookup via ids)");
  const baselineCheck = await run("baseline (no fields)", sys, {
    name: "get_infrastructure_news",
    arguments: { ids: ["Anvil", "Delta"] },
  });
  const projCheck = await run(
    "projected (items[].resource_id + items[].status)",
    sys,
    {
      name: "get_infrastructure_news",
      arguments: {
        ids: ["Anvil", "Delta"],
        fields: ["items[].resource_id", "items[].status"],
      },
    },
  );
  delta(baselineCheck, projCheck, [
    "items[].resource_id",
    "items[].status",
  ]);

  // ── system-status: empty projection (just total) ───────────────────────
  header("system-status / get_infrastructure_news (empty fields → total only)");
  await run("projected (fields=[])", sys, {
    name: "get_infrastructure_news",
    arguments: { time: "current", fields: [] },
  });

  // ── announcements: search ──────────────────────────────────────────────
  header("announcements / search_announcements");
  const baselineAnn = await run("baseline (no fields)", ann, {
    name: "search_announcements",
    arguments: { limit: 5 },
  });
  const projAnn = await run(
    "projected (items[].title + items[].published_date + metadata.pagination.has_more)",
    ann,
    {
      name: "search_announcements",
      arguments: {
        limit: 5,
        fields: [
          "items[].title",
          "items[].published_date",
          "metadata.pagination.has_more",
        ],
      },
    },
  );
  delta(baselineAnn, projAnn, [
    "items[].title",
    "items[].published_date",
    "metadata.pagination.has_more",
  ]);

  // ── announcements: nonexistent field (forgiving behavior) ─────────────
  header("announcements / search_announcements — typo in fields (forgiving)");
  await run("projected (with bogus path)", ann, {
    name: "search_announcements",
    arguments: {
      limit: 3,
      fields: ["items[].title", "items[].fancy_nonexistent_field"],
    },
  });

  console.log(`\n${ESC.bold}done.${ESC.reset}\n`);
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
