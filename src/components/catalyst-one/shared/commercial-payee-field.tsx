"use client";

/**
 * CO-ARCH-003 Phase 2B Sprint 1 — Invoice Party field (Deal attribute).
 * Reads ONLY from Accounting → Invoice Party Master — never Contact Registry.
 */

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  invoicePartyApiClient,
  type InvoicePartyRecord,
} from "@/lib/invoice-party/invoice-party-api-client";
import type { LoanCommercialPayeeType } from "@/constants/invoice-party";
import { INVOICE_PARTY_READINESS_HINT } from "@/constants/invoice-party";
import { cn } from "@/lib/utils";

export type InvoicePartyChange = {
  invoicePartyId?: string | null;
  invoicePartyLabel?: string | null;
  commercialPayee?: LoanCommercialPayeeType;
  commercialPayeeSpecify?: string;
  invoicePartyContactId?: string | null;
  /** @deprecated aliases */
  commissionAccountingPayeeId?: string | null;
  commissionAccountingPayeeLabel?: string | null;
  commissionPayeeContactId?: string | null;
};

/** @deprecated */
export type CommissionPayerChange = InvoicePartyChange;

function asPartyType(value: string): LoanCommercialPayeeType | undefined {
  const known = [
    "customer",
    "lender",
    "builder",
    "channel_partner",
    "chartered_accountant",
    "direct_corporate",
    "other",
  ] as const;
  return (known as readonly string[]).includes(value)
    ? (value as LoanCommercialPayeeType)
    : "other";
}

export function InvoicePartyField({
  invoicePartyId,
  invoicePartyLabel,
  onChange,
  readOnly = false,
  required = false,
  error,
  hint,
  className,
  compact = false,
  label = "Invoice Party",
}: {
  invoicePartyId?: string | null;
  invoicePartyLabel?: string | null;
  onChange: (next: InvoicePartyChange) => void;
  readOnly?: boolean;
  required?: boolean;
  error?: string | null;
  /** CO-DWS-001 — non-blocking readiness hint */
  hint?: string | null;
  className?: string;
  compact?: boolean;
  label?: string;
}) {
  const [items, setItems] = useState<InvoicePartyRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await invoicePartyApiClient.listActive();
        if (!cancelled) {
          setItems(rows);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load Invoice Party Master",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readOnly]);

  const selectedLabel =
    invoicePartyLabel ||
    items.find((r) => r.id === invoicePartyId)?.displayName ||
    null;

  if (readOnly) {
    return (
      <div className={cn(className)}>
        {!compact && (
          <Label className="text-[10px] uppercase text-muted-foreground">
            {label}
            {required ? " *" : ""}
          </Label>
        )}
        <div
          className={cn(
            "mt-1 rounded-lg border border-border bg-muted/20 px-2.5 py-2 text-sm font-medium",
            compact && "mt-0",
          )}
        >
          {selectedLabel || "—"}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-[10px] uppercase text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </Label>
      <Select
        value={invoicePartyId ?? undefined}
        onValueChange={(id) => {
          const row = items.find((r) => r.id === id);
          if (!row) return;
          const partyType = asPartyType(row.partyType || row.payeeType || "other");
          onChange({
            invoicePartyId: row.id,
            invoicePartyLabel: row.displayName,
            commercialPayee: partyType,
            commercialPayeeSpecify: row.displayName,
            invoicePartyContactId: row.contactId ?? null,
            commissionAccountingPayeeId: row.id,
            commissionAccountingPayeeLabel: row.displayName,
            commissionPayeeContactId: row.contactId ?? null,
          });
        }}
      >
        <SelectTrigger className={cn("mt-1 h-8 text-xs", error && "border-destructive")}>
          <SelectValue placeholder="Select from Accounting Invoice Party Master" />
        </SelectTrigger>
        <SelectContent>
          {items.length === 0 ? (
            <SelectItem value="__empty" disabled className="text-xs">
              {loadError
                ? loadError
                : "No active Invoice Parties — add in Accounting → Invoice Party Master"}
            </SelectItem>
          ) : (
            items.map((row) => (
              <SelectItem key={row.id} value={row.id} className="text-xs">
                {row.displayName}
                {row.partyType || row.payeeType
                  ? ` · ${(row.partyType || row.payeeType || "").replace(/_/g, " ")}`
                  : ""}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <p className="text-[10px] text-muted-foreground">
        Curated Invoice Parties from Accounting Master only.
      </p>
      {hint && !error ? <p className="text-[11px] text-amber-800 dark:text-amber-200">{hint}</p> : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

/** @deprecated Prefer InvoicePartyField */
export const CommercialPayeeField = InvoicePartyField;

export function LoginStageInvoicePartyPanel({
  invoicePartyId,
  invoicePartyLabel,
  onChange,
  readOnly,
  required = false,
  error = null,
  hint,
}: {
  invoicePartyId?: string | null;
  invoicePartyLabel?: string | null;
  onChange: (next: InvoicePartyChange) => void;
  readOnly?: boolean;
  /** CO-BUG-001 / CO-DWS-001 — ignored for error display; Invoice Party never hard-gates pipeline UI. */
  required?: boolean;
  error?: string | null;
  hint?: string | null;
}) {
  return (
    <section className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 px-3 py-3">
      <header className="mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-400/90">
          Logged In · Invoice Party
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Against whom should Rupee Catalyst raise its commission invoice for this Deal? Select from
          Accounting Invoice Party Master. Optional for Lender Pipeline — required only for accounting
          actions.
        </p>
      </header>
      <InvoicePartyField
        invoicePartyId={invoicePartyId}
        invoicePartyLabel={invoicePartyLabel}
        onChange={onChange}
        readOnly={readOnly}
        required={required}
        error={error}
        hint={
          hint ??
          (!invoicePartyId
            ? `${INVOICE_PARTY_READINESS_HINT} Optional for Lender Pipeline — required only for accounting actions.`
            : undefined)
        }
      />
    </section>
  );
}

/** @deprecated */
export const LoginStagePayeePanel = LoginStageInvoicePartyPanel;
