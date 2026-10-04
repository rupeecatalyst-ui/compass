/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007 — focused verifier.
 * No production mutation, no deploy, no migrate apply.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bandFromRecency } from "../src/lib/relationship-heat-map/score-framework.ts";
import { isMeaningfulRelationshipInteraction } from "../src/lib/relationship-heat-map/meaningful-interaction.ts";
import { composeContactStrategySnapshot } from "../src/lib/contact-strategy/compose.ts";
import { contactStrategyTextLeaksPii } from "../src/lib/contact-strategy/redact.ts";
import { contactStrategyActorMaySee } from "../src/lib/contact-strategy/visibility.ts";
import {
  actorOwnsStickyNote,
  rejectCrossUserStickyNoteAccess,
  stickyNoteMustNotEnterSharedActivity,
} from "../src/lib/sticky-notes/owner-scope.ts";
import {
  convertStickyNoteRequiresConfirmation,
  convertStickyNoteToTaskIdempotent,
} from "../src/lib/sticky-notes/convert-to-task.ts";
import { isOperationalTimelineEvent } from "../src/lib/enterprise-activity-registry/transaction-timeline.ts";
import { resetEteComposition, listEteTasks } from "../src/lib/enterprise-task-engine/index.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}
function mustContain(rel, needle, label = needle) {
  if (read(rel).includes(needle)) ok(`${rel} contains ${label}`);
  else fail(`${rel} missing ${label}`);
}
function mustNotContain(rel, needle, label = needle) {
  if (!read(rel).includes(needle)) ok(`${rel} omits ${label}`);
  else fail(`${rel} must not contain ${label}`);
}

const now = Date.parse("2026-09-02T12:00:00.000Z");
function isoDaysAgo(days) {
  return new Date(now - days * 86400000).toISOString();
}

{
  const cases = [
    [0, "very_active"],
    [7, "very_active"],
    [8, "active"],
    [30, "active"],
    [31, "moderate"],
    [60, "moderate"],
    [61, "needs_attention"],
    [90, "needs_attention"],
    [91, "dormant"],
    [Number.POSITIVE_INFINITY, "dormant"],
  ];
  for (const [days, band] of cases) {
    const got = bandFromRecency(days);
    if (got === band) ok(`activity band ${days} → ${band}`);
    else fail(`activity band ${days} expected ${band} got ${got}`);
  }
}

{
  const base = {
    id: "e1",
    organizationId: "org",
    sourceEventId: "s1",
    occurredAt: isoDaysAgo(1),
    createdAt: isoDaysAgo(1),
    payload: {},
  };
  const meaningful = [
    { ...base, eventKind: "communications", sourceSystem: "outbox", title: "Email sent", contactId: "c1" },
    { ...base, eventKind: "communications", sourceSystem: "inbound_email", title: "Email received", contactId: "c1" },
    { ...base, eventKind: "dialogue", sourceSystem: "ecie", title: "Completed call", contactId: "c1" },
    { ...base, eventKind: "dialogue", sourceSystem: "ecie", title: "Completed meeting", contactId: "c1" },
    { ...base, eventKind: "notes", sourceSystem: "manual", title: "Follow-up completed", contactId: "c1" },
    { ...base, eventKind: "tasks", sourceSystem: "ete", title: "Task completed", payload: { status: "completed" }, contactId: "c1" },
  ];
  const noise = [
    { ...base, eventKind: "stage_change", sourceSystem: "opportunity", title: "Stage moved", contactId: "c1" },
    { ...base, eventKind: "dialogue", sourceSystem: "edc", title: "Profile viewed", contactId: "c1" },
    { ...base, eventKind: "workflow", sourceSystem: "opportunity", title: "Sync hydration", contactId: "c1" },
    { ...base, eventKind: "tasks", sourceSystem: "ete", title: "Task created", payload: { status: "open" }, contactId: "c1" },
    { ...base, eventKind: "communications", sourceSystem: "outbox", title: "Draft unsent email", contactId: "c1" },
    { ...base, eventKind: "notes", sourceSystem: "sticky_notes", title: "Private sticky", contactId: "c1" },
  ];
  for (const event of meaningful) {
    if (isMeaningfulRelationshipInteraction(event)) ok(`meaningful: ${event.title}`);
    else fail(`expected meaningful: ${event.title}`);
  }
  for (const event of noise) {
    if (!isMeaningfulRelationshipInteraction(event) || stickyNoteMustNotEnterSharedActivity(event.sourceSystem)) {
      ok(`non-meaningful/excluded: ${event.title}`);
    } else {
      fail(`should not reset clock: ${event.title}`);
    }
  }
  if (stickyNoteMustNotEnterSharedActivity("sticky_notes")) ok("sticky notes excluded from shared activity source");
  else fail("sticky notes must be excluded from shared activity");
  const stickyEvent = noise[noise.length - 1];
  if (!isOperationalTimelineEvent({ ...stickyEvent, sourceSystem: "sticky_notes" })) {
    ok("linked private note absent from transaction timeline");
  } else {
    fail("sticky note must not appear on shared timeline");
  }
}

