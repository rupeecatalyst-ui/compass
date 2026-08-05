/**
 * EUX-007 / CO-CHANAKYA-007 — Contextual Live Intelligence messages.
 *
 * Read-path only. Consumes live Deal / Opportunity / Document / ETE SSOTs.
 * Never invents deleted, demo, or cached historical operational facts.
 */

import {
  buildChanakyaRadarDashboard,
  type ChanakyaRadarDealRow,
  type ChanakyaRadarIntelligenceItem,
} from "@/lib/chanakya-radar/derive-dashboard";
import { loadRadarDealFilesSync } from "@/lib/chanakya-radar/radar-deal-source";
import {
  getLiveOpportunitiesSync,
  resolveLiveDealPortfolio,
  scopeLiveDealPortfolioToEntity,
  type ChanakyaLiveEntityRef,
  type LiveDealPortfolio,
} from "@/lib/chanakya-live-intelligence/live-ssot";
import { getAllDocumentRegistryRecords } from "@/lib/document-registry";
import { listEcmContacts } from "@/lib/enterprise-contact-master";
import { buildChanakyaWorkloadInsights } from "@/lib/enterprise-task-engine/workload-intelligence";
import { getActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
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
        text: "No relevant live enterprise information is available.",
        tone: "success",
      },
      {
        id: "empty-loop",
        text: "No relevant live enterprise information is available.",
        tone: "success",
      },
    ];
  }
  return [...items, ...items.map((i) => ({ ...i, id: `${i.id}-loop` }))];
}

function quiet(text: string): ChanakyaLiveIntelligenceMessage[] {
  return loop([{ id: "quiet", text, tone: "success" }]);
}

const NO_LIVE =
  "No relevant live enterprise information is available for this workspace.";

function dealBookWorkspaces(workspace: ChanakyaLiveIntelligenceWorkspace): boolean {
  return (
    workspace === "mission_control" ||
    workspace === "radar" ||
    workspace === "my_deals" ||
    workspace === "loan_files" ||
    workspace === "documents" ||
    workspace === "lenders" ||
    workspace === "default"
  );
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
      text: `${sla} deal${sla === 1 ? " has" : "s have"} crossed SLA.`,
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
      text: `${docs} deal${docs === 1 ? "" : "s"} awaiting document action.`,
      tone: "warning",
    });
  }

  const worked = rows.filter((r) => r.workedToday).length;
  if (worked > 0) {
    items.push({
      id: "worked",
      text: `${worked} deal${worked === 1 ? " was" : "s were"} worked today.`,
      tone: "success",
    });
  }

  const rmAction = rows.filter(
    (r) => r.openTasks > 0 && (r.quadrant === "at_risk" || r.quadrant === "needs_attention"),
  ).length;
  if (rmAction > 0) {
    items.push({
      id: "rm",
      text: `${rmAction} deal${rmAction === 1 ? " is" : "s are"} awaiting RM action.`,
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

  return items.length ? loop(items) : quiet(NO_LIVE);
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
      text: `${awaiting} deal${awaiting === 1 ? "" : "s"} awaiting customer documents.`,
      tone: "warning",
    });
  }

  const idle = rows.filter((r) => r.idleDays >= 7).length;
  if (idle > 0) {
    items.push({
      id: "idle",
      text: `${idle} deal${idle === 1 ? "" : "s"} idle past SLA.`,
      tone: "danger",
    });
  }

  return items.length ? loop(items) : quiet("Deals are current — no urgent deal signals.");
}

function buildDocumentsLiveMessages(rows: ChanakyaRadarDealRow[]): ChanakyaLiveIntelligenceMessage[] {
  const items: ChanakyaLiveIntelligenceMessage[] = [];

  /** Prefer Document Registry (excludes deleted/archived) over LoanFile checklist projections. */
  const registryActive = getAllDocumentRegistryRecords().filter((r) => r.status === "active");
  const registryUnverified = registryActive.filter((r) => !r.verifiedAt);

  if (registryActive.length > 0) {
    if (registryUnverified.length > 0) {
      items.push({
        id: "reg-pending",
        text: `${registryUnverified.length} live document${registryUnverified.length === 1 ? "" : "s"} awaiting verification.`,
        tone: "warning",
      });
    } else {
      items.push({
        id: "reg-clear",
        text: `${registryActive.length} active document${registryActive.length === 1 ? "" : "s"} on file — registry is current.`,
        tone: "success",
      });
    }
    return loop(items);
  }

  const pending = rows.filter((r) => r.pendingDocs > 0);
  if (pending.length > 0) {
    items.push({
      id: "pending",
      text: `${pending.length} deal${pending.length === 1 ? "" : "s"} have documents pending.`,
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
      text: `${worked} deal${worked === 1 ? "" : "s"} cleared document checks today.`,
      tone: "success",
    });
  }
  return items.length ? loop(items) : quiet(NO_LIVE);
}

