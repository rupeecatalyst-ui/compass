"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FileText,
  Sparkles,
  Users,
} from "lucide-react";
import { ChanakyaOriginationPanel } from "@/components/catalyst-one/shared/chanakya-origination-panel";
import { EntityButtonLink } from "@/components/catalyst-one/shared/entity-link";
import {
  EntityMasterSearch,
  type EntityMasterOption,
} from "@/components/catalyst-one/shared/entity-master-search";
import { INRCurrencyInput } from "@/components/catalyst-one/shared/inr-currency-input";
import { LoanOriginationSection } from "@/components/catalyst-one/shared/loan-origination-section";
import { LoanParticipantsPanel } from "@/components/catalyst-one/shared/loan-participants-panel";
import { LEAD_SOURCES } from "@/constants/customer-360";
import {
  getProductsForLendingType,
  LENDING_TYPES,
  STAGE_LABELS,
  TRANSACTION_TYPES,
} from "@/constants/loan-pipeline";
import { CUSTOMER_SEED } from "@/data/catalyst-one/customer-seed";
import { loanLenders, loanManagers } from "@/data/catalyst-one/loan-files";
import {
  buildDefaultParticipantEntityOptions,
  mapContactOptionsToParticipantEntities,
  syncParticipantLegacyFields,
} from "@/lib/loan-participants";
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
import type { CreateLoanFileInput, LendingType, TransactionType } from "@/types/catalyst-one";
import type { LoanParticipant } from "@/types/loan-participant";

const CUSTOMER_TYPES = ["Individual", "MSME", "Corporate", "Professional"] as const;

const schema = z.object({
  customerId: z.string().min(1, "Primary applicant required"),
  customerName: z.string().min(2),
  customerMobile: z.string().min(10),
  customerEmail: z.string().email(),
  city: z.string().min(2),
  state: z.string().min(2),
  employmentType: z.string().min(2),
  lendingType: z.enum(["secured", "unsecured", "hybrid"]),
  transactionType: z.enum(["fresh", "balance_transfer"]),
  customerType: z.string().min(1),
  loanProduct: z.string().min(1),
  requiredAmount: z.coerce.number().min(100000),
  priority: z.enum(["urgent", "high", "medium", "low"]),
  loginDate: z.string().min(1),
  expectedLoginDate: z.string().min(1),
  source: z.string().min(1),
  sourceContactId: z.string().optional(),
  relationshipManager: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export interface LoanCreateSubmitMeta {
  participants?: LoanParticipant[];
  associatedCompanyId?: string;
  associatedCompanyName?: string;
  source?: string;
  sourceContactId?: string;
  sourceContactName?: string;
  sourceContactRole?: string;
  sourceContactOrganisation?: string;
  proceedToDocuments?: boolean;
}

export interface LoanCreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateLoanFileInput, meta?: LoanCreateSubmitMeta) => void;
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
    relationshipManager?: string;
  };
  onOpenSourceContact?: (contactId: string) => void;
}

function deriveOrganisation(name: string, city: string): string {
  if (/pvt|ltd|llp|industries|traders|exports|logistics|pharma|construction/i.test(name)) {
    return name;
  }
  return city ? `${city} Region` : "—";
}

