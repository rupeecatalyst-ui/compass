"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listPublishedLenderOptionsAsync,
  type PublishedLenderOption,
} from "@/lib/enterprise-lender-registry/published-directory";
import {
  addCompetitionLender,
  getStrategicCompetition,
  removeCompetitionLender,
  setCompetitionAnswer,
  setCompetitionOverride,
  type CompetitionAnswer,
  type StrategicCompetitionState,
} from "@/lib/strategic-competition";
import { cn } from "@/lib/utils";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import { StrategicTabToolbar } from "./strategic-tab-toolbar";
import { OwGlassPanel } from "./workspace-design";

/**
 * Competition tab — Chanakya question + lender capture.
 * CO-LENDER-003 — search Published Enterprise Lender Registry (same SSOT as Manual / LIFE).
 */
export function WorkspaceCompetitionPanel() {
  const { opportunityId, refresh } = useOpportunityWorkspace();
  const [state, setState] = useState<StrategicCompetitionState | null>(null);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [catalog, setCatalog] = useState<PublishedLenderOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const reload = () => {
    if (!opportunityId) return;
    setState(getStrategicCompetition(opportunityId));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId]);

  // Prompt → Yes opens Competition with empty lenders — enable capture without forcing Edit click.
  useEffect(() => {
    if (state?.answer === "yes" && (state.lenders?.length ?? 0) === 0) {
      setEditing(true);
    }
  }, [state?.answer, state?.lenders?.length]);

  // CO-LENDER-003 — same async Published directory as Manual Recommendation / LIFE.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!opportunityId) return;
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    void listPublishedLenderOptionsAsync(debouncedSearch || undefined)
      .then((rows) => {
        if (cancelled) return;
        setCatalog(rows);
        setCatalogLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setCatalog([]);
        setCatalogLoading(false);
        setCatalogError(
          err instanceof Error ? err.message : "Could not load Enterprise Lender Registry.",
        );
        console.error("[CO-LENDER-003] published lender search failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [opportunityId, debouncedSearch]);

  const answer = state?.answer ?? null;
  const canManageLenders =
    answer === "yes" && (editing || (state?.lenders.length ?? 0) === 0);

  const matches = useMemo(() => {
    const taken = new Set(
      (state?.lenders ?? []).flatMap((l) => {
        const ids = [l.lenderRef.replace(/^lender:/, ""), l.enterpriseLenderId].filter(
          Boolean,
        ) as string[];
        return ids;
      }),
    );
    const q = debouncedSearch.toLowerCase();
    return catalog.filter((l) => {
      if (taken.has(l.id) || taken.has(l.code) || (l.localId && taken.has(l.localId))) {
        return false;
      }
      if (!q) return true;
      return `${l.displayName} ${l.legalName} ${l.shortName ?? ""} ${l.code} ${(l.aliases ?? []).join(" ")}`
        .toLowerCase()
        .includes(q);
    });
  }, [catalog, state?.lenders, debouncedSearch]);

  if (!opportunityId) {
    return <p className="text-sm text-zinc-400">Open an opportunity to capture competition.</p>;
  }

  const onAnswer = (next: CompetitionAnswer) => {
    setState(setCompetitionAnswer(opportunityId, next));
    // Selecting Yes must open lender capture immediately (no hidden Edit gate).
    if (next === "yes") setEditing(true);
    refresh();
  };

  const selectLender = (l: PublishedLenderOption) => {
    setState(
      addCompetitionLender(opportunityId, {
        lenderRef: `lender:${l.id}`,
        lenderName: l.displayName,
        enterpriseLenderId: l.id,
      }),
    );
    setSearch("");
    refresh();
  };

  return (
    <div className="space-y-3">
      <StrategicTabToolbar
        title="Competition"
        description="Capture parallel lender processing so LIFE recommendations stay intentional."
        editing={editing}
        onEditToggle={() => setEditing((v) => !v)}
      />

      <OwGlassPanel className="!p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-300/90">
          Chanakya
        </p>
        <p className="mt-1.5 text-sm font-semibold text-zinc-50">
          Is this opportunity already being processed by another lender?
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["yes", "Yes"],
              ["no", "No"],
              ["not_sure", "Not Sure"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={answer === value ? "default" : "outline"}
              className={cn(
                "h-8 text-xs",
                answer === value
                  ? "bg-teal-600 text-white hover:bg-teal-500"
                  : "border-white/15 bg-zinc-950/40",
              )}
              onClick={() => onAnswer(value)}
              disabled={!editing && answer !== null}
            >
              {label}
            </Button>
          ))}
        </div>
        {!editing && answer !== null && (
          <p className="mt-2 text-[11px] text-zinc-500">
            Click Edit to change the answer or manage competition lenders.
          </p>
        )}
      </OwGlassPanel>

      {answer === "yes" && (
        <OwGlassPanel className="!p-3">
          <p className="text-xs font-semibold text-zinc-100">Competition lenders</p>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            Search the Enterprise Lender Registry (Published · Active). Selected lenders are
            excluded from Chanakya Recommendations and Manual Selection unless you override.
          </p>

          {canManageLenders && (
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ICICI, SBI, Axis, Kotak…"
                className="h-9 border-white/10 bg-zinc-950/50 pl-8 text-sm"
                autoFocus={editing || (state?.lenders.length ?? 0) === 0}
              />
            </div>
          )}

          {canManageLenders && catalogLoading && (
            <p className="mt-2 text-[11px] text-zinc-500">Searching Enterprise Lender Registry…</p>
          )}
          {canManageLenders && catalogError && (
            <p className="mt-2 text-[11px] text-rose-300">{catalogError}</p>
          )}
          {canManageLenders && !catalogLoading && !catalogError && matches.length === 0 && (
            <p className="mt-2 text-[11px] text-zinc-500">
              {debouncedSearch
                ? `No published lenders match “${debouncedSearch}”.`
                : "No published lenders available in the Enterprise Lender Registry."}
            </p>
          )}

          {canManageLenders && matches.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {matches.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-zinc-950/40 px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-white/10"
                    onClick={() => selectLender(l)}
                  >
                    <span>{l.displayName}</span>
                    <span className="text-[10px] text-teal-300">Select</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <ul className="mt-3 space-y-1.5">
            {(state?.lenders ?? []).length === 0 && (
              <li className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-zinc-500">
                Select at least one competing lender.
              </li>
            )}
            {(state?.lenders ?? []).map((l) => (
              <li
                key={l.lenderRef}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/25 bg-rose-500/5 px-2.5 py-2"
              >
                <div>
                  <p className="text-xs font-semibold text-zinc-50">{l.lenderName}</p>
                  <p className="text-[10px] text-zinc-500">
                    {l.overrideAllow
                      ? "Override active — allowed in LIFE"
                      : "Excluded from LIFE selection"}
                  </p>
                </div>
                {editing && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-white/15 text-[10px]"
                      onClick={() => {
                        setState(
                          setCompetitionOverride(
                            opportunityId,
                            l.enterpriseLenderId || l.lenderRef,
                            !l.overrideAllow,
                          ),
                        );
                        refresh();
                      }}
                    >
                      {l.overrideAllow ? "Revoke override" : "Override"}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-zinc-400"
                      onClick={() => {
                        setState(
                          removeCompetitionLender(
                            opportunityId,
                            l.enterpriseLenderId || l.lenderRef,
                          ),
                        );
                        refresh();
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </OwGlassPanel>
      )}

      {answer === "no" && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-100/90">
          No competing lender recorded. Full LIFE catalogue remains available.
        </p>
      )}

      {answer === "not_sure" && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-100/90">
          Noted. Confirm competition before finalising the Execution Queue.
        </p>
      )}
    </div>
  );
}

/** First-entry Chanakya prompt when competition answer is unknown. */
export function StrategicCompetitionEntryPrompt({
  open,
  onClose,
  onGoToCompetition,
}: {
  open: boolean;
  onClose: () => void;
  onGoToCompetition: () => void;
}) {
  const { opportunityId, refresh } = useOpportunityWorkspace();
  if (!open || !opportunityId) return null;

  const choose = (answer: Exclude<CompetitionAnswer, null>) => {
    setCompetitionAnswer(opportunityId, answer);
    refresh();
    onClose();
    if (answer === "yes") onGoToCompetition();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="competition-prompt-title"
        className="w-full max-w-md rounded-2xl border border-white/15 bg-zinc-950 p-5 shadow-2xl"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-300/90">
          Chanakya
        </p>
        <h2 id="competition-prompt-title" className="mt-1.5 text-base font-semibold text-zinc-50">
          Is this opportunity already being processed by another lender?
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-400">
          Competition lenders are excluded from Chanakya Recommendations and Manual Selection.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" className="h-9" onClick={() => choose("yes")}>
            Yes
          </Button>
          <Button type="button" variant="secondary" className="h-9" onClick={() => choose("no")}>
            No
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 border-white/15"
            onClick={() => choose("not_sure")}
          >
            Not Sure
          </Button>
        </div>
        <button
          type="button"
          className="mt-3 text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
          onClick={onClose}
        >
          Remind me on Competition tab
        </button>
      </div>
    </div>
  );
}