{
  const snapshot = composeContactStrategySnapshot({
    nowMs: now,
    actor: { userId: "rm-1", role: "ANALYST" },
    downlineUserIds: ["rm-1"],
    contacts: [
      {
        id: "c-mine",
        name: "Priya Sharma",
        primaryRole: "customer",
        ownerId: "rm-1",
        ownerName: "RM One",
        contactScore: 72,
        strategicContact: true,
        companyId: "co-1",
        companyName: "Acme Pvt Ltd",
      },
      {
        id: "c-hidden",
        name: "Hidden Contact",
        primaryRole: "customer",
        ownerId: "other-rm",
        ownerName: "Other RM",
        contactScore: 10,
        strategicContact: true,
      },
    ],
    opportunities: [
      {
        id: "opp-1",
        opportunityNumber: "OPP-2026-000001",
        primaryContactId: "c-mine",
        companyId: "co-1",
        requestedAmount: 2500000,
        primaryOwnerUserId: "rm-1",
        assignedUserIds: ["rm-1"],
      },
    ],
    deals: [],
    events: [
      {
        id: "ev-1",
        organizationId: "org",
        eventKind: "communications",
        sourceSystem: "outbox",
        sourceEventId: "mail-1",
        title: "Operational email sent",
        summary: null,
        payload: {},
        opportunityId: "opp-1",
        dealId: null,
        contactId: "c-mine",
        taskId: null,
        documentId: null,
        actorUserId: "rm-1",
        actorName: "RM One",
        occurredAt: isoDaysAgo(3),
        createdAt: isoDaysAgo(3),
      },
    ],
    tasks: [
      {
        id: "t1",
        taskType: "independent",
        assigneeRef: "user:rm-1",
        predefinedDescription: "Call Customer",
        title: "Call Priya",
        dueOn: new Date(now).toISOString(),
        contactId: "c-mine",
        coOwnerRefs: [],
        escalated: false,
        colourStatus: "blue",
        enabled: true,
        createdBy: "rm-1",
        createdOn: isoDaysAgo(1),
        modifiedBy: "rm-1",
        modifiedOn: isoDaysAgo(1),
        status: "open",
      },
    ],
    plans: [
      {
        contactId: "c-mine",
        objective: "Keep the relationship warm before login",
        cadence: "weekly",
        preferredChannel: "call",
        nextReviewAt: isoDaysAgo(-2),
        assignedOwnerUserId: "rm-1",
        assignedOwnerName: "RM One",
      },
    ],
  });

  if (snapshot.rows.length === 1 && snapshot.rows[0].contactId === "c-mine") {
    ok("Contact Strategy rows come from canonical authorised records");
  } else {
    fail(`expected one authorised row, got ${snapshot.rows.map((r) => r.contactId).join(",")}`);
  }
  if (snapshot.rows[0].relationshipState === "very_active") ok("canonical last interaction drives band");
  else fail(`band was ${snapshot.rows[0].relationshipState}`);
  if (snapshot.kpis.strategic === 1 && snapshot.kpis.due_today === 1) ok("KPIs derived from authorised rows");
  else fail(`KPI mismatch ${JSON.stringify(snapshot.kpis)}`);
  if (!contactStrategyTextLeaksPii(snapshot)) ok("snapshot has no email/mobile leakage");
  else fail("snapshot leaked PII");
}

