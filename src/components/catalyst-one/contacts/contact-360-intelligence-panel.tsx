"use client";

/**
 * CO-C1-CONTACT-360-UX-REFINEMENT-002 — primary Relationship Intelligence surface.
 * Consumes composeContact360Snapshot only — no parallel SSOT.
 */

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  formatContact360When,
  snapshotItemsForMeasure,
  type Contact360DerivedLink,
  type Contact360RelationshipSection,
  type Contact360Snapshot,
  type Contact360SnapshotMeasureId,
  type Contact360TimelineRow,
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
  accounting: "No disbursement or accounting read views",
  explicit: "No explicit relationships",
};

function SnapshotKpis({
  snapshot,
  loading,
  activeMeasure,
  onSelectMeasure,
}: {
  snapshot: Contact360Snapshot | null;
  loading: boolean;
  activeMeasure: Contact360SnapshotMeasureId | null;
  onSelectMeasure: (id: Contact360SnapshotMeasureId) => void;
}) {
  const kpis: Array<{
    id: Contact360SnapshotMeasureId;
    label: string;
    value: string | number;
  }> = [
    { id: "total_opportunities", label: "Total Opportunities", value: snapshot?.totalOpportunities ?? "—" },
    { id: "current_opportunities", label: "Current Opportunities", value: snapshot?.currentOpportunities ?? "—" },
    { id: "total_deals", label: "Total Deals", value: snapshot?.totalDeals ?? "—" },
    { id: "active_deals", label: "Active Deals", value: snapshot?.activeDeals ?? "—" },
    { id: "loans_disbursed", label: "Loans / Disbursed", value: snapshot?.disbursedDeals ?? "—" },
    { id: "total_business_value", label: "Total Business Value", value: snapshot?.totalBusinessValueLabel ?? "—" },
    { id: "last_action", label: "Last Action", value: formatContact360When(snapshot?.lastActionAt) },
    { id: "last_dialogue", label: "Last Dialogue", value: formatContact360When(snapshot?.lastDialogueAt) },
    { id: "last_opportunity", label: "Last Opportunity", value: formatContact360When(snapshot?.lastOpportunityAt) },
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
          <button
            key={kpi.id}
            type="button"
            onClick={() => onSelectMeasure(kpi.id)}
            className={cn(
              "rounded-md border bg-zinc-950/60 px-2 py-1.5 text-left transition hover:border-teal-700 hover:bg-zinc-900",
              activeMeasure === kpi.id
                ? "border-teal-600 ring-1 ring-teal-700/60"
                : "border-zinc-800/80",
            )}
          >
            <p className="text-[9px] uppercase tracking-wide text-zinc-500">{kpi.label}</p>
            <p className="mt-0.5 truncate text-[12px] font-semibold tabular-nums text-zinc-100">
              {kpi.value}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

function RelationshipSectionCard({
  section,
  highlighted,
  onAddRelationship,
  onOpenHref,
  readOnly,
}: {
  section: Contact360RelationshipSection;
  highlighted?: boolean;
  onAddRelationship?: () => void;
  onOpenHref?: (href: string) => void;
  readOnly?: boolean;
}) {
  const empty = section.items.length === 0;
  const showAdd =
    empty &&
    !readOnly &&
    onAddRelationship &&
    (section.category === "companies" ||
      section.category === "explicit" ||
      section.category === "wealth_partners" ||
      section.category === "referrers");

  return (
    <section
      id={`contact-360-section-${section.category}`}
      className={cn(
        "rounded-md border bg-zinc-950/40",
        highlighted ? "border-teal-700 ring-1 ring-teal-800/70" : "border-zinc-800/90",
      )}
    >
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
                {item.hrefHint && onOpenHref ? (
                  <button
                    type="button"
                    className="truncate font-medium text-teal-200 hover:underline"
                    onClick={() => onOpenHref(item.hrefHint!)}
                  >
                    {item.label}
                  </button>
                ) : (
                  <p className="truncate font-medium text-zinc-100">{item.label}</p>
                )}
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

function UnifiedTimelineStrip({
  snapshot,
  onOpenActivity,
  onOpenHref,
  highlighted,
}: {
  snapshot: Contact360Snapshot | null;
  onOpenActivity?: () => void;
  onOpenHref?: (href: string) => void;
  highlighted?: boolean;
}) {
  const rows = snapshot?.unifiedTimeline?.slice(0, 8) ?? [];
  return (
    <section
      id="contact-360-section-timeline"
      className={cn(
        "rounded-lg border bg-zinc-900/50",
        highlighted ? "border-teal-700 ring-1 ring-teal-800/70" : "border-zinc-800",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-2.5 py-1.5">
        <h3 className="text-xs font-semibold tracking-tight text-zinc-100">
          Unified Activity Timeline
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
          No graph-scoped activity yet
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800/70">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start gap-2 px-2.5 py-1.5 text-[11px]">
              <span className="w-[9.5rem] shrink-0 tabular-nums text-zinc-500">
                {formatContact360When(row.occurredAt)}
              </span>
              <div className="min-w-0 flex-1">
                {row.href && onOpenHref ? (
                  <button
                    type="button"
                    className="truncate text-left font-medium text-teal-200 hover:underline"
                    onClick={() => onOpenHref(row.href!)}
                  >
                    {row.summary}
                  </button>
                ) : (
                  <p className="truncate text-zinc-100">{row.summary}</p>
                )}
                <p className="truncate text-[10px] text-zinc-500">
                  {row.type}
                  {row.companyLabel ? ` · ${row.companyLabel}` : ""}
                  {row.opportunityRef ? ` · ${row.opportunityRef}` : ""}
                  {row.dealRef ? ` · ${row.dealRef}` : ""}
                  {row.employee ? ` · ${row.employee}` : ""}
                  {` · ${row.sourceWorkspace}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MeasureRecords({
  snapshot,
  measure,
  onOpenHref,
}: {
  snapshot: Contact360Snapshot;
  measure: Contact360SnapshotMeasureId;
  onOpenHref: (href: string) => void;
}) {
  const rows = snapshotItemsForMeasure(snapshot, measure);
  if (!rows.length) {
    return (
      <p className="text-[11px] text-zinc-500">
        No qualifying records for this measure.
      </p>
    );
  }
  return (
    <ul className="max-h-40 divide-y divide-zinc-800/70 overflow-y-auto rounded-md border border-zinc-800">
      {rows.slice(0, 20).map((row) => {
        const derived = row as Contact360DerivedLink;
        const timeline = row as Contact360TimelineRow;
        const label = "label" in derived && derived.label ? derived.label : timeline.summary;
        const href = derived.hrefHint || timeline.href;
        const detail =
          "detail" in derived && derived.detail
            ? derived.detail
            : [timeline.companyLabel, timeline.opportunityRef, timeline.dealRef]
                .filter(Boolean)
                .join(" · ");
        return (
          <li key={"id" in row ? row.id : label} className="px-2.5 py-1.5 text-[11px]">
            {href ? (
              <button
                type="button"
                className="truncate text-left font-medium text-teal-200 hover:underline"
                onClick={() => onOpenHref(href)}
              >
                {label}
              </button>
            ) : (
              <p className="truncate font-medium text-zinc-100">{label}</p>
            )}
            {detail ? <p className="truncate text-[10px] text-zinc-500">{detail}</p> : null}
          </li>
        );
      })}
    </ul>
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
  const router = useRouter();
  const [activeMeasure, setActiveMeasure] = useState<Contact360SnapshotMeasureId | null>(null);
  const sections = snapshot?.relationshipSections ?? [];
  const focusCategory = activeMeasure && snapshot?.measureFocus[activeMeasure];

  const onOpenHref = (href: string) => {
    router.push(href);
  };

  const onSelectMeasure = (id: Contact360SnapshotMeasureId) => {
    setActiveMeasure(id);
    const target =
      snapshot?.measureFocus[id] === "timeline"
        ? "contact-360-section-timeline"
        : `contact-360-section-${snapshot?.measureFocus[id] ?? "opportunities"}`;
    requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    if (id === "last_action") onOpenActivity?.();
  };

  const highlightedCategory = useMemo(() => {
    if (focusCategory === "timeline") return null;
    return focusCategory ?? null;
  }, [focusCategory]);

  return (
    <div className="flex flex-col gap-2.5">
      {snapshot?.archivedReadOnly ? (
        <div className="rounded-md border border-amber-800/70 bg-amber-950/40 px-2.5 py-2 text-[11px] text-amber-100">
          This Contact is archived. Historical companies, Opportunities, Deals, activities,
          documents and communications remain visible. The workspace is read-only and the Contact
          is not reactivated.
        </div>
      ) : null}
      {snapshot?.activeTransactionWarning ? (
        <div
          role="alert"
          className="rounded-md border border-red-800/70 bg-red-950/40 px-2.5 py-2 text-[11px] text-red-100"
        >
          {snapshot.activeTransactionWarning}
        </div>
      ) : null}

      <SnapshotKpis
        snapshot={snapshot}
        loading={loading}
        activeMeasure={activeMeasure}
        onSelectMeasure={onSelectMeasure}
      />

      {snapshot && activeMeasure ? (
        <section className="rounded-md border border-zinc-800 bg-zinc-950/50 p-2.5">
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
            Snapshot records
          </p>
          <MeasureRecords snapshot={snapshot} measure={activeMeasure} onOpenHref={onOpenHref} />
        </section>
      ) : null}

      <section className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h3 className="text-xs font-semibold tracking-tight text-zinc-100">
            Relationship Intelligence
          </h3>
          <p className="text-[10px] text-zinc-500">
            Canonical IDs · Contact · Company · Opportunity · Deal
          </p>
        </div>
        <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <RelationshipSectionCard
              key={section.category}
              section={section}
              highlighted={highlightedCategory === section.category}
              onAddRelationship={snapshot?.archivedReadOnly ? undefined : onAddRelationship}
              onOpenHref={onOpenHref}
              readOnly={snapshot?.archivedReadOnly}
            />
          ))}
        </div>
      </section>

      <UnifiedTimelineStrip
        snapshot={snapshot}
        onOpenActivity={onOpenActivity}
        onOpenHref={onOpenHref}
        highlighted={focusCategory === "timeline"}
      />

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
