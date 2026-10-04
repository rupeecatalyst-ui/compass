#!/usr/bin/env node
/**
 * CO-C1-DIALOGUE-ACTIVITY-AUDIT-001 — unified Activity & Dialogue architecture gate.
 * Validates the approved single workspace (not the retired dual Dialogue nav).
 * Engineering validation only; never mutates data.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stickyNoteMustNotEnterSharedActivity } from "../src/lib/sticky-notes/owner-scope.ts";
import {
  isChanakyaHistoryEvent,
  isExcludedPrivateOrAdvisoryEvent,
  composeDetailedTimelineRow,
  eventVisibleToTimelineActor,
  detailedTimelineRowContainsPii,
} from "../src/lib/enterprise-activity-registry/detailed-timeline.ts";
import { buildDealWorkspaceHref } from "../src/lib/loan-journey/adr-018-routing.ts";

const root = process.cwd();

function read(relativePath) {
  const path = join(root, relativePath);
  assert.ok(existsSync(path), `Missing: ${relativePath}`);
  return readFileSync(path, "utf8");
}

const routes = read("src/constants/routes.ts");
assert.match(routes, /ACTIVITY:\s*"\/activity"/);
assert.match(routes, /DIALOGUE:\s*"\/dialogue"/);

const nav = read("src/config/navigation.ts");
const primary = nav.slice(
  nav.indexOf("export const primaryDomainNavigation"),
  nav.indexOf("export function isContextDomain") > 0
    ? nav.indexOf("export function isContextDomain")
    : nav.length,
);
assert.match(primary, /title:\s*"Activity & Dialogue"/);
assert.match(primary, /href:\s*ROUTES\.ACTIVITY/);
assert.equal(
  (primary.match(/title:\s*"Activity & Dialogue"/g) || []).length,
  1,
  "exactly one Activity & Dialogue primary-nav item",
);
assert.doesNotMatch(
  primary,
  /title:\s*"Dialogue",\s*href:\s*ROUTES\.DIALOGUE/,
  "must not keep a duplicate Dialogue primary-nav item",
);

const activityPage = read("src/app/(dashboard)/activity/page.tsx");
assert.match(activityPage, /ActivityDeskWorkspace/);

const activityDesk = read("src/components/catalyst-one/activity/activity-desk-workspace.tsx");
assert.match(activityDesk, /DetailedActivityDialogueTimeline/);

const dialoguePage = read("src/app/(dashboard)/dialogue/page.tsx");
assert.match(dialoguePage, /redirect/);
assert.match(dialoguePage, /ROUTES\.ACTIVITY/);
assert.doesNotMatch(dialoguePage, /DialogueCenterWorkspace/);

const schema = read("prisma/schema.prisma");
assert.match(schema, /model EnterpriseActivityEvent/);
assert.match(schema, /@@map\("enterprise_activity_events"\)/);
assert.doesNotMatch(schema, /model DialogueActivity/);
assert.doesNotMatch(schema, /model CompassActivityStore/);

const earApi = read("src/app/api/enterprise-activity/route.ts");
assert.match(earApi, /requireAccessToken/);
assert.match(earApi, /enterpriseActivityService\.list/);

const timelineApi = read("src/app/api/enterprise-activity/timeline/route.ts");
assert.match(timelineApi, /requireAccessToken/);
assert.match(timelineApi, /listDetailedActivityDialogueTimeline/);
assert.doesNotMatch(timelineApi, /export async function POST/);

const earService = read("server/services/enterprise-activity/enterprise-activity.service.ts");
assert.match(earService, /isEnterprisePersistencePrisma/);
assert.match(earService, /enterpriseActivityRepository\.upsertEvent/);

const outbox = read(
  "src/components/catalyst-one/action-center/enterprise-outbox-provider.tsx",
);
assert.match(outbox, /emitEnterpriseActivityBestEffort/);
assert.match(outbox, /eventKind:\s*"communications"/);
assert.match(outbox, /simulateEnceCommunication/);

const lifecycle = read(
  "src/constants/enterprise-notification-communication-engine/lifecycle.ts",
);
assert.match(lifecycle, /ENCE_EXTERNAL_DELIVERY_ENABLED = false/);

assert.ok(stickyNoteMustNotEnterSharedActivity("sticky_notes"));
assert.ok(
  isExcludedPrivateOrAdvisoryEvent({
    id: "st",
    organizationId: "org-a",
    eventKind: "notes",
    sourceSystem: "sticky_notes",
    sourceEventId: "n1",
    title: "Private sticky",
    summary: null,
    payload: null,
    opportunityId: null,
    dealId: null,
    contactId: null,
    taskId: null,
    documentId: null,
    actorUserId: "u1",
    actorName: "Owner",
    occurredAt: "2026-09-03T10:00:00.000Z",
    createdAt: "2026-09-03T10:00:00.000Z",
  }),
);

assert.ok(
  isChanakyaHistoryEvent({
    eventKind: "chanakya",
    sourceSystem: "chanakya_conversation",
    title: "CHANAKYA chat session",
    summary: null,
  }),
);

const piiRow = composeDetailedTimelineRow({
  id: "pii",
  organizationId: "org-a",
  eventKind: "communications",
  sourceSystem: "outbox",
  sourceEventId: "m1",
  title: "Emailed ada@example.com at 9876543210",
  summary: null,
  payload: null,
  opportunityId: "opp-1",
  dealId: "deal-1",
  contactId: "ctc-1",
  taskId: null,
  documentId: null,
  actorUserId: "u1",
  actorName: "Rahul Kapoor",
  occurredAt: "2026-09-03T10:00:00.000Z",
  createdAt: "2026-09-03T10:00:00.000Z",
});
assert.equal(detailedTimelineRowContainsPii(piiRow), false);
assert.doesNotMatch(piiRow.title, /ada@example.com|9876543210/);
assert.ok(piiRow.hrefs.deal === buildDealWorkspaceHref({ dealId: "deal-1", opportunityId: "opp-1" }));
assert.match(piiRow.hrefs.customer || "", /contact=ctc-1/);

assert.equal(
  eventVisibleToTimelineActor(
    {
      id: "x",
      organizationId: "org-b",
      eventKind: "workflow",
      sourceSystem: "deal_timeline",
      sourceEventId: "s",
      title: "Event",
      summary: null,
      payload: null,
      opportunityId: "opp-1",
      dealId: null,
      contactId: null,
      taskId: null,
      documentId: null,
      actorUserId: "u1",
      actorName: "A",
      occurredAt: "2026-09-03T10:00:00.000Z",
      createdAt: "2026-09-03T10:00:00.000Z",
    },
    { userId: "u1", role: "ANALYST", organizationId: "org-a" },
    { opportunityId: "opp-1", organizationId: "org-b", primaryOwnerUserId: "u1" },
  ),
  false,
);

const report = join(
  root,
  "docs/co-c1-dialogue-activity-audit-001/CO-C1-DIALOGUE-ACTIVITY-AUDIT-001-REPORT.md",
);
assert.ok(existsSync(report), "Missing Dialogue / Activity audit report");

console.log("CO-C1-DIALOGUE-ACTIVITY-AUDIT-001 verify: PASS");
