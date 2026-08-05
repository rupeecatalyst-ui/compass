"use client";

/**
 * CO-BUG-TASK-ENTITY-LINK — Link To picker for Enterprise Task create.
 * Contact / Opportunity / Deal → respective Enterprise Registry SSOTs only.
 * No free-text entity linking. Store Entity ID + snapshot fields.
 */

import { useEffect, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { LiveEntityMasterSearch } from "@/components/catalyst-one/shared/live-entity-master-search";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ENTERPRISE_SEARCH_DROPDOWN_LIST_CLASS,
  ENTERPRISE_SEARCH_MAX_RESULTS,
} from "@/constants/enterprise-search-autocomplete";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { cn } from "@/lib/utils";

export type TaskLinkEntityKind = "contact" | "opportunity" | "deal";

export type TaskLinkedEntity = {
  kind: TaskLinkEntityKind;
  /** Registry primary key — never display-name alone */
  id: string;
  /** Primary display line */
  label: string;
  /** Secondary line (number · product · lender · RM) */
  subtitle?: string;
  customerName?: string;
  product?: string;
  lenderName?: string;
  rmName?: string;
  mobile?: string;
  opportunityNumber?: string;
  dealNumber?: string;
  contactId?: string;
  opportunityId?: string;
};

type Props = {
  value: TaskLinkedEntity | null;
  onChange: (next: TaskLinkedEntity | null) => void;
  className?: string;
  required?: boolean;
};

function registryLabel(kind: TaskLinkEntityKind): string {
  switch (kind) {
    case "contact":
      return "Enterprise Contact Registry";
    case "opportunity":
      return "Enterprise Opportunity Registry";
    case "deal":
      return "Enterprise Deal Registry";
  }
}

function searchPlaceholder(kind: TaskLinkEntityKind): string {
  switch (kind) {
    case "contact":
      return "Search Contact by name, mobile, email, ID…";
    case "opportunity":
      return "Search Opportunity by customer, OPP number, mobile, product, RM…";
    case "deal":
      return "Search Deal by DEAL number, customer, product, lender, RM…";
  }
}

