"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CUSTOMER_SEED } from "@/data/catalyst-one/customer-seed";
import { loanLenders, loanManagers, loanProducts } from "@/data/catalyst-one/loan-files";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CreateLoanFileInput } from "@/types/catalyst-one";
import { inferLendingTypeFromProduct } from "@/lib/loan-validation";

const schema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(2, "Name required"),
  customerMobile: z.string().min(10, "Valid mobile required"),
  customerEmail: z.string().email("Valid email required"),
  city: z.string().min(2),
  state: z.string().min(2),
  employmentType: z.string().min(2),
  loanProduct: z.string().min(1),
  loanAmount: z.coerce.number().min(100000),
  requiredAmount: z.coerce.number().min(100000),
  lender: z.string().min(1),
  relationshipManager: z.string().min(1),
  priority: z.enum(["urgent", "high", "medium", "low"]),
  loginDate: z.string().min(1),
  expectedLoginDate: z.string().min(1),
  internalNotes: z.string(),
  companyName: z.string().optional(),
  gst: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface LoanCreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateLoanFileInput) => void;
  title?: string;
  description?: string;
  contentClassName?: string;
  prefillCustomer?: {
    id: string;
    name: string;
    mobile: string;
    email: string;
    city: string;
    state: string;
    employmentType: string;
  };
}

export function LoanCreateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  title = "New Loan Entry",
  description = "Create a loan file and add it to the pipeline.",
  contentClassName,
  prefillCustomer,
}: LoanCreateFormDialogProps) {
  const [customerSearch, setCustomerSearch] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: "",
      customerMobile: "",
      customerEmail: "",
      city: "",
      state: "",
      employmentType: "Salaried",
      loanProduct: loanProducts[0],
      loanAmount: 50_00_000,
      requiredAmount: 45_00_000,
      lender: loanLenders[0],
      relationshipManager: loanManagers[0],
      priority: "medium",
      loginDate: new Date().toISOString().slice(0, 10),
      expectedLoginDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      internalNotes: "",
    },
  });

  const filteredCustomers = CUSTOMER_SEED.filter(
    (c) =>
      !customerSearch ||
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobile.includes(customerSearch),
  ).slice(0, 8);

  const selectCustomer = (id: string) => {
    const c = CUSTOMER_SEED.find((x) => x.id === id);
    if (!c) return;
    form.setValue("customerId", c.id);
    form.setValue("customerName", c.name);
    form.setValue("customerMobile", c.mobile);
    form.setValue("customerEmail", c.email);
    form.setValue("city", c.city);
    form.setValue("state", c.state);
    form.setValue("employmentType", c.employmentType);
    setCustomerSearch("");
  };

  useEffect(() => {
    if (!open || !prefillCustomer) return;
    form.setValue("customerId", prefillCustomer.id);
    form.setValue("customerName", prefillCustomer.name);
    form.setValue("customerMobile", prefillCustomer.mobile);
    form.setValue("customerEmail", prefillCustomer.email);
    form.setValue("city", prefillCustomer.city);
    form.setValue("state", prefillCustomer.state);
    form.setValue("employmentType", prefillCustomer.employmentType);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefill only when dialog opens
  }, [open, prefillCustomer]);

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      customerId: values.customerId,
      customerName: values.customerName,
      customerMobile: values.customerMobile,
      customerEmail: values.customerEmail,
      city: values.city,
      state: values.state,
      employmentType: values.employmentType,
      lendingType: inferLendingTypeFromProduct(values.loanProduct),
      transactionType: values.loanProduct.includes("Balance Transfer") ? "balance_transfer" : "fresh",
      loanProduct: values.loanProduct,
      loanAmount: values.loanAmount,
      requiredAmount: values.requiredAmount,
      lender: values.lender,
      relationshipManager: values.relationshipManager,
      priority: values.priority,
      loginDate: new Date(values.loginDate).toISOString(),
      expectedLoginDate: new Date(values.expectedLoginDate).toISOString(),
      internalNotes: values.internalNotes,
      businessDetails: values.companyName ? { companyName: values.companyName, gst: values.gst } : undefined,
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-4xl w-[min(92vw,56rem)] max-h-[90vh] p-0 gap-0 rounded-xl",
          contentClassName,
        )}
      >
        <DialogHeader className="p-6 pb-0 border-b border-border shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)] px-6 pb-6">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-4">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Customer</h3>
              <Input
                placeholder="Search existing customer..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              {filteredCustomers.length > 0 && customerSearch && (
                <div className="rounded-lg border border-border divide-y max-h-32 overflow-auto">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
                      onClick={() => selectCustomer(c.id)}
                    >
                      {c.name} · {c.mobile}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Name" error={form.formState.errors.customerName?.message}>
                  <Input {...form.register("customerName")} />
                </FormField>
                <FormField label="Mobile" error={form.formState.errors.customerMobile?.message}>
                  <Input {...form.register("customerMobile")} />
                </FormField>
                <FormField label="Email" error={form.formState.errors.customerEmail?.message}>
                  <Input {...form.register("customerEmail")} />
                </FormField>
                <FormField label="Employment" error={form.formState.errors.employmentType?.message}>
                  <Input {...form.register("employmentType")} />
                </FormField>
                <FormField label="City" error={form.formState.errors.city?.message}>
                  <Input {...form.register("city")} />
                </FormField>
                <FormField label="State" error={form.formState.errors.state?.message}>
                  <Input {...form.register("state")} />
                </FormField>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Loan</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField label="Product" value={form.watch("loanProduct")} onChange={(v) => form.setValue("loanProduct", v)} options={loanProducts} />
                <SelectField label="Lender" value={form.watch("lender")} onChange={(v) => form.setValue("lender", v)} options={loanLenders} />
                <SelectField label="RM" value={form.watch("relationshipManager")} onChange={(v) => form.setValue("relationshipManager", v)} options={loanManagers} />
                <SelectField label="Priority" value={form.watch("priority")} onChange={(v) => form.setValue("priority", v as FormValues["priority"])} options={["urgent", "high", "medium", "low"]} />
                <FormField label="Loan Amount (₹)" error={form.formState.errors.loanAmount?.message}>
                  <Input type="number" {...form.register("loanAmount")} />
                </FormField>
                <FormField label="Required Amount (₹)" error={form.formState.errors.requiredAmount?.message}>
                  <Input type="number" {...form.register("requiredAmount")} />
                </FormField>
                <FormField label="Login Date">
                  <Input type="date" {...form.register("loginDate")} />
                </FormField>
                <FormField label="Expected Login">
                  <Input type="date" {...form.register("expectedLoginDate")} />
                </FormField>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Business (optional)</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Company Name">
                  <Input {...form.register("companyName")} />
                </FormField>
                <FormField label="GST">
                  <Input {...form.register("gst")} />
                </FormField>
              </div>
            </section>

            <section>
              <Label>Notes</Label>
              <textarea
                {...form.register("internalNotes")}
                className={cn(
                  "mt-1.5 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                rows={3}
              />
            </section>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">Save Loan File</Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