{
  const actor = { userId: "rm-1", role: "ANALYST" };
  if (
    contactStrategyActorMaySee({ actor, downlineUserIds: ["rm-1"], ownerId: "rm-1" }) &&
    !contactStrategyActorMaySee({ actor, downlineUserIds: ["rm-1"], ownerId: "rm-9" })
  ) {
    ok("hierarchy permissions hide unassigned contacts");
  } else {
    fail("hierarchy permissions failed");
  }
  if (
    contactStrategyActorMaySee({
      actor: { userId: "admin", role: "SUPER_ADMIN" },
      ownerId: "rm-9",
    })
  ) {
    ok("org-wide role may see organisation contacts in Contact Strategy");
  } else {
    fail("super admin should see org contacts in Contact Strategy");
  }
}

{
  if (
    actorOwnsStickyNote({
      organizationId: "org",
      ownerUserId: "u1",
      actorOrganizationId: "org",
      actorUserId: "u1",
    }) &&
    !actorOwnsStickyNote({
      organizationId: "org",
      ownerUserId: "u1",
      actorOrganizationId: "org",
      actorUserId: "super-admin",
    })
  ) {
    ok("private-note owner isolation ignores Super Admin hierarchy");
  } else {
    fail("owner isolation failed");
  }
  try {
    rejectCrossUserStickyNoteAccess({
      noteOwnerUserId: "employee-1",
      actorUserId: "SUPER_ADMIN_USER",
      actorRole: "SUPER_ADMIN",
    });
    fail("Super Admin must not read another user's private notes");
  } catch {
    ok("Super Admin cannot read another user's private notes");
  }
}

{
  resetEteComposition();
  const note = {
    id: "n1",
    organizationId: "org",
    ownerUserId: "u1",
    title: "Call the CA",
    body: "Private reminder",
    color: "amber",
    priority: "normal",
    pinned: false,
    sortOrder: 1,
    checklist: [],
    reminderAt: null,
    archivedAt: null,
    linkKind: "contact",
    linkId: "c-mine",
    linkLabel: "Priya Sharma",
    convertedTaskId: null,
    createdAt: isoDaysAgo(1),
    updatedAt: isoDaysAgo(1),
    deletedAt: null,
  };
  const denied = convertStickyNoteToTaskIdempotent({
    note,
    confirm: false,
    actorUserId: "u1",
    actorLabel: "RM One",
  });
  if (denied.confirmationRequired && listEteTasks().length === 0) {
    ok("convert-to-task requires confirmation and creates nothing");
  } else {
    fail("unconfirmed convert created a task");
  }
  const first = convertStickyNoteToTaskIdempotent({
    note,
    confirm: true,
    actorUserId: "u1",
    actorLabel: "RM One",
  });
  const again = convertStickyNoteToTaskIdempotent({
    note: { ...note, convertedTaskId: first.taskId },
    confirm: true,
    actorUserId: "u1",
    actorLabel: "RM One",
  });
  if (first.created && !again.created && again.taskId === first.taskId && listEteTasks().length === 1) {
    ok("convert-to-task is idempotent and keeps a single task");
  } else {
    fail("convert-to-task idempotency failed");
  }
  if (!convertStickyNoteRequiresConfirmation(undefined)) ok("confirmation flag is explicit");
  else fail("confirmation helper");
}

