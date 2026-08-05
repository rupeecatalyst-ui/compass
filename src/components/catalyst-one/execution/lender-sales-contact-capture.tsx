"use client";

/**
 * CO-LR-013 — Capture / select Lender Sales Contact (Banker) during Identify Lender.
 * CO-BUG-LSC-LOOKUP — Live Enterprise Contact Registry (SSOT) search on focus + type.
 */

import { useEffect, useState } from "react";
import { Check, Plus, Search, UserRound, X } from "lucide-react";
import { LENDER_SALES_DESIGNATION_SELECT_OPTIONS } from "@/constants/lender-sales-contact";
import { useEnterpriseRegistry } from "@/hooks/use-enterprise-registry";
import {
  createLenderSalesContact,
  findLenderSalesContactDuplicatesLive,
  formatLenderSalesContactResultLine,
  searchLenderSalesContactsLive,
  toLenderSalesContactLink,
  type LenderSalesContactLink,
} from "@/lib/lender-sales-contact";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  lenderId?: string | null;
  lenderName?: string | null;
  lenderCode?: string | null;
  lenderShortName?: string | null;
  /** Soft rank when Banker Products Handled is mapped — peers still listed */
  productCode?: string | null;
  value: LenderSalesContactLink | null;
  onChange: (link: LenderSalesContactLink | null) => void;
  className?: string;
  actorId?: string;
};

