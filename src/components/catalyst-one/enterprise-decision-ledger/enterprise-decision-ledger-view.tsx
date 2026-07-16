"use client";

import { useEffect, useMemo, useState } from "react";
import { BookMarked, Scale } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { EDL_CHANGE_CATEGORY_LABELS } from "@/constants/enterprise-decision-ledger";
import {
  getEdlRegistrySnapshot,
  listCommercialAgreementVersions,
  listEnterpriseDecisions,
  seedEdlPhase1DemoIfEmpty,
} from "@/lib/enterprise-decision-ledger";
import type { EdlLedgerEntry } from "@/types/enterprise-decision-ledger";
import { cn } from "@/lib/utils";

/**
 * Phase 1 Enterprise Decision Ledger browser.
 * Not an audit log UI — constitutional memory of enterprise decisions.
 */
export function EnterpriseDecisionLedgerView() {
  const [entries, setEntries] = useState<EdlLedgerEntry[]>([]);
  const [snapshot, setSnapshot] = useState(() => getEdlRegistrySnapshot());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    seedEdlPhase1DemoIfEmpty();
    setEntries(listEnterpriseDecisions());
    setSnapshot(getEdlRegistrySnapshot());
  }, []);

  const selected = useMemo(
    () => entries.find((e) => e.ledgerId === selectedId) ?? entries[0] ?? null,
    [entries, selectedId],
  );

  const commercials = listCommercialAgreementVersions();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Enterprise Decision Ledger"
        description="Constitutional memory of Catalyst One — append-only, explainable, never rewritten. Not an audit log."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-[11px]">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span className="tabular-nums font-semibold">{snapshot.entryCount} decisions</span>
            <span className="text-muted-foreground">·</span>
            <span className="tabular-nums">{snapshot.commercialVersionCount} commercial versions</span>
            <span className="text-muted-foreground">· v{snapshot.frameworkVersion}</span>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="overflow-hidden rounded-xl border border-border/70">
          <div className="border-b border-border/60 bg-muted/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ledger entries (newest first)
          </div>
          <ul className="max-h-[28rem] divide-y divide-border/50 overflow-y-auto">
            {entries.length === 0 ? (
              <li className="px-3 py-8 text-center text-xs text-muted-foreground">
                No decisions recorded yet. Enterprise configuration changes will appear here permanently.
              </li>
            ) : (
              entries.map((e) => (
                <li key={e.ledgerId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(e.ledgerId)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/30",
                      selected?.ledgerId === e.ledgerId && "bg-muted/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-semibold text-foreground">
                        {e.ledgerId}
                      </span>
                      <span className="text-[9px] tabular-nums text-muted-foreground">
                        {e.recordedAt.slice(0, 19).replace("T", " ")}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-foreground">
                      {EDL_CHANGE_CATEGORY_LABELS[e.changeCategory] ?? e.changeCategory}
                      <span className="ml-1 font-normal text-muted-foreground">
                        · v{e.versionNumber}
                      </span>
                    </p>
                    <p className="line-clamp-1 text-[10px] text-muted-foreground">
                      {e.relatedEntityLabel || e.relatedEngine}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Decision detail</p>
            </div>
            {!selected ? (
              <p className="text-xs text-muted-foreground">Select a ledger entry.</p>
            ) : (
              <dl className="space-y-2 text-[11px]">
                <Row label="Ledger ID" value={selected.ledgerId} mono />
                <Row label="Requested by" value={selected.requestedBy} />
                <Row label="Approved by" value={selected.approvedBy} />
                {selected.implementedBy ? (
                  <Row label="Implemented by" value={selected.implementedBy} />
                ) : null}
                <Row label="Effective from" value={selected.effectiveFrom.slice(0, 10)} />
                {selected.effectiveUntil ? (
                  <Row label="Effective until" value={selected.effectiveUntil.slice(0, 10)} />
                ) : null}
                <Row label="Version" value={selected.versionNumber} />
                <Row label="Change type" value={selected.changeType} />
                <Row label="Impact scope" value={selected.impactScope} />
                <Row label="Related engine" value={selected.relatedEngine} />
                <Row
                  label="Justification"
                  value={selected.businessJustification}
                />
                {selected.notImpactedNote ? (
                  <Row label="Not impacted" value={selected.notImpactedNote} />
                ) : null}
                <Row
                  label="Previous value"
                  value={safeJson(selected.previousValue)}
                  mono
                />
                <Row label="New value" value={safeJson(selected.newValue)} mono />
              </dl>
            )}
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/15 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Commercial versions (temporal integrity)
            </p>
            {commercials.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No commercial versions yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {commercials.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-border/50 bg-background/70 px-2.5 py-1.5 text-[10px]"
                  >
                    <span className="font-semibold text-foreground">
                      {c.agreementLabel} · v{c.versionNumber}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      from {c.effectiveFrom.slice(0, 10)}
                      {typeof c.terms.commissionPct === "number"
                        ? ` · ${c.terms.commissionPct}%`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 whitespace-pre-wrap break-words text-foreground",
          mono && "font-mono text-[10px]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function safeJson(value: unknown): string {
  if (value === null || value === undefined) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
