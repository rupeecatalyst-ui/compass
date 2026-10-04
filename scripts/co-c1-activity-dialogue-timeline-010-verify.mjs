/**
 * CO-C1-ACTIVITY-DIALOGUE-TIMELINE-010
 * Engineering verification only. No production mutation, deploy, or live send.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyTimelineCursor,
  classifyDetailedTimelineEventType,
  composeDetailedTimelinePage,
  composeDetailedTimelineRow,
  composeHumanReadableNarrative,
  dedupeEnterpriseActivityEvents,
  detailedTimelineRowContainsPii,
  earDedupeKey,
  encodeTimelineCursor,
  emptyDetailedTimelineFilters,
  eventVisibleToTimelineActor,
  formatExactOccurredAt,
  isChanakyaHistoryEvent,
  isExcludedPrivateOrAdvisoryEvent,
  looksLikeRawEventCode,
  paginateAuthorisedTimeline,
  sortTimelineEventsNewestFirst,
  toAuthorisedTimelineExportRows,
} from "../src/lib/enterprise-activity-registry/detailed-timeline.ts";
import { parseDetailedTimelineFiltersFromSearch } from "../src/lib/enterprise-activity-registry/detailed-timeline-state.ts";
import { stickyNoteMustNotEnterSharedActivity } from "../src/lib/sticky-notes/owner-scope.ts";
import { buildDealWorkspaceHref } from "../src/lib/loan-journey/adr-018-routing.ts";
import { buildDocumentWorkspaceHref } from "../src/lib/document-workspace/context-lock.ts";
import { buildAccountingCaseHref } from "../src/lib/accounting-workspace/resolve-workbench.ts";
import { filterEventsForScope } from "../src/lib/enterprise-activity-registry/transaction-timeline.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function expect(name, condition) {
  if (condition) console.log(`PASS  ${name}`);
  else {
    failures.push(name);
    console.log(`FAIL  ${name}`);
  }
}

function ear(partial) {
  return {
    id: partial.id,
    organizationId: partial.organizationId ?? "org-a",
    eventKind: partial.eventKind ?? "workflow",
    sourceSystem: partial.sourceSystem ?? "deal_timeline",
    sourceEventId: partial.sourceEventId ?? null,
    title: partial.title ?? "Event",
    summary: partial.summary ?? null,
    payload: partial.payload ?? null,
    opportunityId: partial.opportunityId ?? null,
    dealId: partial.dealId ?? null,
    contactId: partial.contactId ?? null,
    taskId: partial.taskId ?? null,
    documentId: partial.documentId ?? null,
    actorUserId: partial.actorUserId ?? null,
    actorName: partial.actorName ?? null,
    occurredAt: partial.occurredAt ?? "2026-09-03T10:00:00.000Z",
    createdAt: "2026-09-03T10:00:00.000Z",
    ...partial,
  };
}

const required = [
  "src/lib/enterprise-activity-registry/detailed-timeline.ts",
  "src/lib/enterprise-activity-registry/detailed-timeline-state.ts",
  "src/components/catalyst-one/activity/detailed-activity-dialogue-timeline.tsx",
  "src/components/catalyst-one/activity/activity-timeline-details-drawer.tsx",
  "src/app/api/enterprise-activity/timeline/route.ts",
  "server/services/enterprise-activity/detailed-timeline.service.ts",
];
for (const rel of required) {
  expect(`exists ${rel}`, fs.existsSync(path.join(root, rel)));
}

const desk = read("src/components/catalyst-one/activity/activity-desk-workspace.tsx");
expect("desk uses detailed timeline", desk.includes("DetailedActivityDialogueTimeline"));
expect("desk remains EAR (no second store)", !/model DialogueActivity|second activity store/.test(desk));
expect("no mutation shortcuts", !/emitEnterpriseActivity\(|createTask\(|sendNow/.test(desk));

const ui = read("src/components/catalyst-one/activity/detailed-activity-dialogue-timeline.tsx");
expect("summary strip counts", /Total events/.test(ui) && /Needs attention/.test(ui));
expect("event type filters", /DETAILED_TIMELINE_EVENT_TYPES/.test(ui) && /eventType/.test(ui));
expect("assignment and accounting types in SSOT", read("src/constants/activity-dialogue-timeline.ts").includes("assignment_changes") && read("src/constants/activity-dialogue-timeline.ts").includes("Accounting"));
expect("pagination", /Load earlier activity/.test(ui));
expect("export uses existing csv helper", ui.includes("downloadCsv"));
expect("no email/mobile fields", !/mobilePrimary|personalEmail|customerMobile/.test(ui));

const drawer = read("src/components/catalyst-one/activity/activity-timeline-details-drawer.tsx");
expect("drawer technical details collapsed", drawer.includes("Technical Details"));
expect("drawer copy reference", drawer.includes("Copy Reference"));
expect("drawer open transaction", drawer.includes("Open Transaction"));

const api = read("src/app/api/enterprise-activity/timeline/route.ts");
expect("timeline API is GET-only", /export async function GET/.test(api) && !/export async function POST/.test(api));
expect("timeline API requires auth", api.includes("requireAccessToken"));

const service = read("server/services/enterprise-activity/detailed-timeline.service.ts");
expect("server compose uses EAR timeline page", service.includes("listTimelinePage"));
expect("summary counts use SQL countTimeline", service.includes("countTimeline"));
expect("no prisma db push", !service.includes("db push"));
expect("archived deals still loaded", !/archived:\s*false/.test(service));
expect("sticky/chanakya excluded at query", service.includes("DETAILED_TIMELINE_EXCLUDED_SOURCES"));
expect("no 200-event scan cap", !/SCAN_CAP|limit:\s*200/.test(service) && !read("src/constants/activity-dialogue-timeline.ts").includes("SCAN_CAP"));
expect("permission filtering before return", service.includes("loadVisibility") && service.includes("hasOrgWideCaseVisibility"));
expect("repository has no timeline take cap of 200", !/Math\.min\([^)]*200/.test(read("server/repositories/enterprise-activity/enterprise-activity.repository.ts").split("listTimelinePage")[1] || ""));

const pkg = read("package.json");
expect(
  "npm script registered",
  pkg.includes("verify:co-c1-activity-dialogue-timeline-010"),
);

expect("raw deal-updated heading detected", looksLikeRawEventCode("Deal DEAL-2026-000096 updated"));
expect("raw event code detected", looksLikeRawEventCode("DEAL_UPDATED"));

const assignment = ear({
  id: "asg-1",
  eventKind: "workflow",
  sourceSystem: "deal_control",
  title: "DEAL_UPDATED",
  actorName: "Ketan Kapoor",
  actorUserId: "user-ketan",
  opportunityId: "opp-1",
  dealId: "deal-1",
  payload: {
    assignmentField: "Rupee Catalyst employee",
    previousOwner: "Business Certification Admin",
    newOwner: "Rahul Kapoor",
    actorRole: "Employee",
    sourceWorkspace: "Deal Control",
  },
});
const assignmentRow = composeDetailedTimelineRow(assignment);
expect(
  "assignment human title",
  assignmentRow.title.includes("Rupee Catalyst employee changed from Business Certification Admin to Rahul Kapoor by Ketan Kapoor through Deal Control"),
);
expect("assignment not raw heading", !looksLikeRawEventCode(assignmentRow.title));
expect("assignment actor/role", assignmentRow.actorLabel === "Ketan Kapoor" && assignmentRow.actorRole === "Employee");
expect("assignment before/after", assignmentRow.beforeValue === "Business Certification Admin" && assignmentRow.afterValue === "Rahul Kapoor");
expect("assignment source workspace", assignmentRow.sourceWorkspace === "Deal Control");
expect("assignment exact seconds", /\d{1,2}:\d{2}:\d{2}/.test(assignmentRow.when.timeWithSeconds));
expect("assignment timezone displayed", /IST|Asia\/Kolkata/.test(assignmentRow.when.timezone));

const docs = ear({
  id: "doc-1",
  eventKind: "documents",
  sourceSystem: "customer_portal",
  title: "documents.uploaded",
  actorName: "Nandkumar Jha",
  opportunityId: "opp-1",
  dealId: "deal-1",
  documentId: "doc-reg-1",
  payload: {
    documentCount: 3,
    status: "awaiting review",
    sourceWorkspace: "Customer Document Portal",
  },
});
const docsRow = composeDetailedTimelineRow(docs);
expect("documents human title", /Three documents were uploaded by Nandkumar Jha through Customer Document Portal/.test(docsRow.title));
expect("documents awaiting review", /awaiting review/.test(docsRow.title));
expect(
  "document href is canonical",
  docsRow.hrefs.document ===
    buildDocumentWorkspaceHref({
      opportunityId: "opp-1",
      dealId: "deal-1",
      documentId: "doc-reg-1",
    }),
);

const stage = ear({
  id: "stg-1",
  eventKind: "stage_change",
  sourceSystem: "deal_timeline",
  title: "stage_change",
  actorName: "Ketan Kapoor",
  opportunityId: "opp-1",
  dealId: "deal-1",
  payload: { previousStage: "Soft Approved", newStage: "Final Approved" },
});
const stageRow = composeDetailedTimelineRow(stage);
expect(
  "stage human title",
  stageRow.title.includes("Deal stage changed from Soft Approved to Final Approved by Ketan Kapoor in Lender Workflow"),
);

const comms = ear({
  id: "out-1",
  eventKind: "communications",
  sourceSystem: "outbox",
  title: "email_queued",
  actorName: "Rahul Kapoor",
  payload: { deliveryStatus: "Delivered", processName: "the Outbox service" },
});
const commsRow = composeDetailedTimelineRow(comms);
expect(
  "outbox human title",
  /Follow-up email was queued by Rahul Kapoor/.test(commsRow.title) &&
    /Delivered/.test(commsRow.title) &&
    /Outbox/.test(commsRow.title),
);

const systemEvent = ear({
  id: "sys-1",
  eventKind: "workflow",
  sourceSystem: "workflow",
  title: "SLA_TICK",
  actorName: null,
  actorUserId: null,
  payload: { processName: "Deal stage workflow automation" },
});
const systemRow = composeDetailedTimelineRow(systemEvent);
expect("system actor label", systemRow.actorLabel === "System" && systemRow.isSystemActor);
expect("system process explained", (systemRow.systemProcess || "").includes("Deal stage workflow automation"));
expect("system does not imply a person", !/by [A-Z][a-z]+ [A-Z]/.test(systemRow.explanation) || systemRow.explanation.includes("not performed by a person"));

const taskEvent = ear({
  id: "task-1",
  eventKind: "tasks",
  sourceSystem: "ete",
  title: "TASK_UPDATED",
  taskId: "task-abc",
  actorName: "Rahul Kapoor",
  payload: { status: "completed" },
});
const taskRow = composeDetailedTimelineRow(taskEvent);
expect("task destination", taskRow.hrefs.task === "/tasks?task=task-abc");

const accounting = ear({
  id: "acc-1",
  eventKind: "workflow",
  sourceSystem: "accounting",
  title: "CASE_POSTED",
  payload: { accountingCaseId: "case-99" },
});
const accRow = composeDetailedTimelineRow(accounting);
expect("accounting destination", accRow.hrefs.accounting === buildAccountingCaseHref("case-99"));
expect("accounting type", classifyDetailedTimelineEventType(accounting) === "accounting");

const oppDeal = ear({
  id: "deal-evt",
  title: "Deal DEAL-2026-000096 updated",
  opportunityId: "opp-shared",
  dealId: "deal-alpha",
  actorName: "Ketan Kapoor",
  payload: { previousValue: "A", newValue: "B" },
});
const oppDealRow = composeDetailedTimelineRow(oppDeal, {
  graph: [
    {
      opportunityId: "opp-shared",
      opportunityNumber: "OPP-1",
      dealId: "deal-alpha",
      dealNumber: "DEAL-ALPHA",
      currentStage: "Logged In",
      productLabel: "Home Loan",
      lenderLabel: "HDFC",
      loanAmount: 5000000,
    },
  ],
});
expect("deal keeps deal id", oppDealRow.dealId === "deal-alpha");
expect("deal inherits opportunity", oppDealRow.opportunityId === "opp-shared");
expect("deal href canonical", oppDealRow.hrefs.deal === buildDealWorkspaceHref({ dealId: "deal-alpha", opportunityId: "opp-shared" }));
expect("generic updated rewritten", !looksLikeRawEventCode(oppDealRow.title) && !/^Deal DEAL-/.test(oppDealRow.title));

const fiveDeals = [1, 2, 3, 4, 5].map((n) =>
  ear({
    id: `d-${n}`,
    opportunityId: "opp-five",
    dealId: `deal-${n}`,
    title: `Deal DEAL-${n} updated`,
    actorName: "Ketan Kapoor",
    occurredAt: `2026-09-03T10:0${n}:00.000Z`,
    payload: { dealNumber: `DEAL-${n}` },
  }),
);
const fivePage = composeDetailedTimelinePage(fiveDeals, {
  graph: fiveDeals.map((e, i) => ({
    opportunityId: "opp-five",
    dealId: e.dealId,
    dealNumber: `DEAL-${i + 1}`,
  })),
});
const dealIds = fivePage.rows.map((r) => r.dealId).sort();
expect("five deals remain distinct", dealIds.join(",") === "deal-1,deal-2,deal-3,deal-4,deal-5");

const dupes = dedupeEnterpriseActivityEvents([
  ear({ id: "a1", sourceSystem: "outbox", sourceEventId: "src-9", title: "One" }),
  ear({ id: "a2", sourceSystem: "outbox", sourceEventId: "src-9", title: "One copy" }),
  ear({
    id: "b1",
    sourceSystem: "outbox",
    sourceEventId: "src-10",
    title: "Nearby different",
    occurredAt: "2026-09-03T10:00:01.000Z",
  }),
]);
expect("dedupe by sourceEventId", dupes.length === 2);
expect("earDedupeKey uses source", earDedupeKey(dupes[0]).includes("src-"));
expect(
  "nearby timestamps not merged",
  dupes.some((e) => e.sourceEventId === "src-10"),
);

const ordered = sortTimelineEventsNewestFirst([
  ear({ id: "old", occurredAt: "2026-09-01T00:00:00.000Z" }),
  ear({ id: "new", occurredAt: "2026-09-03T00:00:00.000Z" }),
  ear({ id: "mid", occurredAt: "2026-09-02T00:00:00.000Z" }),
]);
expect("newest-first stable", ordered.map((e) => e.id).join(",") === "new,mid,old");

const paged = applyTimelineCursor(ordered, encodeTimelineCursor(ordered[0]));
expect("cursor incremental loading", paged[0].id === "mid" && paged.length === 2);

const sticky = ear({
  id: "st-1",
  sourceSystem: "sticky_notes",
  title: "Private note",
  summary: "secret",
});
expect("sticky helper", stickyNoteMustNotEnterSharedActivity("sticky_notes"));
expect("sticky excluded from timeline", isExcludedPrivateOrAdvisoryEvent(sticky));

const chanakya = ear({
  id: "ck-1",
  eventKind: "chanakya",
  sourceSystem: "chanakya_conversation",
  title: "CHANAKYA chat session",
});
expect("chanakya history excluded", isChanakyaHistoryEvent(chanakya) && isExcludedPrivateOrAdvisoryEvent(chanakya));

const piiEvent = ear({
  id: "pii-1",
  title: "Called 9876543210 and emailed ada@example.com",
  actorName: "Rahul Kapoor",
  summary: "Follow up",
});
const piiRow = composeDetailedTimelineRow(piiEvent);
expect("email/mobile redacted in title", !piiRow.title.includes("9876543210") && !piiRow.title.includes("ada@example.com"));
expect("row pii scan clean", !detailedTimelineRowContainsPii(piiRow));

const otherOrg = eventVisibleToTimelineActor(
  ear({ id: "x", organizationId: "org-b", opportunityId: "opp-1", actorUserId: "u1" }),
  { userId: "u1", role: "ANALYST", organizationId: "org-a" },
  { opportunityId: "opp-1", organizationId: "org-b", primaryOwnerUserId: "u1" },
);
expect("cross-organisation denied", otherOrg === false);

const hierarchyDenied = eventVisibleToTimelineActor(
  ear({ id: "h1", organizationId: "org-a", opportunityId: "opp-1", actorUserId: "peer" }),
  { userId: "analyst-1", role: "ANALYST", organizationId: "org-a" },
  {
    opportunityId: "opp-1",
    organizationId: "org-a",
    primaryOwnerUserId: "owner-9",
    relationshipManagerUserId: "rm-9",
  },
  ["analyst-1"],
);
expect("hierarchy denial", hierarchyDenied === false);

const adminSees = eventVisibleToTimelineActor(
  ear({ id: "h2", organizationId: "org-a", opportunityId: "opp-1" }),
  { userId: "admin", role: "ADMIN", organizationId: "org-a" },
  { opportunityId: "opp-1", organizationId: "org-a", primaryOwnerUserId: "owner-9" },
);
expect("admin org-wide authorised", adminSees === true);

const archived = composeDetailedTimelineRow(
  ear({ id: "arch-1", opportunityId: "opp-old", title: "Note", eventKind: "notes", sourceSystem: "business_notes", actorName: "Rahul Kapoor" }),
  {
    graph: [{ opportunityId: "opp-old", archived: true, completed: true, customerLabel: "Archived Customer" }],
  },
);
expect("archived history retained", archived.customerLabel === "Archived Customer");

const filtered = composeDetailedTimelinePage(
  [assignment, docs, stage, comms, taskEvent, accounting, systemEvent],
  { filters: { ...emptyDetailedTimelineFilters(), eventType: "documents" } },
);
expect("counts from same filtered set", filtered.counts.total === 1 && filtered.counts.documents === 1 && filtered.rows.length === 1);

const params = new URLSearchParams("opportunityId=opp-1&eventType=stage_changes&q=approved");
const parsed = parseDetailedTimelineFiltersFromSearch(params);
expect("filter persistence parse", parsed.opportunityId === "opp-1" && parsed.eventType === "stage_changes" && parsed.search === "approved");

const exportRows = toAuthorisedTimelineExportRows([commsRow]);
expect("export omits payload/email", !JSON.stringify(exportRows).toLowerCase().includes("payload") && !JSON.stringify(exportRows).includes("@"));

const contactHref = composeDetailedTimelineRow(
  ear({ id: "c1", contactId: "ctc-99", title: "Note", eventKind: "notes", sourceSystem: "business_notes", actorName: "Rahul Kapoor" }),
).hrefs.customer;
expect("contact 360 uses canonical id", contactHref?.includes("contact=ctc-99") && contactHref.includes("customer-360"));

const when = formatExactOccurredAt("2026-09-03T10:15:42.000Z");
expect("timestamp has seconds", when.timeWithSeconds.includes("42"));

const sibling = filterEventsForScope(
  [
    ear({ id: "this", opportunityId: "opp-1", dealId: "deal-a" }),
    ear({ id: "sibling", opportunityId: "opp-1", dealId: "deal-b" }),
  ],
  { mode: "deal", dealId: "deal-a", opportunityId: "opp-1" },
);
expect("existing deal scope still excludes siblings", sibling.map((e) => e.id).join(",") === "this");

{
  const many = Array.from({ length: 250 }, (_, i) =>
    ear({
      id: `evt-${String(i).padStart(3, "0")}`,
      sourceEventId: `src-${i}`,
      title: i === 240 ? "Needle beyond two hundred" : `Event ${i}`,
      occurredAt: new Date(Date.parse("2026-09-03T10:00:00.000Z") - i * 1000).toISOString(),
    }),
  );
  const page1 = paginateAuthorisedTimeline(many, { pageSize: 40, complete: true });
  expect("more than 200 authorised events counted", page1.summary.total === 250 && page1.summary.complete === true);
  expect("first page does not download the organisation", page1.items.length === 40);
  const seen = new Set(page1.items.map((row) => row.id));
  let cursor = page1.pageInfo.nextCursor;
  let pages = 1;
  let foundNeedle = page1.items.some((row) => row.id === "evt-240");
  while (cursor && pages < 20) {
    const next = paginateAuthorisedTimeline(many, { pageSize: 40, cursor, complete: true });
    for (const row of next.items) {
      if (seen.has(row.id)) failures.push(`duplicate ${row.id}`);
      seen.add(row.id);
      if (row.title.includes("Needle beyond two hundred") || row.id === "evt-240") foundNeedle = true;
    }
    cursor = next.pageInfo.nextCursor;
    pages += 1;
    if (!next.pageInfo.hasNextPage) break;
  }
  expect("cursor pagination visits every event", seen.size === 250);
  expect("matching event beyond position 200 is discoverable", foundNeedle);
  const searched = paginateAuthorisedTimeline(many, {
    pageSize: 40,
    complete: true,
    filters: { ...emptyDetailedTimelineFilters(), search: "evt-240" },
  });
  expect(
    "search result beyond position 200",
    searched.summary.total === 1 && searched.items[0]?.id === "evt-240",
  );
  const filteredType = paginateAuthorisedTimeline(
    [
      ...many,
      ear({
        id: "comms-late",
        eventKind: "communications",
        sourceSystem: "outbox",
        sourceEventId: "late-comms",
        title: "Follow-up email",
        occurredAt: "2025-01-01T00:00:00.000Z",
      }),
    ],
    {
      pageSize: 40,
      complete: true,
      filters: { ...emptyDetailedTimelineFilters(), eventType: "communications" },
    },
  );
  expect(
    "complete filtered summary counts",
    filteredType.summary.communications === filteredType.summary.total && filteredType.summary.complete,
  );
}

{
  const sameTs = ["c", "a", "b"].map((id) =>
    ear({
      id,
      sourceEventId: `same-${id}`,
      title: `Same time ${id}`,
      occurredAt: "2026-09-03T10:00:00.000Z",
    }),
  );
  const p1 = paginateAuthorisedTimeline(sameTs, { pageSize: 2, complete: true });
  const p2 = paginateAuthorisedTimeline(sameTs, {
    pageSize: 2,
    cursor: p1.pageInfo.nextCursor,
    complete: true,
  });
  const ids = [...p1.items, ...p2.items].map((row) => row.id);
  expect("identical timestamps are not skipped", ids.sort().join(",") === "a,b,c");
  expect("no duplicates between pages", new Set(ids).size === 3);
}

if (failures.length) {
  console.error(`\nCO-C1-ACTIVITY-DIALOGUE-TIMELINE-010 FAIL (${failures.length})`);
  process.exit(1);
}
console.log("\nCO-C1-ACTIVITY-DIALOGUE-TIMELINE-010 VERIFY PASS");
