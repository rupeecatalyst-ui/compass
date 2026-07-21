import {
  buildChanakyaRadarDashboard,
  type ChanakyaRadarDealRow,
  type ChanakyaRadarIntelligenceItem,
} from "@/lib/chanakya-radar/derive-dashboard";
import { listEcmContacts } from "@/lib/enterprise-contact-master";
import { listEteTasks } from "@/lib/enterprise-task-engine/task-registry";
import { columnForTask } from "@/lib/enterprise-task-engine/task-workspace";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import type {
  ChanakyaLiveIntelligenceMessage,
  ChanakyaLiveIntelligenceWorkspace,
} from "@/types/chanakya-live-intelligence";
import type { EcmContact } from "@/types/enterprise-contact-master";

function loop(
  items: ChanakyaLiveIntelligenceMessage[],
): ChanakyaLiveIntelligenceMessage[] {
  if (items.length === 0) {
    return [
      {
        id: "empty",
        text: "CHANAKYA is monitoring — no urgent signals right now.",
        tone: "success",
      },
      {
        id: "empty-loop",
        text: "CHANAKYA is monitoring — no urgent signals right now.",
        tone: "success",
      },
    ];
  }
  return [...items, ...items.map((i) => ({ ...i, id: `${i.id}-loop` }))];
}

function quiet(text: string): ChanakyaLiveIntelligenceMessage[] {
  return loop([{ id: "quiet", text, tone: "success" }]);
}

/** Mission Control / Radar — SSOT via buildChanakyaRadarDashboard (no duplicate formulas). */
export function buildMissionControlLiveMessages(
  rows: ChanakyaRadarDealRow[],
  intelligence: ChanakyaRadarIntelligenceItem[],
): ChanakyaLiveIntelligenceMessage[] {
  const items: ChanakyaLiveIntelligenceMessage[] = [];

  const atRisk = rows
    .filter((r) => r.quadrant === "at_risk")
    .sort((a, b) => b.daysInStage - a.daysInStage);
  for (const r of atRisk.slice(0, 4)) {
    items.push({
      id: `risk-${r.id}`,
      text: `${r.borrower} requires immediate attention.`,
      tone: "danger",
    });
  }

  const sla = rows.filter((r) => r.idleDays >= 7 || r.daysInStage >= 14).length;
  if (sla > 0) {
    items.push({
      id: "sla",
      text: `${sla} opportunit${sla === 1 ? "y has" : "ies have"} crossed SLA.`,
      tone: "danger",
    });
  }

  const followUp = rows.filter((r) => r.quadrant === "follow_up_required").length;
  if (followUp > 0) {
    items.push({
      id: "fu",
      text: `${followUp} follow-up${followUp === 1 ? "" : "s"} due today.`,
      tone: "warning",
    });
  }

  const docs = rows.filter((r) => r.pendingDocs > 0).length;
  if (docs > 0) {
    items.push({
      id: "docs",
      text: `${docs} file${docs === 1 ? "" : "s"} awaiting document action.`,
      tone: "warning",
    });
  }

  const worked = rows.filter((r) => r.workedToday).length;
  if (worked > 0) {
    items.push({
      id: "worked",
      text: `${worked} opportunit${worked === 1 ? "y was" : "ies were"} worked today.`,
      tone: "success",
    });
  }

  const rmAction = rows.filter(
    (r) => r.openTasks > 0 && (r.quadrant === "at_risk" || r.quadrant === "needs_attention"),
  ).length;
  if (rmAction > 0) {
    items.push({
      id: "rm",
      text: `${rmAction} file${rmAction === 1 ? " is" : "s are"} awaiting RM action.`,
      tone: "info",
    });
  }

  for (const intel of intelligence.slice(0, 3)) {
    items.push({
      id: `intel-${intel.id}`,
      text: `${intel.label}: ${intel.value}`,
      tone: (intel.tone as ChanakyaLiveIntelligenceMessage["tone"]) ?? "default",
    });
  }

  return loop(items);
}

