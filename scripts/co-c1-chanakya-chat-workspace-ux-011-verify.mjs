/**
 * CO-C1-CHANAKYA-CHAT-WORKSPACE-UX-011
 * UX-only verifier: layout, scroll, Markdown, proposal accordion, responsive drawer.
 * Does not authorise streaming / backend / schema / progressive-response changes.
 *
 * Dirtiness vs HEAD in files outside the Refinement 11 manifest is not an R11 failure.
 * Dormant progressive-response files may remain on disk; active references are failures.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import {
  parseChanakyaSafeMarkdown,
  stripUnsafeHtml,
  isAllowedChanakyaInternalHref,
} from "../src/lib/chanakya-chat-ux/safe-markdown.ts";
import {
  isChanakyaChatNearBottom,
  restoreChanakyaChatScrollAnchor,
} from "../src/lib/chanakya-chat-ux/auto-scroll.ts";
import { buildChanakyaProposalPresentation } from "../src/lib/chanakya-chat-ux/proposal-presentation.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const R11_TRANSFER_MANIFEST = [
  "scripts/co-c1-chanakya-chat-workspace-ux-011-verify.mjs",
  "src/lib/chanakya-chat-ux/auto-scroll.ts",
  "src/lib/chanakya-chat-ux/safe-markdown.ts",
  "src/lib/chanakya-chat-ux/proposal-presentation.ts",
  "src/components/catalyst-one/user-home-dashboard/chanakya-safe-markdown.tsx",
  "src/components/catalyst-one/user-home-dashboard/chanakya-proposal-response.tsx",
  "src/components/catalyst-one/user-home-dashboard/chanakya-inapp-conversation-panel.tsx",
  "src/components/catalyst-one/user-home-dashboard/chanakya-intelligence-mode.tsx",
  "src/components/catalyst-one/user-home-dashboard/chanakya-conversational-workspace.tsx",
  "src/components/catalyst-one/user-home-dashboard/user-home-dashboard.tsx",
  "src/layouts/dashboard-layout.tsx",
  "src/app/(dashboard)/layout.tsx",
];

const R11_ACTIVE_GRAPH = [
  ...R11_TRANSFER_MANIFEST,
  "src/lib/chanakya-chat-ux/index.ts",
];

const R11_APPLICATION_FILES = R11_ACTIVE_GRAPH.filter(
  (rel) => rel !== "scripts/co-c1-chanakya-chat-workspace-ux-011-verify.mjs",
);

const PROTECTED_PREEXISTING = [
  "src/lib/chanakya-inapp-conversation/run-turn.ts",
  "src/lib/chanakya-inapp-conversation/client.ts",
  "prisma/schema.prisma",
];

const ARCHITECTURE_OUT_OF_SCOPE = [
  "src/app/api/chanakya/conversation/stream/route.ts",
  "src/lib/chanakya-conversation-intelligence/generate-answer.ts",
  "src/lib/chanakya-conversation-intelligence/model-port.ts",
];

const DORMANT_PROGRESSIVE_FILES = [
  "src/lib/chanakya-chat-ux/stream-decode.ts",
  "src/lib/chanakya-chat-ux/progress-stages.ts",
  "src/lib/chanakya-chat-ux/instrumentation.ts",
];

const ALLOWED_CLIENT_IMPORTS = new Set([
  "postChanakyaInappConversationTurn",
  "postChanakyaMessageFeedback",
  "streamChanakyaInappConversationTurn",
  "createChanakyaConversationSession",
  "listChanakyaConversationSessions",
  "loadChanakyaConversationSession",
]);

const PROHIBITED_ACTIVE_SYMBOLS = [
  "onProgress",
  "progressLabel",
  "CHANAKYA_CHAT_PROGRESS_LABELS",
  "ChanakyaChatProgressEvent",
  "ChanakyaChatUxMetric",
  "ttfTokenMs",
  "createChanakyaChatUxTimer",
];

const PROHIBITED_MODULE_MARKERS = [
  "chanakya-chat-ux/stream-decode",
  "chanakya-chat-ux/progress-stages",
  "chanakya-chat-ux/instrumentation",
  "./stream-decode",
  "./progress-stages",
  "./instrumentation",
];

const BARREL_FORBIDDEN_EXPORTS = [
  "stream-decode",
  "progress-stages",
  "instrumentation",
  "appendChanakyaStreamChunk",
  "parseChanakyaSseBuffer",
  "decodeChanakyaUtf8Chunk",
  "createChanakyaChatUxTimer",
  "chanakyaChatProgressLabel",
  "progressStagesForTurn",
];

let failed = 0;
const sectionFails = {
  ux: 0,
  prohibited: 0,
  protected: 0,
  dormant: 0,
  architecture: 0,
};

function ok(section, msg) {
  console.log(`PASS  [${section}] ${msg}`);
}
function fail(section, msg) {
  failed += 1;
  sectionFails[section] += 1;
  console.error(`FAIL  [${section}] ${msg}`);
}
function note(section, msg) {
  console.log(`NOTE  [${section}] ${msg}`);
}

function gitDiff(rel) {
  return execSync(`git diff -- HEAD -- "${rel}"`, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function namedImportsFrom(source, moduleSpec) {
  const names = new Set();
  const re = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']([^"']+)["']/g;
  let match;
  while ((match = re.exec(source))) {
    if (!match[2].includes(moduleSpec)) continue;
    for (const part of match[1].split(",")) {
      const name = part.replace(/\s+as\s+\w+/g, "").replace(/\btype\b/g, "").trim();
      if (name) names.add(name);
    }
  }
  return names;
}

function importsModule(source, marker) {
  return (
    source.includes(`from "${marker}`) ||
    source.includes(`from '${marker}`) ||
    source.includes(`from "${marker.replace(/^@\//, "")}`) ||
    new RegExp(`from\\s+["'][^"']*${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(source)
  );
}

const workspace = read(
  "src/components/catalyst-one/user-home-dashboard/chanakya-conversational-workspace.tsx",
);
const panel = read(
  "src/components/catalyst-one/user-home-dashboard/chanakya-inapp-conversation-panel.tsx",
);
const layout = read("src/layouts/dashboard-layout.tsx");
const dash = read(
  "src/components/catalyst-one/user-home-dashboard/user-home-dashboard.tsx",
);
const markdownUi = read(
  "src/components/catalyst-one/user-home-dashboard/chanakya-safe-markdown.tsx",
);
const proposalUi = read(
  "src/components/catalyst-one/user-home-dashboard/chanakya-proposal-response.tsx",
);
const chatUi = `${panel}\n${proposalUi}`;
const applicationSource = R11_APPLICATION_FILES.map((rel) => read(rel)).join("\n");

console.log("=== UX ACCEPTANCE CHECKS ===");

// --- Viewport / shell ---
if (workspace.includes('data-chanakya-chat-workspace="011"') && workspace.includes("overflow-hidden")) {
  ok("ux", "outer workspace overflow hidden");
} else fail("ux", "outer workspace overflow hidden");

if (layout.includes("isChanakyaChatDesk") && layout.includes("overflow-hidden")) {
  ok("ux", "dashboard shell locks outer page scroll for CHANAKYA chat");
} else fail("ux", "dashboard shell locks outer page scroll");

if (dash.includes("data-chanakya-chat-shell") && dash.includes('"011"') && dash.includes("overflow-hidden")) {
  ok("ux", "intelligence mode fills remaining viewport");
} else fail("ux", "intelligence mode fills remaining viewport");

// --- Left rail ---
if (
  workspace.includes('data-chanakya-chat-rail="011"') &&
  workspace.includes("overflow-y-auto") &&
  (workspace.includes("md:w-[18.5rem]") || workspace.includes("lg:w-[20rem]") || workspace.includes("CHANAKYA_CHAT_RAIL_WIDTH_CLASS"))
) {
  ok("ux", "left rail stationary with internal overflow (~280–320px)");
} else fail("ux", "left rail stationary / width");

if (workspace.includes('data-chanakya-chat-rail-drawer="011"') && workspace.includes("md:hidden")) {
  ok("ux", "mobile/tablet left rail drawer");
} else fail("ux", "mobile/tablet left rail drawer");

if (workspace.includes("Escape") || workspace.includes('"Escape"')) {
  ok("ux", "Escape closes mobile rail");
} else fail("ux", "Escape closes mobile rail");

if (workspace.includes("Open chat menu") && workspace.includes(".focus(")) {
  ok("ux", "Escape/close restores focus to Open chat menu");
} else fail("ux", "Escape/close restores focus to Open chat menu");

if (workspace.includes("aria-expanded") && workspace.includes("Suggested Questions")) {
  ok("ux", "suggested question groups are collapsible");
} else fail("ux", "suggested question groups collapsible");

if (workspace.includes("New Chat") && workspace.includes("createChanakyaConversationSession")) {
  ok("ux", "New Chat control uses existing session create");
} else fail("ux", "New Chat control uses existing session create");

if (
  workspace.includes("Search chat history") &&
  workspace.includes("listChanakyaConversationSessions") &&
  workspace.includes("loadChanakyaConversationSession")
) {
  ok("ux", "history search and session restore remain wired");
} else fail("ux", "history search and session restore remain wired");

// --- Right chat: messages + composer ---
if (
  panel.includes('data-chanakya-chat-messages="011"') &&
  panel.includes("overflow-y-auto") &&
  panel.includes('data-chanakya-chat-composer="011"') &&
  panel.includes("shrink-0")
) {
  ok("ux", "right message region scrolls independently; composer pinned");
} else fail("ux", "right messages / composer layout");

if (panel.includes("safe-area-inset-bottom") || panel.includes("env(safe-area-inset-bottom)")) {
  ok("ux", "composer respects safe-area inset");
} else fail("ux", "composer safe-area inset");

if (panel.includes("scrollIntoView")) {
  fail("ux", "panel still uses page-level scrollIntoView");
} else ok("ux", "auto-scroll stays inside message region (no scrollIntoView)");

if (panel.includes("followLatest") && panel.includes("isChanakyaChatNearBottom")) {
  ok("ux", "auto-scroll only when near bottom / followLatest");
} else fail("ux", "auto-scroll near-bottom gating");

if (
  panel.includes("Jump to latest") ||
  panel.includes("CHANAKYA_CHAT_JUMP_TO_LATEST_LABEL") ||
  panel.includes("Jump to Latest")
) {
  ok("ux", "Jump to Latest control");
} else fail("ux", "Jump to Latest control");

{
  const el = { scrollHeight: 1000, scrollTop: 900, clientHeight: 100 };
  if (isChanakyaChatNearBottom(el, 96) && !isChanakyaChatNearBottom({ ...el, scrollTop: 100 }, 96)) {
    ok("ux", "near-bottom helper");
  } else fail("ux", "near-bottom helper");
}

{
  const el = { scrollHeight: 500, scrollTop: 100 };
  restoreChanakyaChatScrollAnchor(el, 400);
  if (el.scrollTop === 200) ok("ux", "scroll-anchor preservation helper");
  else fail("ux", "scroll-anchor preservation helper");
}

if (panel.includes("Enter to send") && panel.includes("Shift+Enter")) {
  ok("ux", "Enter/Shift+Enter composer convention");
} else fail("ux", "Enter/Shift+Enter composer convention");

if (panel.includes('aria-label="Ask CHANAKYA"') && panel.includes("Start dictation") && panel.includes("Send question to CHANAKYA")) {
  ok("ux", "composer accessible labels");
} else fail("ux", "composer accessible labels");

if (panel.includes("streamChanakyaInappConversationTurn") && panel.includes("postChanakyaInappConversationTurn")) {
  ok("ux", "existing conversation stream/fallback client remains");
} else fail("ux", "existing conversation stream/fallback client remains");

// --- Safe Markdown ---
if (/dangerouslySetInnerHTML\s*=/.test(markdownUi)) {
  fail("ux", "safe Markdown uses dangerouslySetInnerHTML");
} else ok("ux", "safe Markdown avoids dangerouslySetInnerHTML");

if (panel.includes("ChanakyaSafeMarkdown") && markdownUi.includes("data-chanakya-markdown")) {
  ok("ux", "assistant responses render via safe Markdown");
} else fail("ux", "assistant responses render via safe Markdown");

{
  const md = parseChanakyaSafeMarkdown(
    "## Heading\n\n**Bold** and *italic*\n\n- One\n- Two\n\n1. A\n2. B\n\n> Quote\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n`code`\n\n---\n",
  );
  const types = new Set(md.map((b) => b.type));
  if (
    types.has("heading") &&
    types.has("paragraph") &&
    types.has("ul") &&
    types.has("ol") &&
    types.has("table") &&
    types.has("blockquote") &&
    types.has("hr")
  ) {
    ok("ux", "Markdown supports headings/lists/tables/quotes/separators");
  } else fail("ux", "Markdown block coverage");
}

{
  const cleaned = stripUnsafeHtml('<script>alert(1)</script>**Safe** <img onerror=alert(1) src=x>');
  if (!cleaned.toLowerCase().includes("script") && !cleaned.includes("onerror") && cleaned.includes("**Safe**")) {
    ok("ux", "unsafe HTML stripped");
  } else fail("ux", "unsafe HTML stripped");
}

if (
  isAllowedChanakyaInternalHref("/credit-workbench?opportunityId=x") &&
  !isAllowedChanakyaInternalHref("https://evil.example") &&
  !isAllowedChanakyaInternalHref("//evil.example")
) {
  ok("ux", "internal link allowlist");
} else fail("ux", "internal link allowlist");

// --- Proposal presentation ---
const proposalLib = read("src/lib/chanakya-chat-ux/proposal-presentation.ts");
if (
  proposalUi.includes("aria-expanded") &&
  proposalUi.includes('data-chanakya-proposal-response="011"') &&
  proposalLib.includes("Executive Summary") &&
  proposalLib.includes("Borrower/Promoter Profile") &&
  proposalLib.includes("Missing Information") &&
  proposalLib.includes("Advisory Recommendation")
) {
  ok("ux", "proposal accordion sections present");
} else fail("ux", "proposal accordion sections");

if (
  chatUi.includes("Copy") &&
  chatUi.includes("Preview") &&
  chatUi.includes("Download") &&
  chatUi.includes("Open Proposal Workspace")
) {
  ok("ux", "proposal actions remain attached");
} else fail("ux", "proposal actions attached");

{
  const withoutComments = chatUi
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  if (withoutComments.includes("Save as Draft")) {
    fail("ux", "Save as Draft must remain deferred");
  } else ok("ux", "Save as Draft absent");
}

{
  const draft = {
    draftId: "draft_ux_011",
    opportunityId: "opp_1",
    opportunityNumber: "RC-OPP-1",
    productName: "Home Loan",
    loanAmount: 5000000,
    status: "draft",
    emailOutboundOwner: "catalyst_one",
    readOnly: true,
    autoSendForbidden: true,
    sections: [
      {
        id: "executive_summary",
        title: "Executive Summary",
        body: "Borrower seeks refinance.",
        evidenceSources: ["transaction"],
        included: true,
      },
      {
        id: "key_concerns",
        title: "Concerns",
        body: "Banking statements incomplete.",
        evidenceSources: ["documents"],
        included: true,
      },
      {
        id: "pending_information",
        title: "Pending",
        body: "GST returns missing.",
        evidenceSources: ["documents"],
        included: true,
      },
    ],
    fullText: "## Executive Summary\nBorrower seeks refinance.",
    evidence: [
      { id: "e1", source: "transaction", label: "Customer", value: "Acme Pvt Ltd", available: true },
    ],
    gaps: ["GST returns"],
    generatedAt: new Date().toISOString(),
  };
  const presentation = buildChanakyaProposalPresentation(draft);
  const exec = presentation.sections.find((s) => s.id === "executive");
  const missing = presentation.sections.find((s) => s.id === "missing");
  if (exec?.defaultOpen && missing?.defaultOpen) {
    ok("ux", "Executive Summary and highest-priority section default open");
  } else fail("ux", "proposal default-open sections");
}

// --- PII / read-only ---
if (panel.includes("CHANAKYA_PHASE1_READ_ONLY_INDICATOR") || panel.includes("Read-only")) {
  ok("ux", "read-only advisory indicator");
} else fail("ux", "read-only advisory indicator");

if (/(type=\"email\"|mailto:|tel:)/.test(panel) || /@gmail\.com|mobile\s*\+91/i.test(panel)) {
  fail("ux", "panel appears to expose email/mobile PII controls");
} else ok("ux", "no email/mobile PII exposed in chat chrome");

console.log("\n=== PROHIBITED ACTIVE REFERENCES ===");

for (const rel of R11_TRANSFER_MANIFEST) {
  if (!exists(rel)) fail("prohibited", `missing transferred file ${rel}`);
  else ok("prohibited", `manifest present ${path.basename(rel)}`);
}

if (!exists("src/lib/chanakya-chat-ux/index.ts")) {
  fail("prohibited", "cleaned barrel missing");
} else ok("prohibited", "cleaned barrel present");

{
  const hits = [];
  for (const symbol of PROHIBITED_ACTIVE_SYMBOLS) {
    if (applicationSource.includes(symbol)) hits.push(symbol);
  }
  for (const marker of PROHIBITED_MODULE_MARKERS) {
    if (applicationSource.includes(marker)) hits.push(marker);
  }
  if (hits.length) fail("prohibited", `transferred UX graph contains ${hits.join(", ")}`);
  else ok("prohibited", "no progressive status/timing/chunk-decode symbols in transferred UX graph");
}

for (const rel of R11_APPLICATION_FILES) {
  try {
    const diff = gitDiff(rel);
    if (!diff) {
      ok("prohibited", `${path.basename(rel)} has no progressive tokens in R11 diff`);
      continue;
    }
    const hits = [...PROHIBITED_ACTIVE_SYMBOLS, ...PROHIBITED_MODULE_MARKERS].filter((token) =>
      diff.includes(token),
    );
    if (hits.length) fail("prohibited", `${rel} R11 diff introduces ${hits.join(", ")}`);
    else ok("prohibited", `${path.basename(rel)} R11 diff has no progressive tokens`);
  } catch (error) {
    fail("prohibited", `could not inspect R11 diff for ${rel}: ${error.message}`);
  }
}

{
  const clientNames = namedImportsFrom(applicationSource, "chanakya-inapp-conversation/client");
  const unexpected = [...clientNames].filter((name) => !ALLOWED_CLIENT_IMPORTS.has(name));
  if (unexpected.length) {
    fail("prohibited", `transferred UX imports unexpected client APIs: ${unexpected.join(", ")}`);
  } else {
    ok("prohibited", "client imports stay on existing session/stream APIs");
  }
}

if (panel.includes("onProgress") || panel.includes("progressLabel") || panel.includes("Planning next move")) {
  fail("prohibited", "panel introduces progressive operational status UX");
} else ok("prohibited", "panel does not add progressive operational status messages");

console.log("\n=== PROTECTED-FILE SCOPE ===");

for (const rel of PROTECTED_PREEXISTING) {
  if (R11_TRANSFER_MANIFEST.includes(rel)) {
    fail("protected", `${rel} must not be in the Refinement 11 transfer manifest`);
    continue;
  }
  ok("protected", `${path.basename(rel)} is outside the R11 transfer manifest`);

  if (!exists(rel)) {
    fail("protected", `missing expected baseline file ${rel}`);
    continue;
  }

  try {
    const diff = gitDiff(rel);
    if (diff) {
      note("protected", `${rel} differs from HEAD (pre-existing dirt — not an R11 failure)`);
    } else {
      note("protected", `${rel} matches HEAD`);
    }
  } catch (error) {
    fail("protected", `could not inspect ${rel}: ${error.message}`);
  }

  const marker = rel.replace(/\\/g, "/").replace(/^src\//, "@/").replace(/\.ts$/, "");
  const imported = importsModule(applicationSource, rel) || importsModule(applicationSource, marker);
  if (rel.endsWith("client.ts")) {
    if (imported) {
      ok(
        "protected",
        "client.ts is referenced only through existing session/stream APIs (not transferred; progressive APIs checked separately)",
      );
    } else {
      fail("protected", "transferred UX lost the existing conversation client integration");
    }
  } else if (imported) {
    fail("protected", `transferred UX files import ${rel}`);
  } else {
    ok("protected", `transferred UX files do not import ${path.basename(rel)}`);
  }
}

{
  const runTurnImported = /chanakya-inapp-conversation\/run-turn/.test(applicationSource);
  if (runTurnImported) fail("protected", "transferred UX imports run-turn.ts");
  else ok("protected", "no run-turn import from transferred UX");
}

{
  const prismaHits = [];
  if (/from\s+["']@prisma\/client["']/.test(applicationSource)) prismaHits.push("@prisma/client");
  if (/prisma\/schema\.prisma/.test(applicationSource)) prismaHits.push("schema.prisma");
  if (/prisma\s+migrate/.test(applicationSource)) prismaHits.push("prisma migrate");
  if (prismaHits.length) fail("protected", `transferred UX depends on ${prismaHits.join(", ")}`);
  else ok("protected", "transferred UX does not require schema or migration changes");
}

console.log("\n=== DORMANT-FILE STATUS ===");

for (const rel of DORMANT_PROGRESSIVE_FILES) {
  if (exists(rel)) {
    note("dormant", `${rel} remains on disk as required (existence is not a failure)`);
  } else {
    note("dormant", `${rel} is absent (allowed; do not recreate)`);
  }

  const stem = path.basename(rel, ".ts");
  const imported = R11_APPLICATION_FILES.some((file) => {
    const source = read(file);
    return (
      source.includes(`chanakya-chat-ux/${stem}`) ||
      source.includes(`./${stem}`) ||
      source.includes(`from "./${stem}"`)
    );
  });
  if (imported) fail("dormant", `transferred UX imports dormant ${stem}`);
  else ok("dormant", `no transferred UX import of ${stem}`);
}

{
  const barrel = read("src/lib/chanakya-chat-ux/index.ts");
  const exported = BARREL_FORBIDDEN_EXPORTS.filter((token) => barrel.includes(token));
  if (exported.length) fail("dormant", `cleaned barrel exports ${exported.join(", ")}`);
  else ok("dormant", "cleaned barrel does not export stream-decode / progress-stages / instrumentation");
}

{
  const uiFns = [
    "appendChanakyaStreamChunk",
    "parseChanakyaSseBuffer",
    "decodeChanakyaUtf8Chunk",
    "createChanakyaChatUxTimer",
    "chanakyaChatProgressLabel",
    "progressStagesForTurn",
  ];
  const invoked = uiFns.filter((fn) => applicationSource.includes(fn));
  if (invoked.length) fail("dormant", `active R11 UI invokes ${invoked.join(", ")}`);
  else ok("dormant", "active R11 UI does not invoke dormant progressive-response functions");
}

console.log("\n=== ARCHITECTURE PRESERVATION ===");

for (const rel of ARCHITECTURE_OUT_OF_SCOPE) {
  if (!exists(rel)) {
    fail("architecture", `missing expected baseline file ${rel}`);
    continue;
  }
  ok("architecture", `baseline present ${path.basename(rel)}`);
  try {
    const diff = gitDiff(rel);
    if (diff) {
      note("architecture", `${rel} differs from HEAD (unrelated dirt — not scored as R11 unless UX imports it)`);
    } else {
      ok("architecture", `unchanged ${path.basename(rel)}`);
    }
  } catch (error) {
    fail("architecture", `could not inspect ${rel}: ${error.message}`);
  }
  if (importsModule(applicationSource, rel) || applicationSource.includes(rel.replace(/^src\//, "@/").replace(/\.ts$/, ""))) {
    fail("architecture", `transferred UX imports out-of-scope ${rel}`);
  } else {
    ok("architecture", `transferred UX does not import ${path.basename(rel)}`);
  }
}

if (/\/api\/chanakya\/conversation\/stream/.test(applicationSource) && !panel.includes("streamChanakyaInappConversationTurn")) {
  fail("architecture", "transferred UX references the stream route directly");
} else {
  ok("architecture", "no new backend/API/Prisma dependency in transferred UX");
}

console.log("\n--- section summary ---");
console.log(`UX acceptance checks          ${sectionFails.ux === 0 ? "PASS" : `FAIL (${sectionFails.ux})`}`);
console.log(`Prohibited active references  ${sectionFails.prohibited === 0 ? "PASS" : `FAIL (${sectionFails.prohibited})`}`);
console.log(`Protected-file scope          ${sectionFails.protected === 0 ? "PASS" : `FAIL (${sectionFails.protected})`}`);
console.log(`Dormant-file status           ${sectionFails.dormant === 0 ? "PASS" : `FAIL (${sectionFails.dormant})`}`);
console.log(`Architecture preservation     ${sectionFails.architecture === 0 ? "PASS" : `FAIL (${sectionFails.architecture})`}`);

if (failed > 0) {
  console.error(`\nCO-C1-CHANAKYA-CHAT-WORKSPACE-UX-011 FAILED (${failed})`);
  process.exit(1);
}
console.log("\nCO-C1-CHANAKYA-CHAT-WORKSPACE-UX-011 PASSED");