{
  const rels = [
    "src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx",
    "src/app/api/contact-strategy/route.ts",
    "src/app/api/sticky-notes/route.ts",
    "src/app/(dashboard)/sticky-notes/page.tsx",
    "src/config/navigation.ts",
    "prisma/migrations/20260902180000_co_c1_contact_strategy_sticky_notes_007/migration.sql",
  ];
  for (const rel of rels) {
    if (fs.existsSync(path.join(root, rel))) ok(`exists ${rel}`);
    else fail(`missing ${rel}`);
  }
  mustContain("src/config/navigation.ts", 'title: "Sticky Notes"');
  mustContain("src/config/navigation.ts", "ROUTES.STICKY_NOTES");
  const nav = read("src/config/navigation.ts");
  const tasks = nav.indexOf('title: "Tasks"');
  const sticky = nav.indexOf('title: "Sticky Notes"');
  const activity = nav.indexOf('title: "Activity & Dialogue"');
  if (tasks >= 0 && sticky > tasks && activity > sticky) ok("Sticky Notes sits between Tasks and Activity & Dialogue");
  else fail("Sticky Notes nav order is wrong");
  mustContain(
    "src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx",
    "EmailContextWorkspace",
  );
  mustContain(
    "src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx",
    "WhatsAppContextWorkspace",
  );
  mustNotContain(
    "src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx",
    "sendTransactionOperationalEmail(",
    "auto email send from strategy list",
  );
  mustNotContain(
    "src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx",
    "localStorage",
  );
  mustNotContain("src/lib/contact-strategy/compose.ts", "mobilePrimary");
  mustNotContain("src/lib/contact-strategy/compose.ts", "personalEmail");
  mustNotContain("server/services/sticky-notes/sticky-notes.service.ts", "recordBusinessAudit");
  mustContain("server/services/sticky-notes/sticky-notes.service.ts", "ownerUserId: scope.ownerUserId");
  mustContain("src/app/api/sticky-notes/route.ts", "stickyNotesService.auditRef(note.id)");
  mustNotContain("src/lib/sticky-notes/convert-to-task.ts", "emitEnterpriseActivity");
}

{
  console.log("\n--- 7A Operational Contact Strategy ---");
  mustContain(
    "server/services/contact-strategy/contact-strategy.service.ts",
    "prisma.ecmContact.findMany",
  );
  mustContain(
    "server/services/contact-strategy/contact-strategy.service.ts",
    "prisma.enterpriseOpportunity.findMany",
  );
  mustContain(
    "server/services/contact-strategy/contact-strategy.service.ts",
    "prisma.enterpriseDeal.findMany",
  );
  mustContain(
    "server/services/contact-strategy/contact-strategy.service.ts",
    "prisma.enterpriseActivityEvent.findMany",
  );
  mustContain("server/services/contact-strategy/contact-strategy.service.ts", "listEteTasks");
  mustContain(
    "src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx",
    "fetchContactStrategySnapshot",
  );
  mustNotContain(
    "src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx",
    "ric-mock",
  );
  mustNotContain(
    "src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx",
    "contact-strategy/store",
  );
  mustContain(
    "src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx",
    "Open Contact 360",
  );
  mustContain(
    "src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx",
    "EmailContextWorkspace",
  );
  mustContain("src/constants/contact-strategy/index.ts", "Strategic Contacts");
  mustContain("src/constants/contact-strategy/index.ts", "Due Today");
  mustContain("src/constants/contact-strategy/index.ts", "Needs Attention");
  mustContain("src/constants/contact-strategy/index.ts", "Dormant");
  mustContain("src/constants/contact-strategy/index.ts", "Upcoming Meetings");
  mustContain("src/lib/relationship-heat-map/score-framework.ts", "very_active");
  mustContain("src/lib/relationship-heat-map/meaningful-interaction.ts", "isMeaningfulRelationshipInteraction");
  mustContain("src/lib/contact-strategy/compose.ts", "nextAction");
  mustContain("src/types/contact-strategy.ts", "assignedOwnerUserId");
  mustContain("src/app/api/contact-strategy/route.ts", "requireAccessToken");
  console.log("\n--- 7B Private Sticky Notes ---");
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nCO-C1-CONTACT-STRATEGY-STICKY-NOTES-007 verifier PASS");