function buildTasksLiveMessages(): ChanakyaLiveIntelligenceMessage[] {
  const insights = buildChanakyaWorkloadInsights();
  const items: ChanakyaLiveIntelligenceMessage[] = insights.slice(0, 6).map((i) => ({
    id: i.id,
    text: i.text,
    tone:
      i.tone === "danger"
        ? "danger"
        : i.tone === "warning"
          ? "warning"
          : i.tone === "success"
            ? "success"
            : "info",
  }));
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
      text: `${lender}: ${count} deal${count === 1 ? "" : "s"} need attention.`,
      tone: "warning",
    });
  }
  return items.length ? loop(items) : quiet("Lender book is stable — no escalation signals.");
}

function buildOpportunitiesLiveMessages(): ChanakyaLiveIntelligenceMessage[] {
  const { items: opps, hydrated } = getLiveOpportunitiesSync();
  if (!hydrated) {
    return quiet("Loading live Opportunity Registry signals…");
  }
  if (opps.length === 0) {
    return quiet(NO_LIVE);
  }

  const items: ChanakyaLiveIntelligenceMessage[] = [];
  items.push({
    id: "opp-count",
    text: `${opps.length} active opportunit${opps.length === 1 ? "y" : "ies"} in the live registry.`,
    tone: "info",
  });

  const onHold = opps.filter((o) => (o.lifecycleStatus || "").toLowerCase() === "on_hold").length;
  if (onHold > 0) {
    items.push({
      id: "opp-hold",
      text: `${onHold} opportunit${onHold === 1 ? "y is" : "ies are"} on hold.`,
      tone: "warning",
    });
  }

  const requirement = opps.filter(
    (o) => (o.lifecycleStatus || "").toLowerCase() === "requirement_captured",
  ).length;
  if (requirement > 0) {
    items.push({
      id: "opp-req",
      text: `${requirement} opportunit${requirement === 1 ? "y has" : "ies have"} requirement captured.`,
      tone: "success",
    });
  }

  const active = getActiveOpportunityContext();
  if (active?.opportunityId) {
    const match = opps.find(
      (o) =>
        o.id === active.opportunityId ||
        o.opportunityNumber === active.opportunityReference ||
        o.opportunityNumber === active.opportunityId,
    );
    if (match) {
      const label =
        match.primaryContactName ||
        match.companyName ||
        match.opportunityNumber ||
        "Current Opportunity";
      items.push({
        id: "opp-active",
        text: `Open context: ${label}${match.productLabel ? ` · ${match.productLabel}` : ""}.`,
        tone: "info",
      });
    } else {
      items.push({
        id: "opp-active-missing",
        text: "Active Opportunity context is not present in the live registry.",
        tone: "warning",
      });
    }
  }

  return loop(items);
}

export type BuildChanakyaLiveIntelligenceOptions = {
  portfolio?: LiveDealPortfolio;
  entity?: ChanakyaLiveEntityRef | null;
};

/**
 * Resolve contextual Live Intelligence messages for a workspace.
 * Loan-linked contexts reuse Radar SSOT rows — no parallel metric engines.
 * CO-CHANAKYA-007 — refuses untrusted local/demo fallback when Registry is operational.
 */
export function buildChanakyaLiveIntelligenceMessages(
  workspace: ChanakyaLiveIntelligenceWorkspace,
  options?: BuildChanakyaLiveIntelligenceOptions,
): ChanakyaLiveIntelligenceMessage[] {
  try {
    if (workspace === "contacts") return buildContactsLiveMessages();
    if (workspace === "tasks") return buildTasksLiveMessages();
    if (workspace === "opportunities") return buildOpportunitiesLiveMessages();
    if (workspace === "accounting") {
      return quiet("Accounting signals monitor live ledgers — open CHANAKYA for detail.");
    }
    if (workspace === "horizon") {
      return quiet("Horizon outlook monitors live forecasts — open CHANAKYA for detail.");
    }

    const base =
      options?.portfolio ?? resolveLiveDealPortfolio(loadRadarDealFilesSync());
    const active = getActiveOpportunityContext();
    const entity: ChanakyaLiveEntityRef = {
      dealId: options?.entity?.dealId,
      fileId: options?.entity?.fileId,
      opportunityId:
        options?.entity?.opportunityId ||
        (workspace === "loan_files" ? active?.opportunityId : undefined),
    };
    const portfolio =
      workspace === "loan_files"
        ? scopeLiveDealPortfolioToEntity(base, entity)
        : base;

    if (!portfolio.isLiveTrusted) {
      return quiet(portfolio.reason || NO_LIVE);
    }

    if (dealBookWorkspaces(workspace) && portfolio.files.length === 0) {
      return quiet(portfolio.reason || NO_LIVE);
    }

    const model = buildChanakyaRadarDashboard(portfolio.files);
    const { rows, intelligence } = model;

    switch (workspace) {
      case "mission_control":
      case "radar":
      case "my_deals":
      case "default":
        return buildMissionControlLiveMessages(rows, intelligence);
      case "loan_files":
        return buildLoanFilesLiveMessages(rows);
      case "documents":
        return buildDocumentsLiveMessages(rows);
      case "lenders":
        return buildLendersLiveMessages(rows);
      default:
        return buildMissionControlLiveMessages(rows, intelligence);
    }
  } catch {
    return quiet("CHANAKYA intelligence temporarily unavailable.");
  }
}