function buildContactsLiveMessages(): ChanakyaLiveIntelligenceMessage[] {
  const contacts = listEcmContacts().filter((c) => c.enabled && c.status !== "archived");
  const items: ChanakyaLiveIntelligenceMessage[] = [];

  const kycPending = contacts.filter((c) => {
    if (c.status === "provisional") return true;
    if (c.status === "verified") return false;
    const hasId = Boolean(c.pan?.trim()) || Boolean(c.aadhaar?.trim());
    return !hasId;
  }).length;
  if (kycPending > 0) {
    items.push({
      id: "kyc",
      text: `${kycPending} KYC pending.`,
      tone: "warning",
    });
  }

  const dupCount = countContactsInDuplicateGroups(contacts);
  if (dupCount > 0) {
    items.push({
      id: "dup",
      text: `${dupCount} duplicate contact${dupCount === 1 ? "" : "s"} detected.`,
      tone: "danger",
    });
  }

  const provisional = contacts.filter((c) => c.status === "provisional").length;
  if (provisional > 0) {
    items.push({
      id: "prov",
      text: `${provisional} provisional contact${provisional === 1 ? "" : "s"} need completion.`,
      tone: "info",
    });
  }

  return items.length ? loop(items) : quiet("Contact registry is clean — no urgent KYC signals.");
}

/** Duplicate groups by mobile / email (same fields as ECM duplicate prevention). */
function countContactsInDuplicateGroups(contacts: EcmContact[]): number {
  const mobileMap = new Map<string, number>();
  const emailMap = new Map<string, number>();

  for (const c of contacts) {
    const mobile = c.mobilePrimary?.replace(/\D/g, "");
    if (mobile && mobile.length >= 10) {
      mobileMap.set(mobile, (mobileMap.get(mobile) ?? 0) + 1);
    }
    for (const raw of [c.personalEmail, c.officialEmail]) {
      const email = raw?.trim().toLowerCase();
      if (email) emailMap.set(email, (emailMap.get(email) ?? 0) + 1);
    }
  }

  const flagged = new Set<string>();
  for (const c of contacts) {
    const mobile = c.mobilePrimary?.replace(/\D/g, "");
    if (mobile && (mobileMap.get(mobile) ?? 0) > 1) flagged.add(c.id);
    for (const raw of [c.personalEmail, c.officialEmail]) {
      const email = raw?.trim().toLowerCase();
      if (email && (emailMap.get(email) ?? 0) > 1) flagged.add(c.id);
    }
  }
  return flagged.size;
}

function buildLoanFilesLiveMessages(rows: ChanakyaRadarDealRow[]): ChanakyaLiveIntelligenceMessage[] {
  const items: ChanakyaLiveIntelligenceMessage[] = [];

  const sanctions = rows.filter(
    (r) =>
      /soft approved|final approved|won/i.test(r.stageLabel) ||
      r.status === "won",
  ).length;
  if (sanctions > 0) {
    items.push({
      id: "sanction",
      text: `${sanctions} sanction letter${sanctions === 1 ? "" : "s"} in portfolio.`,
      tone: "success",
    });
  }

  const awaiting = rows.filter((r) => r.pendingDocs > 0).length;
  if (awaiting > 0) {
    items.push({
      id: "await-docs",
      text: `${awaiting} file${awaiting === 1 ? "" : "s"} awaiting customer documents.`,
      tone: "warning",
    });
  }

  const idle = rows.filter((r) => r.idleDays >= 7).length;
  if (idle > 0) {
    items.push({
      id: "idle",
      text: `${idle} file${idle === 1 ? "" : "s"} idle past SLA.`,
      tone: "danger",
    });
  }

  return items.length ? loop(items) : quiet("Loan files are current — no urgent file signals.");
}

