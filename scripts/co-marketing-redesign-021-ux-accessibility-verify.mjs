/**
 * CO-MARKETING-REDESIGN-021 — UX consistency, accessibility, responsiveness, performance.
 * Source and helper checks only. No send, cron, Prisma apply, commit, or deploy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustInclude(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

const pkg = read("package.json");
const gates = read("scripts/co-marketing-redesign-pre-staging-gates.mjs");
const safety = read("src/constants/enterprise-marketing-engine/safety.ts");
const cronSrc = read("src/lib/enterprise-marketing-engine/execution/cron-activation.ts");
const schema = read("prisma/schema.prisma");
const executionConst = read("src/constants/enterprise-marketing-engine/execution.ts");
const builderPage = read("src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx");
const permLib = read("src/lib/enterprise-marketing-engine/permissions.ts");
const monitoring010 = read("src/lib/enterprise-marketing-engine/monitoring.ts");
const explorer010 = read("src/lib/enterprise-marketing-engine/recipient-explorer.ts");
const evaluateSrc = read("src/lib/enterprise-marketing-engine/qualification/evaluate.ts");
const inboxSrc = read("src/lib/enterprise-marketing-engine/qualification/inbox-boundary.ts");
const eligibility = read("src/constants/enterprise-marketing-engine/whatsapp-delivery.ts");
const vercel = read("vercel.json");
const uxConst = read("src/constants/enterprise-marketing-engine/ux.ts");
const dataSourceConst = read("src/constants/enterprise-marketing-engine/data-source.ts");
const monitoringConst = read("src/constants/enterprise-marketing-engine/campaign-monitoring.ts");
const altSrc = read("src/lib/enterprise-marketing-engine/asset-alt-text.ts");
const paginationSrc = read("src/lib/enterprise-marketing-engine/ux-pagination.ts");
const css = read("src/styles/marketing-command-centre.css");
const veCss = read("src/styles/marketing-visual-editor.css");
const navUi = read("src/components/catalyst-one/admin/marketing/marketing-module-nav.tsx");
const registryUi = read("src/components/catalyst-one/admin/marketing/marketing-campaign-registry-panel.tsx");
const assetsUi = read("src/components/catalyst-one/admin/marketing/marketing-assets-panel.tsx");
const monitoringUi = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-monitoring-workspace.tsx",
);
const editorUi = read("src/components/catalyst-one/admin/marketing/marketing-visual-email-editor.tsx");
const pagerUi = read("src/components/catalyst-one/admin/marketing/marketing-ux-pagination.tsx");

mustInclude(pkg, "verify:co-marketing-redesign-021");
mustInclude(gates, "verify:co-marketing-redesign-021");
mustInclude(safety, "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false");
mustInclude(safety, "ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false");
mustInclude(safety, 'ENTERPRISE_MARKETING_HANDOFF_MODE ?? "fixture"');
mustInclude(safety, "ENTERPRISE_MARKETING_MASS_HANDOFF_ENABLED = false");
mustInclude(cronSrc, "MARKETING_PACING_CRON_REGISTERED = false");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_SIZE = 100");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_INTERVAL_MS = 60 * 60 * 1000");
assert.doesNotMatch(schema, /model\s+Lead\b/);
assert.doesNotMatch(schema, /model\s+MarketingProspect\b/);
assert.doesNotMatch(builderPage, /test_send/);
assert.doesNotMatch(builderPage, /run_test_batch/);
assert.doesNotMatch(builderPage, /run_next_batch/);
mustInclude(monitoring010, 'unavailableMarketingMetric("Not connected")');
mustInclude(explorer010, "maskMarketingRecipientEmail");
mustInclude(evaluateSrc, 'intent === "open" || input.intent === "click"');
mustInclude(inboxSrc, "openClickDoesNotCreateContact");
mustInclude(eligibility, "enabled: true");
assert.doesNotMatch(vercel, /marketing-pacing/);

const adminDefault = permLib.slice(
  permLib.indexOf("const ADMIN_DEFAULT"),
  permLib.indexOf("export function resolveMarketingPermissions"),
);
assert.equal(adminDefault.includes("CAMPAIGN_APPROVE"), false);
assert.equal(adminDefault.includes("CAMPAIGN_SCHEDULE"), false);
assert.equal(adminDefault.includes("CAMPAIGN_RUN"), false);
assert.equal(adminDefault.includes("CAMPAIGN_STOP"), false);
assert.equal(adminDefault.includes("CAMPAIGN_RETRY"), false);

mustInclude(uxConst, "MARKETING_REGISTRY_PAGE_SIZE = 25");
mustInclude(uxConst, "MARKETING_ASSET_LIBRARY_PAGE_SIZE = 24");
mustInclude(uxConst, "MARKETING_UX_MAX_CLIENT_ROWS = 100");
mustInclude(uxConst, "mobile: 390");
mustInclude(uxConst, "tablet: 768");
mustInclude(uxConst, "laptop: 1366");
mustInclude(uxConst, "desktop: 1920");
mustInclude(dataSourceConst, "MARKETING_SHEETS_PREVIEW_MAX_ROWS = 20");
mustInclude(monitoringConst, "MARKETING_CAMPAIGN_RECIPIENT_PAGE_SIZE = 50");
mustInclude(altSrc, "assertMarketingImageAltTextForApproval");
mustInclude(paginationSrc, "paginateMarketingCollection");
mustInclude(paginationSrc, "Math.min(Math.max(1, pageSize), 100)");
mustInclude(css, "prefers-reduced-motion");
mustInclude(css, ".mkt-skip-link");
mustInclude(css, "textarea:focus-visible");
mustInclude(veCss, "prefers-reduced-motion");
mustInclude(veCss, ".mkt-ve-desktop-notice");
mustInclude(navUi, "aria-current");
mustInclude(navUi, "MARKETING_UX_SKIP_LINK_LABEL");
mustInclude(navUi, 'href="#mkt-main"');
mustInclude(navUi, "mkt-module-nav-shell");
mustInclude(css, "flex-wrap: nowrap");
mustInclude(css, ".mkt-module-nav-shell");
assert.doesNotMatch(css, /\.mkt-module-nav\s*\{[^}]*flex-wrap:\s*wrap/s);
mustInclude(builderPage, "mkt-builder-progress-status");
mustInclude(builderPage, "aria-current={item.number === step ? \"step\" : undefined}");
mustInclude(registryUi, "paginateMarketingCollection");
mustInclude(registryUi, "MarketingUxPagination");
mustInclude(assetsUi, "paginateMarketingCollection");
mustInclude(assetsUi, "alt={a.altText || a.name}");
mustInclude(assetsUi, "htmlFor=\"mkt-asset-alt\"");
mustInclude(monitoringUi, "pageSize");
mustInclude(monitoringUi, "<caption");
mustInclude(monitoringUi, "mkt-recipient-cards");
mustInclude(monitoringUi, "aria-selected");
mustInclude(monitoringUi, "htmlFor=\"mkt-mon-campaign\"");
mustInclude(assetsUi, "role=\"dialog\"");
mustInclude(assetsUi, "aria-modal=\"true\"");
mustInclude(builderPage, 'aria-modal="true"');
mustInclude(builderPage, "Advanced pacing");
mustInclude(builderPage, 'htmlFor="mkt-builder-batch"');
mustInclude(builderPage, "MarketingVisualEmailEditor");
mustInclude(editorUi, "MARKETING_VISUAL_EDITOR_DESKTOP_NOTICE");
mustInclude(editorUi, "aria-pressed");
mustInclude(editorUi, 'title="Email preview"');
mustInclude(pagerUi, 'aria-label={props.label}');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-pre-staging-local-jwt-secret-aaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-pre-staging-local-jwt-refresh-bbbb";
}

process.env.ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE = "memory";

const paginationUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/ux-pagination.ts"),
).href;
const altUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/asset-alt-text.ts")).href;
const evaluateUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/qualification/evaluate.ts"),
).href;
const inboxUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/qualification/inbox-boundary.ts"),
).href;
const uxUrl = pathToFileURL(resolve(root, "src/constants/enterprise-marketing-engine/ux.ts")).href;
const sheetsUrl = pathToFileURL(
  resolve(root, "src/constants/enterprise-marketing-engine/data-source.ts"),
).href;
const recipientPageUrl = pathToFileURL(
  resolve(root, "src/constants/enterprise-marketing-engine/campaign-monitoring.ts"),
).href;

const { paginateMarketingCollection } = await import(paginationUrl);
const { assertMarketingImageAltTextForApproval } = await import(altUrl);
const { evaluateMarketingQualificationState } = await import(evaluateUrl);
const { canCreateContactFromQualificationState, MARKETING_QUALIFICATION_INBOX_RULES } =
  await import(inboxUrl);
const ux = await import(uxUrl);
const sheets = await import(sheetsUrl);
const recipientPage = await import(recipientPageUrl);

assert.equal(sheets.MARKETING_SHEETS_PREVIEW_MAX_ROWS, 20);
assert.equal(recipientPage.MARKETING_CAMPAIGN_RECIPIENT_PAGE_SIZE, 50);
assert.equal(ux.MARKETING_REGISTRY_PAGE_SIZE, 25);
assert.equal(ux.MARKETING_ASSET_LIBRARY_PAGE_SIZE, 24);
assert.equal(ux.MARKETING_UX_MAX_CLIENT_ROWS, 100);

const page2 = paginateMarketingCollection([1, 2, 3, 4, 5], 2, 2);
assert.deepEqual(page2.slice, [3, 4]);
assert.equal(page2.page, 2);
assert.equal(page2.total, 5);
assert.equal(page2.totalPages, 3);

const capped = paginateMarketingCollection(
  Array.from({ length: 250 }, (_, index) => index),
  1,
  500,
);
assert.equal(capped.pageSize, 100);
assert.equal(capped.slice.length, 100);

assertMarketingImageAltTextForApproval({
  blocks: [{ id: "ok", type: "text", props: { html: "Hello" } }],
});
assert.throws(
  () =>
    assertMarketingImageAltTextForApproval({
      blocks: [{ id: "img-1", type: "image", props: { url: "https://example.com/a.png", alt: "" } }],
    }),
  /alt text/i,
);

assert.equal(evaluateMarketingQualificationState({ intent: "open" }), "ENGAGED");
assert.equal(evaluateMarketingQualificationState({ intent: "click" }), "ENGAGED");
assert.equal(canCreateContactFromQualificationState("ENGAGED"), false);
assert.equal(MARKETING_QUALIFICATION_INBOX_RULES.openClickDoesNotCreateContact, true);

console.log("CO-MARKETING-REDESIGN-021 UX / accessibility / performance verify: PASS");
console.log(`
MANUAL_INSPECTION
- Dark-theme contrast on hover, focus, selected chips, and status surfaces
- Keyboard tab order through module nav, skip link, builder footer, and monitoring filters on mobile
- Screen reader: skip link, unsaved-changes dialog, table caption, status chips as text
- Representative viewports: 390 / 768 / 1366 / 1920
- Visual editor three-column canvas only on ≥1100px; desktop notice visible on smaller screens
- Monitoring table vs recipient cards at the tablet breakpoint
- No “connected” or success chrome when providers and Google Sheets remain fixture / unavailable
- Reduced-motion: no lingering animation on Command Center or visual editor
`);
