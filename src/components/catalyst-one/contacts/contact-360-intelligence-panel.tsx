"use client";

/**
 * CO-C1-CONTACT-360-UX-REFINEMENT-002 — primary Relationship Intelligence surface.
 * Consumes composeContact360Snapshot only — no parallel SSOT.
 */

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  formatContact360When,
  type Contact360RelationshipSection,
  type Contact360Snapshot,
} from "@/lib/enterprise-contact-master/compose-contact-360";
import { cn } from "@/lib/utils";

const SECTION_EMPTY_HINT: Record<string, string> = {
  companies: "No linked companies",
  opportunities: "No linked opportunities",
  deals: "No linked deals",
  loans: "No disbursed loans",
  lenders: "No linked lenders",
  wealth_partners: "No linked wealth partners",
  co_applicants: "No co-applicants derived",
  guarantors: "No guarantors derived",
  referrers: "No referrers / introducers derived",
  documents: "No documents in context",
  tasks: "No open tasks for this contact",
  communication: "No communication events stamped for this contact",
  explicit: "No explicit relationships",
};

function SnapshotKpis({
  snapshot,
  loading,
}: {
  snapshot: Contact360Snapshot | null;
  loading: boolean;
}) {
  const kpis: Array<{ label: string; value: string | number }> = [
    { label: "Total Opportunities", value: snapshot?.totalOpportunities ?? "—" },
    { label: "Current Opportunities", value: snapshot?.currentOpportunities ?? "—" },
    { label: "Total Deals", value: snapshot?.totalDeals ?? "—" },
    { label: "Active Deals", value: snapshot?.activeDeals ?? "—" },
    { label: "Loans / Disbursed", value: snapshot?.disbursedDeals ?? "—" },
    { label: "Total Business Value", value: snapshot?.totalBusinessValueLabel ?? "—" },
    { label: "Last Action", value: formatContact360When(snapshot?.lastActionAt) },
    { label: "Last Dialogue", value: formatContact360When(snapshot?.lastDialogueAt) },
    { label: "Last Opportunity", value: formatContact360When(snapshot?.lastOpportunityAt) },
  ];

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-tight text-zinc-100">
          Business Snapshot
        </h3>
        {loading ? <span className="text-[10px] text-zinc-500">Refreshing…</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-md border border-zinc-800/80 bg-zinc-950/60 px-2 py-1.5"
          >
            <p className="text-[9px] uppercase tracking-wide text-zinc-500">{kpi.label}</p>
            <p className="mt-0.5 truncate text-[12px] font-semibold tabular-nums text-zinc-100">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RelationshipSectionCard({
  section,
  onAddRelationship,
}: {
  section: Contact360RelationshipSection;
  onAddRelationship?: () => void;
}) {
  const empty = section.items.length === 0;
  const showAdd =
    empty &&
    onAddRelationship &&
    (section.category === "companies" ||
      section.category === "explicit" ||
      section.category === "wealth_partners" ||
      section.category === "referrers");

  return (
    <section className="rounded-md border border-zinc-800/90 bg-zinc-950/40">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/70 px-2.5 py-1.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            {section.title}
          </h4>
          <span className="tabular-nums text-[10px] text-zinc-600">{section.items.length}</span>
        </div>
        {showAdd ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] text-teal-300 hover:bg-teal-950/40 hover:text-teal-200"
            onClick={onAddRelationship}
          >
            Add Relationship
          </Button>
        ) : null}
      </div>
      {empty ? (
        <p className="px-2.5 py-1.5 text-[11px] text-zinc-500">
          {SECTION_EMPTY_HINT[section.category] ?? "None"}
        </p>
      ) : (
        <ul className="max-h-36 divide-y divide-zinc-800/60 overflow-y-auto">
          {section.items.slice(0, 12).map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-2 px-2.5 py-1.5 text-[11px]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-100">{item.label}</p>
                {item.detail ? (
                  <p className="truncate text-[10px] text-zinc-500">{item.detail}</p>
                ) : null}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded border px-1 py-0 text-[9px] uppercase tracking-wide",
                  item.derived
                    ? "border-zinc-700 text-zinc-500"
                    : "border-teal-800/60 text-teal-300/90",
                )}
              >
                {item.derived ? "Auto" : "Explicit"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentActivityStrip({
  snapshot,
  onOpenActivity,
}: {
  snapshot: Contact360Snapshot | null;
  onOpenActivity?: () => void;
}) {
  const rows = snapshot?.recentActivity?.slice(0, 6) ?? [];
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-2.5 py-1.5">
        <h3 className="text-xs font-semibold tracking-tight text-zinc-100">
          Recent Activity
        </h3>
        {onOpenActivity ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] text-zinc-400 hover:text-zinc-100"
            onClick={onOpenActivity}
          >
            Full timeline →
          </Button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="px-2.5 py-2 text-[11px] text-zinc-500">
          No contact-scoped EAR events yet
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800/70">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start gap-2 px-2.5 py-1.5 text-[11px]">
              <span className="w-[9.5rem] shrink-0 tabular-nums text-zinc-500">
                {formatContact360When(row.occurredAt)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-zinc-100">{row.title}</p>
                <p className="truncate text-[10px] text-zinc-500">
                  {row.eventKind}
                  {row.summary ? ` · ${row.summary}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Contact360IntelligencePanel({
  snapshot,
  loading,
  onAddRelationship,
  onOpenActivity,
  roleWorkspaceSlot,
}: {
  snapshot: Contact360Snapshot | null;
  loading: boolean;
  onAddRelationship?: () => void;
  onOpenActivity?: () => void;
  /** Collapsed / secondary role dashboard — must not dominate 360° */
  roleWorkspaceSlot?: ReactNode;
}) {
  const sections = snapshot?.relationshipSections ?? [];

  return (
    <div className="flex flex-col gap-2.5">
      <SnapshotKpis snapshot={snapshot} loading={loading} />

      <section className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h3 className="text-xs font-semibold tracking-tight text-zinc-100">
            Relationship Intelligence
          </h3>
          <p className="text-[10px] text-zinc-500">
            Auto-derived from Opportunity · Deal · ECM · EAR · ETE · Documents
          </p>
        </div>
        <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <RelationshipSectionCard
              key={section.category}
              section={section}
              onAddRelationship={onAddRelationship}
            />
          ))}
        </div>
      </section>

      <RecentActivityStrip snapshot={snapshot} onOpenActivity={onOpenActivity} />

      {roleWorkspaceSlot ? (
        <details className="group rounded-lg border border-zinc-800 bg-zinc-900/40 open:bg-zinc-900/60">
          <summary className="cursor-pointer list-none px-2.5 py-2 text-xs font-semibold text-zinc-200 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              <span>Role workspaces (secondary)</span>
              <span className="text-[10px] font-normal text-zinc-500 group-open:hidden">
                Expand
              </span>
              <span className="hidden text-[10px] font-normal text-zinc-500 group-open:inline">
                Collapse
              </span>
            </span>
          </summary>
          <div className="border-t border-zinc-800 px-0 pb-0 pt-0">{roleWorkspaceSlot}</div>
        </details>
      ) : null}
    </div>
  );
}