export function LoanCreateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  title = "New Loan Entry",
  description = "Create a loan file and add it to the pipeline.",
  contentClassName,
  prefillCustomer,
  onOpenSourceContact,
}: LoanCreateFormDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [participants, setParticipants] = useState<LoanParticipant[]>([]);
  const [associatedCompanyId, setAssociatedCompanyId] = useState<string>();
  const [associatedCompanyName, setAssociatedCompanyName] = useState<string>();
  const [sourceContactRole, setSourceContactRole] = useState<string>();
  const [sourceContactOrganisation, setSourceContactOrganisation] = useState<string>();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: "",
      customerMobile: "",
      customerEmail: "",
      city: "",
      state: "",
      employmentType: "Salaried",
      lendingType: "secured",
      transactionType: "fresh",
      customerType: "Individual",
      loanProduct: getProductsForLendingType("secured")[0] ?? "",
      requiredAmount: 45_00_000,
      priority: "medium",
      loginDate: today,
      expectedLoginDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      source: "Direct",
      relationshipManager: loanManagers[0] ?? "",
      customerId: "",
    },
  });

  const lendingType = form.watch("lendingType");
  const productOptions = useMemo(() => getProductsForLendingType(lendingType), [lendingType]);

  const contactOptions = useMemo(
    () =>
      CUSTOMER_SEED.map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.mobile,
        mobile: c.mobile,
        email: c.email,
        city: c.city,
        state: c.state,
        employmentType: c.employmentType,
      })),
    [],
  );

  const companyOptions = useMemo(
    () =>
      buildDefaultParticipantEntityOptions()
        .filter((o) => o.entityType === "company")
        .map((o) => ({ id: o.id, label: o.name, sublabel: o.constitution })),
    [],
  );

  const participantEntityOptions = useMemo(
    () => mapContactOptionsToParticipantEntities(
      contactOptions.map((c) => ({
        id: c.id,
        name: c.label,
        mobile: c.mobile,
        email: c.email,
      })),
    ),
    [contactOptions],
  );

  const selectPrimaryApplicant = (option: EntityMasterOption) => {
    const c = CUSTOMER_SEED.find((x) => x.id === option.id);
    if (!c) return;
    form.setValue("customerId", c.id);
    form.setValue("customerName", c.name);
    form.setValue("customerMobile", c.mobile);
    form.setValue("customerEmail", c.email);
    form.setValue("city", c.city);
    form.setValue("state", c.state);
    form.setValue("employmentType", c.employmentType);
    if (/pvt|ltd|llp|industries/i.test(c.name)) {
      form.setValue("customerType", "Corporate");
    }
  };

  const selectSourceContact = (option: EntityMasterOption) => {
    const c = CUSTOMER_SEED.find((x) => x.id === option.id);
    if (!c) return;
    form.setValue("sourceContactId", c.id);
    setSourceContactRole(c.employmentType);
    setSourceContactOrganisation(deriveOrganisation(c.name, c.city));
  };

  const selectAssociatedCompany = (option: EntityMasterOption) => {
    setAssociatedCompanyId(option.id);
    setAssociatedCompanyName(option.label);
  };

  useEffect(() => {
    if (!open) return;
    setParticipants([]);
    setAssociatedCompanyId(undefined);
    setAssociatedCompanyName(undefined);
    setSourceContactRole(undefined);
    setSourceContactOrganisation(undefined);
    form.reset({
      customerName: prefillCustomer?.name ?? "",
      customerMobile: prefillCustomer?.mobile ?? "",
      customerEmail: prefillCustomer?.email ?? "",
      city: prefillCustomer?.city ?? "",
      state: prefillCustomer?.state ?? "",
      employmentType: prefillCustomer?.employmentType ?? "Salaried",
      lendingType: "secured",
      transactionType: "fresh",
      customerType: "Individual",
      loanProduct: getProductsForLendingType("secured")[0] ?? "",
      requiredAmount: 45_00_000,
      priority: "medium",
      loginDate: today,
      expectedLoginDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      source: "Direct",
      sourceContactId: undefined,
      relationshipManager: prefillCustomer?.relationshipManager ?? loanManagers[0] ?? "",
      customerId: prefillCustomer?.id ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when dialog opens
  }, [open, prefillCustomer]);

  useEffect(() => {
    const current = form.getValues("loanProduct");
    if (!productOptions.includes(current)) {
      form.setValue("loanProduct", productOptions[0] ?? "");
    }
  }, [productOptions, form]);

  const buildPayload = (
    values: FormValues,
    proceedToDocuments: boolean,
  ): { input: CreateLoanFileInput; meta: LoanCreateSubmitMeta } => {
    const synced = syncParticipantLegacyFields(participants, associatedCompanyName
      ? { companyName: associatedCompanyName }
      : undefined);
    const sourceContact = values.sourceContactId
      ? CUSTOMER_SEED.find((c) => c.id === values.sourceContactId)
      : undefined;

    return {
      input: {
        customerId: values.customerId,
        customerName: values.customerName,
        customerMobile: values.customerMobile,
        customerEmail: values.customerEmail,
        city: values.city,
        state: values.state,
        employmentType: values.employmentType,
        lendingType: values.lendingType,
        transactionType: values.transactionType,
        loanProduct: values.loanProduct,
        loanAmount: values.requiredAmount,
        requiredAmount: values.requiredAmount,
        lender: loanLenders[0] ?? "HDFC Bank",
        relationshipManager: values.relationshipManager,
        priority: values.priority,
        loginDate: new Date(values.loginDate).toISOString(),
        expectedLoginDate: new Date(values.expectedLoginDate).toISOString(),
        internalNotes: `Customer Type: ${values.customerType}`,
        businessDetails: synced.businessDetails,
      },
      meta: {
        participants: synced.participants,
        associatedCompanyId,
        associatedCompanyName,
        source: values.source,
        sourceContactId: values.sourceContactId,
        sourceContactName: sourceContact?.name,
        sourceContactRole,
        sourceContactOrganisation,
        proceedToDocuments,
      },
    };
  };

  const handleSaveAndExit = form.handleSubmit((values) => {
    const { input, meta } = buildPayload(values, false);
    onSubmit(input, meta);
    onOpenChange(false);
  });

  const handleProceedToDocuments = form.handleSubmit((values) => {
    const { input, meta } = buildPayload(values, true);
    onSubmit(input, { ...meta, proceedToDocuments: true });
    onOpenChange(false);
  });

  const sourceContactId = form.watch("sourceContactId");
  const sourceContact = sourceContactId
    ? CUSTOMER_SEED.find((c) => c.id === sourceContactId)
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-6xl w-[min(96vw,72rem)] max-h-[92vh] p-0 gap-0 rounded-xl",
          contentClassName,
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border p-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92vh-10rem)]">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
            <div className="space-y-6">
              <LoanOriginationSection
                theme="blue"
                title="Loan Participants"
                description="Who is borrowing?"
                icon={<Users className="h-4 w-4" />}
              >
                <div className="space-y-4">
                  <FormField label="Primary Applicant *" error={form.formState.errors.customerId?.message}>
                    <EntityMasterSearch
                      placeholder="Search contact…"
                      selectedId={form.watch("customerId")}
                      selectedLabel={form.watch("customerName") || undefined}
                      options={contactOptions}
                      onSelect={selectPrimaryApplicant}
                    />
                  </FormField>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReadOnlyField label="Mobile Number" value={form.watch("customerMobile")} />
                    <ReadOnlyField label="Email Address" value={form.watch("customerEmail")} />
                    <ReadOnlyField label="Employment Type" value={form.watch("employmentType")} />
                    <ReadOnlyField label="City" value={form.watch("city")} />
                  </div>

                  <FormField label="Associated Company (Optional)">
                    <EntityMasterSearch
                      placeholder="Search company…"
                      selectedId={associatedCompanyId}
                      selectedLabel={associatedCompanyName}
                      options={companyOptions}
                      onSelect={selectAssociatedCompany}
                    />
                  </FormField>

                  <div className="border-t border-blue-600/15 pt-4">
                    <p className="mb-3 text-xs font-semibold text-foreground">Co-Applicants / Loan Participants</p>
                    <LoanParticipantsPanel
                      participants={participants}
                      entityOptions={participantEntityOptions}
                      onChange={setParticipants}
                      maxParticipants={9}
                    />
                  </div>
                </div>
              </LoanOriginationSection>

              <LoanOriginationSection
                theme="purple"
                title="Source Details"
                description="Where did this business come from?"
                icon={<Sparkles className="h-4 w-4" />}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Source">
                    <Select
                      value={form.watch("source")}
                      onValueChange={(v) => form.setValue("source", v)}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[...LEAD_SOURCES, "Referral", "Walk-in", "Direct"].map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Source Contact">
                    <EntityMasterSearch
                      placeholder="Search contact…"
                      selectedId={sourceContactId}
                      selectedLabel={sourceContact?.name}
                      options={contactOptions}
                      onSelect={selectSourceContact}
                    />
                  </FormField>

                  {sourceContact && (
                    <>
                      <ReadOnlyField label="Mobile Number" value={sourceContact.mobile} />
                      <ReadOnlyField label="Email Address" value={sourceContact.email} />
                      <ReadOnlyField label="Role / Designation" value={sourceContactRole ?? sourceContact.employmentType} />
                      <ReadOnlyField label="Organisation" value={sourceContactOrganisation ?? "—"} />
                    </>
                  )}
                </div>
                {sourceContactId && onOpenSourceContact && (
                  <EntityButtonLink
                    label="Open Source Contact Workspace"
                    className="mt-3 text-xs"
                    onClick={() => onOpenSourceContact(sourceContactId)}
                  />
                )}
              </LoanOriginationSection>

              <LoanOriginationSection
                theme="amber"
                title="Loan Details"
                description="Loan request information"
                icon={<FileText className="h-4 w-4" />}
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Product Type">
                    <Select
                      value={lendingType}
                      onValueChange={(v) => {
                        form.setValue("lendingType", v as LendingType);
                        const products = getProductsForLendingType(v as LendingType);
                        form.setValue("loanProduct", products[0] ?? "");
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LENDING_TYPES.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Product">
                    <Select
                      value={form.watch("loanProduct")}
                      onValueChange={(v) => form.setValue("loanProduct", v)}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {productOptions.map((p) => (
                          <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Transaction Type">
                    <Select
                      value={form.watch("transactionType")}
                      onValueChange={(v) => form.setValue("transactionType", v as TransactionType)}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRANSACTION_TYPES.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Customer Type">
                    <Select
                      value={form.watch("customerType")}
                      onValueChange={(v) => form.setValue("customerType", v)}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CUSTOMER_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Required Amount (₹) *" error={form.formState.errors.requiredAmount?.message}>
                    <INRCurrencyInput
                      value={form.watch("requiredAmount")}
                      onChange={(v) => form.setValue("requiredAmount", v ?? 0)}
                    />
                  </FormField>

                  <FormField label="Priority">
                    <Select
                      value={form.watch("priority")}
                      onValueChange={(v) => form.setValue("priority", v as FormValues["priority"])}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["urgent", "high", "medium", "low"] as const).map((p) => (
                          <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <ReadOnlyField label="Current Stage" value={STAGE_LABELS.raw_lead} />
                  <ReadOnlyField label="Sub Stage" value="—" />

                  <FormField label="Login Date">
                    <Input className="h-8 bg-muted/40 text-xs" value={today} readOnly />
                  </FormField>

                  <FormField label="Expected Login Date">
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      {...form.register("expectedLoginDate")}
                    />
                  </FormField>
                </div>
              </LoanOriginationSection>
            </div>

            <div className="lg:sticky lg:top-0 lg:self-start">
              <ChanakyaOriginationPanel />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={handleSaveAndExit}>
              Save &amp; Exit
            </Button>
            <Button type="button" className="bg-primary hover:bg-primary/90" onClick={handleProceedToDocuments}>
              Proceed to Document Stage
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <Input className="mt-1 h-8 bg-muted/40 text-xs" value={value || "—"} readOnly />
    </div>
  );
}
