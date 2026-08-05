"use client";



/**

 * CO-ARCH-007 / CO-PERF-002 — Manual lender picker = Enterprise Lender Registry browser.

 * Read registry · search by name · exclude Opportunity duplicates · store selection.

 * Does NOT apply product eligibility, recommendation, policy, programme, or AI filters.

 */



import { useEffect, useMemo, useState } from "react";

import { Check, Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";

import {

  searchActiveLenders,

  listLenderPrograms,

} from "@/lib/deal-workspace/lender-program-api";

import {

  listRecentDealLenders,

  rememberDealLender,

} from "@/lib/deal-workspace/recent-deal-lenders";

import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";

import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";



export type EnterpriseLenderSelection = {

  lender: EnterpriseLenderRecord;

  program?: EnterpriseLenderProgramRecord | null;

};



export function EnterpriseLenderSearch({

  excludeLenderIds,

  selectedLenderId,

  selectedProgramId,

  onSelect,

  requireProgram = true,

  /** When true (default), show registry lenders immediately without requiring a keystroke. */

  autoBrowse = true,

  className,

  /** @deprecated Ignored — manual picker never filters by product (CO-ARCH-007). */

  productCode: _productCode,

  /** @deprecated Ignored — manual picker never filters by product (CO-ARCH-007). */

  productLabel: _productLabel,

  /** @deprecated Ignored — manual picker never filters by product (CO-ARCH-007). */

  loanProduct: _loanProduct,

}: {

  productCode?: string | null;

  productLabel?: string | null;

  loanProduct?: string | null;

  excludeLenderIds?: string[];

  selectedLenderId?: string | null;

  selectedProgramId?: string | null;

  onSelect: (next: EnterpriseLenderSelection) => void;

  requireProgram?: boolean;

  autoBrowse?: boolean;

  className?: string;

}) {

  void _productCode;

  void _productLabel;

  void _loanProduct;



  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(false);

  const [lenders, setLenders] = useState<EnterpriseLenderRecord[]>([]);

  const [programs, setPrograms] = useState<EnterpriseLenderProgramRecord[]>([]);

  const [programsLoading, setProgramsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [selectedLender, setSelectedLender] = useState<EnterpriseLenderRecord | null>(

    null,

  );

  const [selectedProgramIdLocal, setSelectedProgramIdLocal] = useState<string | null>(

    selectedProgramId ?? null,

  );

  const [listOpen, setListOpen] = useState(autoBrowse);

  const recent = useMemo(() => listRecentDealLenders(), [lenders.length]);



  useEffect(() => {

    let cancelled = false;

    const handle = window.setTimeout(() => {

      void (async () => {

        setLoading(true);

        setError(null);

        try {

          const q = query.trim();

          const items = await searchActiveLenders({

            search: q || undefined,

            pageSize: 5000,

          });

          if (cancelled) return;

          setLenders(items);

          if (autoBrowse || q.length > 0) setListOpen(true);

        } catch (err) {

          if (!cancelled) {

            setError(err instanceof Error ? err.message : "Lender search failed");

            setLenders([]);

          }

        } finally {

          if (!cancelled) setLoading(false);

        }

      })();

    }, query.trim() ? 200 : 0);

    return () => {

      cancelled = true;

      window.clearTimeout(handle);

    };

  }, [query, autoBrowse]);



  const exclude = useMemo(() => new Set(excludeLenderIds ?? []), [excludeLenderIds]);



  /** Registry pool: active lenders minus those already on this Opportunity. */

  const registryPool = useMemo(

    () =>

      lenders.filter(

        (l) =>

          !exclude.has(l.id) &&

          l.enabled &&

          l.status === "active" &&

          !l.isDeleted,

      ),

    [lenders, exclude],

  );



  const displayLenders = useMemo(() => {

    const q = query.trim().toLowerCase();

    if (!q) return registryPool;

    return registryPool.filter((l) => {

      const hay = [l.displayName, l.label, l.code, l.legalName]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();

      return hay.includes(q);

    });

  }, [registryPool, query]);



  const allAlreadyIdentified =

    !loading &&

    !error &&

    lenders.length > 0 &&

    registryPool.length === 0 &&

    (excludeLenderIds?.length ?? 0) > 0;



  const noMatches =

    !loading && !error && lenders.length > 0 && displayLenders.length === 0 && !allAlreadyIdentified;



  const recentMatches = useMemo(() => {

    const byId = new Map(displayLenders.map((l) => [l.id, l]));

    return recent

      .map((r) => byId.get(r.id))

      .filter((l): l is EnterpriseLenderRecord => Boolean(l));

  }, [recent, displayLenders]);



  useEffect(() => {

    if (!selectedLender?.id) {

      setPrograms([]);

      return;

    }

    let cancelled = false;

    setProgramsLoading(true);

    void (async () => {

      try {

        // All published/active programs for this lender — no product eligibility filter.

        const items = await listLenderPrograms({ lenderId: selectedLender.id });

        if (cancelled) return;

        setPrograms(items);

      } catch {

        if (!cancelled) setPrograms([]);

      } finally {

        if (!cancelled) setProgramsLoading(false);

      }

    })();

    return () => {

      cancelled = true;

    };

  }, [selectedLender?.id]);



  useEffect(() => {

    if (!selectedLenderId || selectedLender?.id === selectedLenderId) return;

    const hit = lenders.find((l) => l.id === selectedLenderId);

    if (hit) setSelectedLender(hit);

  }, [selectedLenderId, lenders, selectedLender?.id]);



  const pickLender = (lender: EnterpriseLenderRecord) => {

    setSelectedLender(lender);

    setSelectedProgramIdLocal(null);

    setQuery("");

    if (autoBrowse) setListOpen(true);

    else setListOpen(false);

    rememberDealLender({

      id: lender.id,

      displayName: lender.displayName || lender.label,

      code: lender.code,

    });

    if (!requireProgram) {

      onSelect({ lender, program: null });

    }

  };



  const pickProgram = (programId: string) => {

    if (!selectedLender) return;

    const program = programs.find((p) => p.id === programId) ?? null;

    setSelectedProgramIdLocal(programId);

    onSelect({ lender: selectedLender, program });

  };



  const emptyMessage = allAlreadyIdentified

    ? "All lenders from the registry that match this search are already on this Opportunity."

    : noMatches

      ? "No lenders match this search in the Enterprise Lender Registry."

      : "No active lenders found in the Enterprise Lender Registry.";



  return (

    <div className={cn("space-y-3", className)} data-manual-lender-registry="true">

      <div>

        <Label className="text-[10px] uppercase text-muted-foreground">

          Search Lender

        </Label>

        <div className="relative mt-1">

          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

          <Input

            className="h-8 pl-8 text-xs"

            placeholder="Search by lender name or code…"

            value={query}

            onChange={(e) => {

              setQuery(e.target.value);

              setListOpen(true);

            }}

            onFocus={() => setListOpen(true)}

            autoComplete="off"

          />

        </div>

        <p className="mt-1 text-[10px] text-muted-foreground">

          Enterprise Lender Registry · active lenders

          {exclude.size > 0

            ? ` · ${exclude.size} already on this Opportunity excluded`

            : ""}

          . Product does not filter this list.

        </p>

      </div>



      {recentMatches.length > 0 && !query.trim() ? (

        <div>

          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">

            Recently used

          </p>

          <div className="flex flex-wrap gap-1.5">

            {recentMatches.slice(0, 5).map((l) => (

              <button

                key={`recent-${l.id}`}

                type="button"

                className={cn(

                  "rounded-md border px-2 py-1 text-[11px] transition-colors",

                  selectedLender?.id === l.id

                    ? "border-teal-600 bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100"

                    : "border-border bg-muted/30 hover:bg-muted/60",

                )}

                onClick={() => pickLender(l)}

              >

                {l.displayName || l.label}

              </button>

            ))}

          </div>

        </div>

      ) : null}



      {listOpen ? (

        <div className="max-h-48 overflow-y-auto overscroll-contain rounded-lg border border-border bg-popover shadow-md">

          {loading ? (

            <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">

              <Loader2 className="h-3.5 w-3.5 animate-spin" />

              Loading lenders…

            </div>

          ) : error ? (

            <p className="px-3 py-3 text-xs text-destructive">{error}</p>

          ) : displayLenders.length === 0 ? (

            <p className="px-3 py-3 text-xs text-muted-foreground">{emptyMessage}</p>

          ) : (

            <ul className="divide-y divide-border/60">

              {displayLenders.map((l) => {

                const active =

                  selectedLender?.id === l.id || selectedLenderId === l.id;

                return (

                  <li key={l.id}>

                    <button

                      type="button"

                      className={cn(

                        "flex w-full items-start gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted/50",

                        active && "bg-teal-50/80 dark:bg-teal-950/30",

                      )}

                      onMouseDown={(e) => e.preventDefault()}

                      onClick={() => pickLender(l)}

                    >

                      <span className="mt-0.5 h-4 w-4 shrink-0">

                        {active ? (

                          <Check className="h-3.5 w-3.5 text-teal-700" />

                        ) : null}

                      </span>

                      <span className="min-w-0 flex-1">

                        <span className="block font-medium text-foreground">

                          {l.displayName || l.label}

                        </span>

                        <span className="block text-[10px] text-muted-foreground">

                          {l.code}

                          {l.institutionCategory

                            ? ` · ${l.institutionCategory}`

                            : ""}

                        </span>

                      </span>

                    </button>

                  </li>

                );

              })}

            </ul>

          )}

        </div>

      ) : null}



      {selectedLender ? (

        <div>

          <Label className="text-[10px] uppercase text-muted-foreground">

            Lender Program{requireProgram ? " *" : ""}

          </Label>

          {programsLoading ? (

            <p className="mt-1 text-[11px] text-muted-foreground">Loading programs…</p>

          ) : programs.length === 0 ? (

            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">

              No active programs for this lender. Select another lender or ask

              Administration to publish a program.

            </p>

          ) : (

            <select

              className="mt-1 flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"

              value={selectedProgramIdLocal ?? selectedProgramId ?? ""}

              onChange={(e) => pickProgram(e.target.value)}

            >

              <option value="">Select program…</option>

              {programs.map((p) => (

                <option key={p.id} value={p.id}>

                  {p.label}

                  {p.productCode ? ` · ${p.productCode}` : ""}

                  {p.roiPercent != null ? ` · ${p.roiPercent}%` : ""}

                </option>

              ))}

            </select>

          )}

          <p className="mt-1 text-[10px] text-muted-foreground">

            Programs are listed for the selected lender only — not filtered by Deal product.

          </p>

        </div>

      ) : null}

    </div>

  );

}


