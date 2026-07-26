"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  EnterpriseDataGrid,
  type EnterpriseGridColumnDef,
} from "@/components/catalyst-one/enterprise-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccountingInvoice, InvoiceStatus, PaymentStatus } from "@/lib/accounting-workspace";
import { formatINR } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "attention" | "positive" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone === "attention" &&
          "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-200",
        tone === "positive" &&
          "border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-200",
        tone === "danger" &&
          "border-rose-500/35 bg-rose-500/10 text-rose-800 dark:text-rose-200",
        tone === "neutral" && "border-border/70 bg-muted/40 text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function invoiceTone(status: InvoiceStatus) {
  if (status === "cancelled") return "danger" as const;
  if (status === "draft") return "neutral" as const;
  if (status === "shared") return "positive" as const;
  return "attention" as const;
}

function paymentTone(status: PaymentStatus) {
  if (status === "paid") return "positive" as const;
  if (status === "overdue") return "danger" as const;
  if (status === "partial") return "attention" as const;
  return "neutral" as const;
}

export function InvoiceManagementGrid({
  invoices,
  onOpen,
  onMarkPaid,
  onCancel,
}: {
  invoices: AccountingInvoice[];
  onOpen: (invoice: AccountingInvoice) => void;
  onMarkPaid: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [customer, setCustomer] = useState("");
  const [lender, setLender] = useState("");
  const [product, setProduct] = useState("");
  const [amountMin, setAmountMin] = useState("");

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (date && inv.invoiceDate !== date) return false;
      if (status !== "all" && inv.invoiceStatus !== status && inv.paymentStatus !== status) {
        return false;
      }
      if (customer && !inv.customer.toLowerCase().includes(customer.toLowerCase())) return false;
      if (lender && !inv.lender.toLowerCase().includes(lender.toLowerCase())) return false;
      if (product && !inv.product.toLowerCase().includes(product.toLowerCase())) return false;
      if (amountMin) {
        const n = Number(amountMin.replace(/,/g, ""));
        if (Number.isFinite(n) && inv.invoiceAmount < n) return false;
      }
      return true;
    });
  }, [invoices, date, status, customer, lender, product, amountMin]);

  const columns = useMemo<EnterpriseGridColumnDef<AccountingInvoice>[]>(
    () => [
      {
        id: "invoiceNumber",
        label: "Invoice Number",
        defaultOrder: 1,
        defaultWidth: 150,
        frozen: true,
        render: (row) => (
          <span className="font-medium text-foreground">{row.invoiceNumber}</span>
        ),
        exportValue: (r) => r.invoiceNumber,
      },
      {
        id: "invoiceDate",
        label: "Invoice Date",
        defaultOrder: 2,
        defaultWidth: 110,
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{row.invoiceDate}</span>
        ),
        exportValue: (r) => r.invoiceDate,
      },
      {
        id: "customer",
        label: "Customer",
        defaultOrder: 3,
        defaultWidth: 140,
        render: (row) => row.customer,
        exportValue: (r) => r.customer,
      },
      {
        id: "lender",
        label: "Lender",
        defaultOrder: 4,
        defaultWidth: 120,
        render: (row) => row.lender,
        exportValue: (r) => r.lender,
      },
      {
        id: "product",
        label: "Product",
        defaultOrder: 5,
        defaultWidth: 110,
        render: (row) => row.product,
        exportValue: (r) => r.product,
      },
      {
        id: "loanAmount",
        label: "Loan Amount",
        defaultOrder: 6,
        defaultWidth: 120,
        align: "right",
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{formatINR(row.loanAmount)}</span>
        ),
        exportValue: (r) => String(r.loanAmount),
      },
      {
        id: "taxableValue",
        label: "Taxable Value",
        defaultOrder: 7,
        defaultWidth: 120,
        align: "right",
        render: (row) => (
          <span className="tabular-nums">{formatINR(row.taxableValue)}</span>
        ),
        exportValue: (r) => String(r.taxableValue),
      },
      {
        id: "gst",
        label: "GST",
        defaultOrder: 8,
        defaultWidth: 100,
        align: "right",
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{formatINR(row.gst)}</span>
        ),
        exportValue: (r) => String(r.gst),
      },
      {
        id: "invoiceAmount",
        label: "Invoice Amount",
        defaultOrder: 9,
        defaultWidth: 120,
        align: "right",
        render: (row) => (
          <span className="font-semibold tabular-nums text-foreground">
            {formatINR(row.invoiceAmount)}
          </span>
        ),
        exportValue: (r) => String(r.invoiceAmount),
      },
      {
        id: "invoiceStatus",
        label: "Invoice Status",
        defaultOrder: 10,
        defaultWidth: 110,
        render: (row) => (
          <StatusChip label={row.invoiceStatus} tone={invoiceTone(row.invoiceStatus)} />
        ),
        exportValue: (r) => r.invoiceStatus,
      },
      {
        id: "paymentStatus",
        label: "Payment Status",
        defaultOrder: 11,
        defaultWidth: 120,
        render: (row) => (
          <StatusChip label={row.paymentStatus} tone={paymentTone(row.paymentStatus)} />
        ),
        exportValue: (r) => r.paymentStatus,
      },
      {
        id: "actions",
        label: "Actions",
        defaultOrder: 12,
        defaultWidth: 280,
        render: (row) => (
          <div className="flex flex-wrap gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px]"
              onClick={() => onOpen(row)}
            >
              View
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px]"
              onClick={() => toast.message("Edit · mock only")}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px]"
              onClick={() => toast.message(`Download PDF · ${row.invoiceNumber} (mock)`)}
            >
              PDF
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px]"
              onClick={() => toast.message(`Share · ${row.invoiceNumber} (mock)`)}
            >
              Share
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px]"
              disabled={row.paymentStatus === "paid" || row.invoiceStatus === "cancelled"}
              onClick={() => onMarkPaid(row.id)}
            >
              Mark Paid
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px] text-destructive"
              disabled={row.invoiceStatus === "cancelled"}
              onClick={() => onCancel(row.id)}
            >
              Cancel
            </Button>
          </div>
        ),
      },
    ],
    [onOpen, onMarkPaid, onCancel],
  );

  return (
    <section className="space-y-2 rounded-xl border border-border/70 bg-card p-3 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
            Invoice Management
          </p>
          <h2 className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
            Commercial invoices across the loan book
          </h2>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0"
          onClick={() => toast.message("Create Invoice · mock only")}
        >
          Create Invoice
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 p-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-8 w-[140px] text-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="raised">Raised</SelectItem>
            <SelectItem value="shared">Shared</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="Customer"
          className="h-8 w-[130px] text-xs"
        />
        <Input
          value={lender}
          onChange={(e) => setLender(e.target.value)}
          placeholder="Lender"
          className="h-8 w-[130px] text-xs"
        />
        <Input
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="Product"
          className="h-8 w-[110px] text-xs"
        />
        <Input
          value={amountMin}
          onChange={(e) => setAmountMin(e.target.value)}
          placeholder="Min amount"
          className="h-8 w-[110px] text-xs"
        />
      </div>

      <EnterpriseDataGrid
        storageKey="accounting-invoice-grid"
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        onRowClick={onOpen}
        density="compact"
        toolbarLabel={`${filtered.length} invoices`}
        maxHeightClassName="max-h-[32rem]"
        emptyMessage="No invoices match the current filters."
      />
    </section>
  );
}