export function TaskEntityLinkPicker({
  value,
  onChange,
  className,
  required = true,
}: Props) {
  const [kind, setKind] = useState<TaskLinkEntityKind>(value?.kind ?? "contact");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<TaskLinkedEntity[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (value?.kind) setKind(value.kind);
  }, [value?.kind]);

  useEffect(() => {
    if (kind === "contact") {
      setHits([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      void (async () => {
        try {
          if (kind === "opportunity") {
            const page = await enterpriseOpportunityApiClient.searchOpportunities({
              q,
              limit: ENTERPRISE_SEARCH_MAX_RESULTS,
            });
            if (cancelled) return;
            setHits(
              page.items.map((o) => {
                const customer =
                  o.primaryContactName?.trim() ||
                  o.companyName?.trim() ||
                  undefined;
                const product = o.productLabel?.trim() || o.productCode?.trim() || undefined;
                const rm = o.relationshipManagerName?.trim() || undefined;
                const subtitle = [
                  o.opportunityNumber,
                  product,
                  o.primaryContactMobile,
                  rm ? `RM: ${rm}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return {
                  kind: "opportunity" as const,
                  id: o.id,
                  label: customer || o.opportunityNumber || o.id,
                  subtitle,
                  customerName: customer,
                  product,
                  rmName: rm,
                  mobile: o.primaryContactMobile?.trim() || undefined,
                  opportunityNumber: o.opportunityNumber,
                  contactId: o.primaryContactId ?? undefined,
                  opportunityId: o.id,
                };
              }),
            );
          } else {
            const page = await enterpriseDealApiClient.searchDeals({
              q,
              page: 1,
              pageSize: ENTERPRISE_SEARCH_MAX_RESULTS,
              archived: false,
              view: "summary",
            });
            if (cancelled) return;
            setHits(
              page.items.map((d) => {
                const customer =
                  d.primaryContactName?.trim() ||
                  d.companyName?.trim() ||
                  undefined;
                const product = d.productLabel?.trim() || undefined;
                const lender = d.primaryCounterpartyName?.trim() || undefined;
                const rm = d.relationshipManagerName?.trim() || undefined;
                const dealNo = d.dealNumber || d.fileNumber || undefined;
                const subtitle = [
                  dealNo,
                  product,
                  lender,
                  rm ? `RM: ${rm}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return {
                  kind: "deal" as const,
                  id: d.id,
                  label: customer || dealNo || d.id,
                  subtitle,
                  customerName: customer,
                  product,
                  lenderName: lender,
                  rmName: rm,
                  mobile: d.primaryContactMobile?.trim() || undefined,
                  opportunityNumber: d.opportunityNumber ?? undefined,
                  dealNumber: dealNo,
                  contactId: d.primaryContactId ?? undefined,
                  opportunityId: d.opportunityId ?? undefined,
                };
              }),
            );
          }
        } catch (e) {
          if (!cancelled) {
            setHits([]);
            setSearchError(
              e instanceof Error
                ? e.message
                : `${registryLabel(kind)} search failed.`,
            );
          }
        } finally {
          if (!cancelled) setSearching(false);
        }
      })();
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [kind, query]);

  const clear = () => {
    onChange(null);
    setQuery("");
    setHits([]);
  };

  return (
    <div className={cn("grid gap-2 rounded-lg border border-border/60 p-2.5", className)}>
      <Label className="text-[10px] uppercase text-muted-foreground">
        Link to{required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Select
        value={kind}
        onValueChange={(v) => {
          const next = v as TaskLinkEntityKind;
          setKind(next);
          onChange(null);
          setQuery("");
          setHits([]);
          setSearchError(null);
        }}
      >
        <SelectTrigger className="h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="contact">Contact</SelectItem>
          <SelectItem value="opportunity">Opportunity</SelectItem>
          <SelectItem value="deal">Deal</SelectItem>
        </SelectContent>
      </Select>

      <p className="text-[10px] text-muted-foreground">
        Source: {registryLabel(kind)} (SSOT)
      </p>

      {value ? (
        <div className="flex items-start justify-between gap-2 rounded-md border border-teal-500/30 bg-teal-500/5 px-2.5 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">{value.label}</p>
            {value.subtitle ? (
              <p className="truncate text-[11px] text-muted-foreground">{value.subtitle}</p>
            ) : null}
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              ID · {value.id.slice(0, 12)}…
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear linked entity"
            onClick={clear}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : kind === "contact" ? (
        <LiveEntityMasterSearch
          kind="contact"
          warmOnMount
          placeholder={searchPlaceholder("contact")}
          allowCreateNew={false}
          onSelect={(opt) => {
            onChange({
              kind: "contact",
              id: opt.id,
              label: opt.label,
              subtitle: opt.sublabel,
              customerName: opt.label,
              mobile: opt.sublabel?.replace(/\D/g, "").length
                ? opt.sublabel
                : undefined,
              contactId: opt.id,
            });
          }}
        />
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-8 text-xs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder(kind)}
            autoComplete="off"
          />
          {query.trim().length >= 2 ? (
            <div
              className={cn(
                "absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md",
              )}
            >
              <div className={ENTERPRISE_SEARCH_DROPDOWN_LIST_CLASS}>
                {searchError ? (
                  <p className="px-2.5 py-2 text-[11px] text-destructive">
                    {registryLabel(kind)} unavailable. {searchError}
                  </p>
                ) : searching ? (
                  <p className="px-2.5 py-2 text-[11px] text-muted-foreground">
                    Searching {registryLabel(kind)}…
                  </p>
                ) : hits.length === 0 ? (
                  <p className="px-2.5 py-2 text-[11px] text-muted-foreground">
                    No matching {kind === "deal" ? "Deals" : "Opportunities"}.
                  </p>
                ) : (
                  hits.map((hit) => (
                    <button
                      key={hit.id}
                      type="button"
                      className="flex w-full items-start gap-2 border-b border-border/50 px-2.5 py-2 text-left last:border-0 hover:bg-muted/50"
                      onClick={() => {
                        onChange(hit);
                        setQuery("");
                        setHits([]);
                      }}
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium">
                          {hit.label}
                        </span>
                        {hit.subtitle ? (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {hit.subtitle}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Type at least 2 characters to search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