function buildDocumentsLiveMessages(rows: ChanakyaRadarDealRow[]): ChanakyaLiveIntelligenceMessage[] {
  const items: ChanakyaLiveIntelligenceMessage[] = [];
  const pending = rows.filter((r) => r.pendingDocs > 0);
  if (pending.length > 0) {
    items.push({
      id: "pending",
      text: `${pending.length} file${pending.length === 1 ? "" : "s"} have documents pending.`,
      tone: "warning",
    });
    for (const r of pending.slice(0, 3)) {
      items.push({
        id: `doc-${r.id}`,
        text: `${r.borrower}: documents still incomplete.`,
        tone: "info",
      });
    }
  }
  const worked = rows.filter((r) => r.workedToday && r.pendingDocs === 0).length;
  if (worked > 0) {
    items.push({
      id: "verified",
      text: `${worked} file${worked === 1 ? "" : "s"} cleared document checks today.`,
      tone: "success",
    });
  }
  return items.length
    ? loop(items)
    : quiet("Document center is clear — no missing package signals.");
}

function buildTasksLiveMessages(): ChanakyaLiveIntelligenceMessage[] {
  const tasks = listEteTasks().filter((t) => t.enabled !== false);
  const items: ChanakyaLiveIntelligenceMessage[] = [];
  const pastDue = tasks.filter((t) => columnForTask(t) === "past_due").length;
  const dueToday = tasks.filter((t) => columnForTask(t) === "due_today").length;
  if (pastDue > 0) {
    items.push({
      id: "past",
      text: `${pastDue} task${pastDue === 1 ? "" : "s"} past due.`,
      tone: "danger",
    });
  }
  if (dueToday > 0) {
    items.push({
      id: "today",
      text: `${dueToday} task${dueToday === 1 ? "" : "s"} due today.`,
      tone: "warning",
    });
  }
  return items.length ? loop(items) : quiet("Task board is clear — nothing past due.");
}

function buildLendersLiveMessages(rows: ChanakyaRadarDealRow[]): ChanakyaLiveIntelligenceMessage[] {
  const items: ChanakyaLiveIntelligenceMessage[] = [];
  const byLender = new Map<string, number>();
  for (const r of rows) {
    if (r.quadrant === "at_risk" || r.idleDays >= 7) {
      const key = r.lender || "Unassigned";
      byLender.set(key, (byLender.get(key) ?? 0) + 1);
    }
  }
  const top = [...byLender.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  for (const [lender, count] of top) {
    items.push({
      id: `lender-${lender}`,
      text: `${lender}: ${count} file${count === 1 ? "" : "s"} need attention.`,
      tone: "warning",
    });
  }
  return items.length
    ? loop(items)
    : quiet("Lender book is stable — no escalation signals.");
}

function buildOpportunitiesLiveMessages(
  rows: ChanakyaRadarDealRow[],
): ChanakyaLiveIntelligenceMessage[] {
  return buildMissionControlLiveMessages(rows, []);
}

/**
 * Resolve contextual Live Intelligence messages for a workspace.
 * Loan-linked contexts reuse Radar SSOT rows — no parallel metric engines.
 */
export function buildChanakyaLiveIntelligenceMessages(
  workspace: ChanakyaLiveIntelligenceWorkspace,
): ChanakyaLiveIntelligenceMessage[] {
  try {
    if (workspace === "contacts") return buildContactsLiveMessages();
    if (workspace === "tasks") return buildTasksLiveMessages();

    const model = buildChanakyaRadarDashboard(loadLoanFiles());
    const { rows, intelligence } = model;

    switch (workspace) {
      case "mission_control":
      case "radar":
      case "my_deals":
      case "default":
        return buildMissionControlLiveMessages(rows, intelligence);
      case "opportunities":
        return buildOpportunitiesLiveMessages(rows);
      case "loan_files":
        return buildLoanFilesLiveMessages(rows);
      case "documents":
        return buildDocumentsLiveMessages(rows);
      case "lenders":
        return buildLendersLiveMessages(rows);
      case "accounting":
        return quiet("Accounting signals are monitoring — open CHANAKYA for detail.");
      case "horizon":
        return quiet("Horizon outlook is monitoring — open CHANAKYA for detail.");
      default:
        return buildMissionControlLiveMessages(rows, intelligence);
    }
  } catch {
    return quiet("CHANAKYA intelligence temporarily unavailable.");
  }
}
