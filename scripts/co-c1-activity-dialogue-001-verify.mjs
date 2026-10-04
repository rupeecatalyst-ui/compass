/**
 * CO-C1-ACTIVITY-DIALOGUE-001 — Phase 1 discoverability verification.
 * Engineering gate only. Does not mutate data or call production APIs.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { filterEventsForScope } from "../src/lib/enterprise-activity-registry/transaction-timeline.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  const path = join(root, rel);
  assert.ok(existsSync(path), `Missing: ${rel}`);
  return readFileSync(path, "utf8");
}

function ear(partial) {
  return {
    id: partial.id,
    organizationId: "org",
    eventKind: partial.eventKind ?? "workflow",
    sourceSystem: partial.sourceSystem ?? "deal_timeline",
    sourceEventId: null,
    title: partial.title ?? "Event",
    summary: null,
    payload: null,
    opportunityId: partial.opportunityId ?? null,
    dealId: partial.dealId ?? null,
    contactId: null,
    taskId: null,
    documentId: null,
    actorUserId: null,
    actorName: null,
    occurredAt: partial.occurredAt ?? "2026-08-16T10:00:00.000Z",
    createdAt: "2026-08-16T10:00:00.000Z",
  };
}

const routes = read("src/constants/routes.ts");
assert.match(routes, /ACTIVITY:\s*"\/activity"/);
assert.match(routes, /DIALOGUE:\s*"\/dialogue"/);
assert.match(routes, /ROUTES\.ACTIVITY/);

const nav = read("src/config/navigation.ts");
const primary = nav.slice(
  nav.indexOf("export const primaryDomainNavigation"),
  nav.indexOf("export function isContextDomain"),
);
const tasksIdx = primary.indexOf('title: "Tasks"');
const stickyNotesIdx = primary.indexOf('title: "Sticky Notes"');
const activityIdx = primary.indexOf('title: "Activity & Dialogue"');
assert.ok(tasksIdx > 0, "Tasks nav item");
assert.ok(stickyNotesIdx > tasksIdx, "Sticky Notes follows Tasks");
assert.ok(activityIdx > stickyNotesIdx, "Activity & Dialogue follows Sticky Notes");
assert.match(primary, /href:\s*ROUTES\.ACTIVITY/);

assert.ok(existsSync(join(root, "src/app/(dashboard)/activity/page.tsx")), "Activity route page");
assert.ok(existsSync(join(root, "src/app/(dashboard)/dialogue/page.tsx")), "Dialogue route page");

const activityPage = read("src/app/(dashboard)/activity/page.tsx");
assert.match(activityPage, /ActivityDeskWorkspace/);

const activityDesk = read("src/components/catalyst-one/activity/activity-desk-workspace.tsx");
assert.match(activityDesk, /DetailedActivityDialogueTimeline/);
assert.match(activityDesk, /shouldShowEntitySelectionScreen/);
assert.doesNotMatch(activityDesk, /from "@\/components\/catalyst-one\/dialogue/);
assert.doesNotMatch(activityDesk, /inbox|messaging thread/i);

const dialoguePage = read("src/app/(dashboard)/dialogue/page.tsx");
assert.match(dialoguePage, /ROUTES\.ACTIVITY/);
assert.match(dialoguePage, /redirect/);

const dialogue = read(
  "src/components/catalyst-one/dialogue/dialogue-center-workspace.tsx",
);
assert.match(dialogue, /hydrateEdcFromEar/);
assert.match(dialogue, /eventKind/);
assert.match(dialogue, /since/);
assert.doesNotMatch(dialogue, /ChatThread|message inbox|readState/);

const owQuick = read(
  "src/components/catalyst-one/opportunity-workspace/workspace-quick-actions.tsx",
);
assert.match(owQuick, /label: "Activity"/);
assert.doesNotMatch(owQuick, /Open Dialogue/);
assert.match(owQuick, /data-opportunity-activity-action/);

const owPanel = read(
  "src/components/catalyst-one/opportunity-workspace/workspace-dialogue-panel.tsx",
);
assert.match(owPanel, /TransactionActivityTimeline/);
assert.match(owPanel, /mode: "opportunity"/);

const dealHost = read("src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx");
assert.match(dealHost, /TransactionActivityTimeline/);
assert.match(dealHost, /mode: "deal"/);
assert.match(dealHost, /onViewActivity/);
assert.match(dealHost, /data-deal-activity-timeline/);
assert.match(dealHost, /filterEventsForScope|sibling/);

const dealHeader = read(
  "src/components/catalyst-one/deal-workspace/deal-executive-header.tsx",
);
assert.match(dealHeader, /data-deal-activity-action/);
assert.match(dealHeader, />[\s\n]*Activity[\s\n]*</);

const dealActions = read("src/constants/enterprise-action-center/actions.ts");
assert.match(dealActions, /view_activity/);
assert.match(dealActions, /DEAL_REFERENCE_ACTION_IDS/);

const timeline = read("src/lib/enterprise-activity-registry/transaction-timeline.ts");
assert.match(timeline, /listEnterpriseActivity/);
assert.match(timeline, /occurredAt/);
assert.match(timeline, /filterEventsForScope/);
assert.doesNotMatch(timeline, /updatedAt/);
assert.doesNotMatch(timeline, /healthComputedAt/);

const hydrate = read("src/lib/enterprise-activity-registry/hydrate-edc.ts");
assert.match(hydrate, /listEnterpriseActivity/);
assert.match(hydrate, /eventKind/);
assert.match(hydrate, /since/);

const schema = read("prisma/schema.prisma");
assert.match(schema, /model EnterpriseActivityEvent/);
assert.doesNotMatch(schema, /model DialogueActivity/);
assert.doesNotMatch(schema, /opportunity_activity_center/);
assert.doesNotMatch(schema, /deal_activity_center/);
assert.doesNotMatch(schema, /lender_activity_center/);

const tasksPage = read("src/app/(dashboard)/tasks/page.tsx");
assert.match(tasksPage, /EnterpriseTasksWorkspace/);

const ene = read("prisma/schema.prisma");
assert.match(ene, /model EnterpriseNotification/);

const sibling = filterEventsForScope(
  [
    ear({ id: "this", opportunityId: "opp-1", dealId: "deal-a" }),
    ear({ id: "sibling", opportunityId: "opp-1", dealId: "deal-b" }),
    ear({ id: "shared", opportunityId: "opp-1", dealId: null }),
  ],
  { mode: "deal", dealId: "deal-a", opportunityId: "opp-1" },
);
assert.deepEqual(
  sibling.map((e) => e.id).sort(),
  ["shared", "this"],
);

console.log("CO-C1-ACTIVITY-DIALOGUE-001 VERIFY PASS");
