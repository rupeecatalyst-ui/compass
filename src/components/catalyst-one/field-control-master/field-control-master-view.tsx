"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Library } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  CERTIFIED_FIELD_CONTROL_LIST_PATH,
  GOVERNANCE_EMPTY_MESSAGE,
  GOVERNANCE_ERROR_MESSAGE,
  GOVERNANCE_LOADING_MESSAGE,
  GOVERNANCE_MODE_BADGE,
  GOVERNANCE_SAFETY_BANNER,
  classificationLabel,
  fieldTypeLabel,
  filterGovernanceDefinitions,
  governanceDetail,
  governanceFilterOptions,
  governanceSummary,
  lifecycleLabel,
  owningDomainLabel,
  ownershipReviewLabel,
  runtimeStatusLabel,
  sourceTableLabel,
  type GovernanceFilter,
} from "@/lib/field-control-master/governance-presentation";
import type { FieldControlGovernanceDefinition } from "@/lib/field-control-master/production-governance-read";
import type { ApiResponse } from "@/types/api";
import { cn } from "@/lib/utils";

const EMPTY_FILTER: GovernanceFilter = {
  q: "",
  owningDomain: "",
  classification: "",
  lifecycleStatus: "",
  ownershipReview: "",
};

type LoadPhase = "loading" | "ready" | "error";

export function FieldControlMasterView() {
  const [phase, setPhase] = useState<LoadPhase>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [definitions, setDefinitions] = useState<FieldControlGovernanceDefinition[]>([]);
  const [filter, setFilter] = useState<GovernanceFilter>(EMPTY_FILTER);
  const [openId, setOpenId] = useState<string | null>(null);
  const options = useMemo(() => governanceFilterOptions(), []);

  useEffect(() => {
    let cancelled = false;
    async function loadCertifiedDefinitions() {
      setPhase("loading");
      setDefinitions([]);
      try {
        const response = await authenticatedJsonFetch(CERTIFIED_FIELD_CONTROL_LIST_PATH, { method: "GET" });
        const body = (await response.json()) as ApiResponse<{ definitions: FieldControlGovernanceDefinition[] }>;
        if (cancelled) return;
        if (!response.ok || !body.success || !Array.isArray(body.data?.definitions)) {
          setDefinitions([]);
          setPhase("error");
          return;
        }
        setDefinitions(body.data.definitions);
        setPhase("ready");
      } catch {
        if (!cancelled) {
          setDefinitions([]);
          setPhase("error");
        }
      }
    }
    void loadCertifiedDefinitions();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const summary = useMemo(() => governanceSummary(definitions), [definitions]);
  const visible = useMemo(() => filterGovernanceDefinitions(definitions, filter), [definitions, filter]);
  const selected = definitions.find((row) => row.id === openId) ?? null;
  const detail = selected ? governanceDetail(selected) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Field Control Master"
        description="Certified field identities for governance review."
        actions={
          <Badge variant="outline" className="gap-2 px-3 py-1.5 text-[11px] font-semibold">
            <Library className="h-3.5 w-3.5" aria-hidden />
            {GOVERNANCE_MODE_BADGE}
          </Badge>
        }
      />

      <div role="status" className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
        {GOVERNANCE_SAFETY_BANNER}
      </div>

      {phase === "loading" ? (
        <div role="status" aria-live="polite" className="space-y-4">
          <p className="text-sm text-muted-foreground">{GOVERNANCE_LOADING_MESSAGE}</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : null}

      {phase === "error" ? (
        <div role="alert" className="space-y-3 rounded-md border border-border bg-card px-4 py-4 text-card-foreground">
          <p className="text-sm font-medium">{GOVERNANCE_ERROR_MESSAGE}</p>
          <button
            type="button"
            className="h-9 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      ) : null}

      {phase === "ready" ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="Total definitions" value={summary.total} />
            <SummaryCard label="Raw canonical" value={summary.rawCanonical} />
            <SummaryCard label="Derived" value={summary.derived} />
            <SummaryCard label="Runtime-controlled" value={summary.runtimeControlled} />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <FilterField label="Search">
              <input
                value={filter.q}
                onChange={(event) => setFilter((current) => ({ ...current, q: event.target.value }))}
                placeholder="Field id or label"
                className="h-9 min-w-[16rem] rounded-md border border-border bg-background px-3 text-sm text-foreground"
              />
            </FilterField>
            <EnumFilter
              label="Owning domain"
              value={filter.owningDomain}
              options={options.owningDomain}
              onChange={(owningDomain) =>
                setFilter((current) => ({ ...current, owningDomain: owningDomain as GovernanceFilter["owningDomain"] }))
              }
            />
            <EnumFilter
              label="Classification"
              value={filter.classification}
              options={options.classification}
              onChange={(classification) =>
                setFilter((current) => ({
                  ...current,
                  classification: classification as GovernanceFilter["classification"],
                }))
              }
            />
            <EnumFilter
              label="Lifecycle status"
              value={filter.lifecycleStatus}
              options={options.lifecycleStatus}
              onChange={(lifecycleStatus) =>
                setFilter((current) => ({
                  ...current,
                  lifecycleStatus: lifecycleStatus as GovernanceFilter["lifecycleStatus"],
                }))
              }
            />
            <EnumFilter
              label="Ownership review"
              value={filter.ownershipReview}
              options={options.ownershipReview}
              onChange={(ownershipReview) =>
                setFilter((current) => ({
                  ...current,
                  ownershipReview: ownershipReview as GovernanceFilter["ownershipReview"],
                }))
              }
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
              <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["Field", "Type", "Classification", "Owning domain", "Source", "Lifecycle", "Ownership review", "Runtime status"].map(
                    (heading) => (
                      <th key={heading} className="px-3 py-2 font-semibold">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      {GOVERNANCE_EMPTY_MESSAGE}
                    </td>
                  </tr>
                ) : (
                  visible.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => setOpenId(row.id)}
                        >
                          <div className="font-medium text-foreground">{row.friendlyLabel}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{row.fieldId}</div>
                        </button>
                      </td>
                      <td className="px-3 py-2 text-foreground">{fieldTypeLabel(row.fieldType)}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary">{classificationLabel(row.classification)}</Badge>
                      </td>
                      <td className="px-3 py-2 text-foreground">{owningDomainLabel(row.owningDomain)}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-foreground">{sourceTableLabel(row.sourceBinding)}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{lifecycleLabel(row.lifecycleStatus)}</Badge>
                      </td>
                      <td className="px-3 py-2 text-foreground">{ownershipReviewLabel(row.ownershipReview)}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{runtimeStatusLabel(row.controlsRuntime)}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) setOpenId(null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl" data-readonly="true">
          {selected && detail ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.friendlyLabel}</SheetTitle>
                <SheetDescription className="font-mono text-xs">{selected.fieldId}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                {detail.factLabel ? <Badge variant="secondary">{detail.factLabel}</Badge> : null}
                {detail.notes.map((note) => (
                  <p key={note} className="text-sm text-foreground">
                    {note}
                  </p>
                ))}
                {detail.sections.map((section) => (
                  <section key={section.title} className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</h3>
                    <dl className="space-y-2">
                      {section.rows.map((item) => (
                        <div key={item.label}>
                          <dt className="text-xs text-muted-foreground">{item.label}</dt>
                          <dd className={cn("text-sm text-foreground", item.label === "Field ID" && "font-mono text-xs")}>
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 text-card-foreground">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
      {label}
      {children}
    </label>
  );
}

function EnumFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <FilterField label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FilterField>
  );
}
