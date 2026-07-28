"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AccountingInvoice } from "@/lib/accounting-workspace";
import { formatINR } from "@/lib/format-currency";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-muted/10 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-[12px] font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function InvoiceWorkspaceSheet({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: AccountingInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        allowOutsideClose
        className="w-full overflow-y-auto border-border/70 bg-background sm:max-w-xl"
      >
        {invoice && (
          <>
            <SheetHeader className="space-y-1 border-b border-border/60 pb-3 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
                Invoice Workspace
              </p>
              <SheetTitle className="text-base tracking-tight text-foreground">
                {invoice.invoiceNumber}
              </SheetTitle>
              <p className="text-[11px] text-muted-foreground">
                {invoice.customer} · {invoice.lender} · {invoice.product}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  onClick={() => toast.message("Download PDF · mock")}
                >
                  Download PDF
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  onClick={() => toast.message("Share · mock")}
                >
                  Share
                </Button>
              </div>
            </SheetHeader>

            <div className="mt-3 space-y-2.5">
              <Section title="Invoice Details">
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <Fact label="Invoice Date" value={invoice.invoiceDate} />
                  <Fact label="Invoice Status" value={invoice.invoiceStatus} />
                  <Fact label="Payment Status" value={invoice.paymentStatus} />
                  <Fact label="Invoice Amount" value={formatINR(invoice.invoiceAmount)} />
                </dl>
              </Section>

              <Section title="Customer Details">
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <Fact label="Customer" value={invoice.customer} />
                  <Fact label="GSTIN" value={invoice.gstin ?? "—"} />
                </dl>
              </Section>

              <Section title="Loan Details">
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <Fact label="Deal" value={invoice.loanFileRef} />
                  <Fact label="Lender" value={invoice.lender} />
                  <Fact label="Product" value={invoice.product} />
                  <Fact label="Loan Amount" value={formatINR(invoice.loanAmount)} />
                </dl>
              </Section>

              <Section title="GST Summary">
                <dl className="grid grid-cols-3 gap-x-3 gap-y-2">
                  <Fact label="Taxable Value" value={formatINR(invoice.taxableValue)} />
                  <Fact label="GST" value={formatINR(invoice.gst)} />
                  <Fact label="Total" value={formatINR(invoice.invoiceAmount)} />
                </dl>
              </Section>

              <Section title="Payment History">
                {invoice.paymentHistory.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No payments recorded.</p>
                ) : (
                  <ul className="space-y-1">
                    {invoice.paymentHistory.map((p) => (
                      <li
                        key={p.id}
                        className="flex justify-between rounded-md border border-border/60 bg-card px-2 py-1.5 text-[11px]"
                      >
                        <span className="text-muted-foreground">
                          {p.date} · {p.mode}
                        </span>
                        <span className="tabular-nums font-medium text-foreground">
                          {formatINR(p.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Audit Trail">
                <ul className="space-y-1">
                  {invoice.auditTrail.map((a) => (
                    <li key={a.id} className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{a.action}</span>
                      {" · "}
                      {a.actor}
                      {" · "}
                      {new Date(a.at).toLocaleString("en-IN")}
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Notes">
                <p className="text-[12px] text-foreground">{invoice.notes ?? "No notes."}</p>
              </Section>

              <Section title="Activity Timeline">
                <ul className="space-y-1.5">
                  {invoice.auditTrail.map((a) => (
                    <li key={`tl-${a.id}`} className="flex gap-2 text-[11px]">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600/70" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{a.action}</p>
                        <p className="text-muted-foreground">
                          {a.actor} · {new Date(a.at).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