const SEARCH_TIMEOUT_MS = 12_000;
const SEARCH_DEBOUNCE_MS = 120;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out. Retry or check network.`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function LenderSalesContactCapture({
  lenderId,
  lenderName,
  lenderCode,
  lenderShortName,
  productCode,
  value,
  onChange,
  className,
  actorId = "ui",
}: Props) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<EcmContact[]>([]);
  const [results, setResults] = useState<EcmContact[]>([]);
  const [focusTick, setFocusTick] = useState(0);
  const [draft, setDraft] = useState({
    name: "",
    mobile: "",
    designationId: "",
    email: "",
  });
  const { registryVersion, refresh } = useEnterpriseRegistry({
    hydrateOnMount: true,
  });

  useEffect(() => {
    if (!lenderId?.trim() || value) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      void (async () => {
        try {
          const rows = await withTimeout(
            searchLenderSalesContactsLive({
              lenderId,
              query,
              aliases: {
                code: lenderCode,
                name: lenderName,
                label: lenderName,
                shortName: lenderShortName,
              },
              productCode,
              limit: 12,
            }),
            SEARCH_TIMEOUT_MS,
            "Enterprise Contact Registry search",
          );
          if (!cancelled) setResults(rows);
        } catch (e) {
          if (!cancelled) {
            setResults([]);
            setSearchError(
              e instanceof Error
                ? e.message
                : "Enterprise Contact Registry search failed.",
            );
          }
        } finally {
          if (!cancelled) setSearching(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [
    lenderId,
    lenderCode,
    lenderName,
    lenderShortName,
    productCode,
    query,
    value,
    registryVersion,
    focusTick,
  ]);

  const selectContact = (contact: EcmContact) => {
    const link = toLenderSalesContactLink(contact);
    onChange({
      ...link,
      institutionId: link.institutionId || lenderId || undefined,
      institutionLabel: link.institutionLabel || lenderName || undefined,
    });
    setCreating(false);
    setQuery("");
    setError(null);
    setDuplicates([]);
  };

  const clear = () => {
    onChange(null);
    setError(null);
    setDuplicates([]);
  };

  const submitCreate = async () => {
    if (!lenderId?.trim()) {
      setError("Select a Lender before creating a Sales Contact.");
      return;
    }
    setBusy(true);
    setError(null);
    setDuplicates([]);
    try {
      const aliases = {
        code: lenderCode,
        name: lenderName,
        label: lenderName,
        shortName: lenderShortName,
      };
      const dupes = await findLenderSalesContactDuplicatesLive({
        lenderId,
        name: draft.name,
        mobile: draft.mobile,
        email: draft.email || undefined,
        aliases,
      });
      if (dupes.length > 0) {
        setDuplicates(dupes);
        setError("A matching Sales Contact already exists. Use Existing Contact.");
        return;
      }
      const created = await createLenderSalesContact(
        {
          lenderId,
          lenderName: lenderName?.trim() || "Lender",
          name: draft.name,
          mobile: draft.mobile,
          designationId: draft.designationId,
          email: draft.email || undefined,
        },
        actorId,
      );
      await refresh(true);
      selectContact(created);
      setDraft({ name: "", mobile: "", designationId: "", email: "" });
    } catch (e) {
      const err = e as Error & { code?: string; contact?: EcmContact };
      if (err.code === "DUPLICATE_SALES_CONTACT" && err.contact) {
        setDuplicates([err.contact]);
        setError("A matching Sales Contact already exists. Use Existing Contact.");
      } else {
        setError(err instanceof Error ? err.message : "Could not create Sales Contact.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!lenderId?.trim()) {
    return (
      <div className={cn("rounded-md border border-dashed border-border/70 px-3 py-2", className)}>
        <p className="text-[11px] text-muted-foreground">
          Select a Lender first, then link or create a Sales Contact.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-[10px] uppercase text-muted-foreground">
        Lender Sales Contact <span className="text-destructive">*</span>
      </Label>
      <p className="text-[10px] text-muted-foreground">
        Enterprise Contact Registry · Role = Lender Contact · Active · linked to selected lender
      </p>

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{value.contactName}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {[
                  value.designationLabel,
                  value.institutionLabel,
                  value.productsLabel,
                  value.mobile,
                  value.officialEmail || "Email pending",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <Button type="button" size="sm" variant="ghost" className="h-7" onClick={clear}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocusTick((n) => n + 1)}
              placeholder="Search by employee name, mobile, or official email…"
              className="h-8 pl-8 text-xs"
              autoComplete="off"
            />
          </div>

          <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-background">
            {searchError ? (
              <div className="space-y-1.5 px-2.5 py-2">
                <p className="text-[11px] font-medium text-destructive">
                  Enterprise Contact Registry unavailable
                </p>
                <p className="text-[11px] text-muted-foreground">{searchError}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setFocusTick((n) => n + 1)}
                >
                  Retry
                </Button>
              </div>
            ) : searching ? (
              <p className="px-2.5 py-2 text-[11px] text-muted-foreground">
                Searching Enterprise Contact Registry…
              </p>
            ) : results.length === 0 ? (
              <p className="px-2.5 py-2 text-[11px] text-muted-foreground">
                {query.trim()
                  ? "No matching Lender Contacts for this lender."
                  : "No Lender Contacts linked to this lender yet."}
              </p>
            ) : (
              results.map((c) => {
                const line = formatLenderSalesContactResultLine(c);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-start gap-2 border-b border-border/60 px-2.5 py-2 text-left last:border-0 hover:bg-muted/50"
                    onClick={() => selectContact(c)}
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">{line.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {line.subtitle || "Lender Contact"}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {!searching && results.length === 0 && !searchError ? (
            !creating ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  setCreating(true);
                  setError(null);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Create New Sales Contact
              </Button>
            ) : (
              <div className="space-y-2 rounded-md border border-border bg-muted/20 p-2.5">
                <p className="text-[11px] font-medium text-foreground">
                  New Sales Contact · Banker role · linked to selected lender
                </p>
                <div className="space-y-1">
                  <Label className="text-[11px]">
                    Contact Person Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="h-8 text-xs"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Full name"
                    autoFocus
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">
                      Mobile Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      value={draft.mobile}
                      onChange={(e) => setDraft((d) => ({ ...d, mobile: e.target.value }))}
                      placeholder="10-digit mobile"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">
                      Sales Designation <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={draft.designationId || undefined}
                      onValueChange={(v) => setDraft((d) => ({ ...d, designationId: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent>
                        {LENDER_SALES_DESIGNATION_SELECT_OPTIONS.map((o) => (
                          <SelectItem key={o.id} value={o.id} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Email Address (optional)</Label>
                  <Input
                    className="h-8 text-xs"
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                    placeholder="Required later at Disbursal"
                  />
                </div>

                {duplicates.length > 0 && (
                  <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/5 p-2">
                    <p className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                      Use Existing Contact
                    </p>
                    {duplicates.slice(0, 4).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded border border-border/60 bg-background px-2 py-1.5 text-left text-xs hover:bg-muted/40"
                        onClick={() => selectContact(c)}
                      >
                        <span className="truncate">
                          {c.name}
                          {c.mobilePrimary ? ` · ${c.mobilePrimary}` : ""}
                        </span>
                        <span className="shrink-0 text-[10px] text-primary">Use</span>
                      </button>
                    ))}
                  </div>
                )}

                {error && <p className="text-[11px] text-destructive">{error}</p>}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    disabled={busy}
                    onClick={() => {
                      setCreating(false);
                      setError(null);
                      setDuplicates([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={busy}
                    onClick={() => void submitCreate()}
                  >
                    {busy ? "Saving…" : "Save Sales Contact"}
                  </Button>
                </div>
              </div>
            )
          ) : null}
        </>
      )}
    </div>
  );
}
