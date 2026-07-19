"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Sparkles, Users } from "lucide-react";
import { ChanakyaOriginationPanel } from "@/components/catalyst-one/shared/chanakya-origination-panel";
import { EntityButtonLink } from "@/components/catalyst-one/shared/entity-link";
import {
  EntityMasterSearch,
  type EntityMasterOption,
} from "@/components/catalyst-one/shared/entity-master-search";
import { INRCurrencyInput } from "@/components/catalyst-one/shared/inr-currency-input";
import { LoanOriginationSection } from "@/components/catalyst-one/shared/loan-origination-section";
import { LoanParticipantsPanel } from "@/components/catalyst-one/shared/loan-participants-panel";
import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import { LOAN_JOURNEY_SOURCES } from "@/constants/loan-journey-sources";
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
import {
  findSourceContactOption,
  listSourceContactOptions,
} from "@/lib/loan-journey/source-contact-filter";
import { resolveAssociatedCompanyFromBorrowerProfile } from "@/lib/loan-journey/reuse-borrower-company";
import { ProgressiveContactCreateModal } from "@/components/catalyst-one/contacts/progressive-contact-create-modal";
import { ExistingLoanInformationSection } from "@/components/catalyst-one/shared/existing-loan-information-section";
import {
  isEcmContactUsable,
  listEcmContacts,
} from "@/lib/enterprise-contact-master";
import { getContextAwareVisibility, resolveContextCustomerCategory } from "@/lib/context-aware-data-collection";
import type { EcmContact } from "@/types/enterprise-contact-master";
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
import {
  APPROX_CIBIL_SCORE_ENUM,
  type ApproxCibilScoreBand,
} from "@/constants/cibil-score-master";
import { ApproxCibilScoreField } from "@/components/catalyst-one/shared/approx-cibil-score-field";
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
  requiredAmount: z.number({
    required_error: "Required loan amount is required",
    invalid_type_error: "Enter Required Loan Amount",
  }).min(100000, "Minimum loan amount is ₹1,00,000"),
  monthlyIncome: z.coerce.number().min(1, "Monthly Income is required for loan assessment"),
  approxCibilScore: z.enum(APPROX_CIBIL_SCORE_ENUM, {
    required_error: "Approximate CIBIL Score is required",
    invalid_type_error: "Select Approximate CIBIL Score",
  }),
  priority: z.enum(["urgent", "high", "medium", "low"]),
  loginDate: z.string().min(1),
  expectedLoginDate: z.string().min(1),
  source: z.string().min(1),
  sourceContactId: z.string().optional(),
  relationshipManager: z.string().min(1),
  btInstitutionId: z.string().optional(),
  btInstitutionName: z.string().optional(),
  btAmount: z.number().optional(),
}).superRefine((values, ctx) => {
  if (values.transactionType !== "balance_transfer") return;
  if (!values.btInstitutionId?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["btInstitutionId"],
      message: "Current Lending Institution is required for Balance Transfer",
    });
  }
  if (!values.btAmount || values.btAmount <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["btAmount"],
      message: "Outstanding Loan Amount is required for Balance Transfer",
    });
  }
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
    employerName?: string;
    businessName?: string;
  };
  onOpenSourceContact?: (contactId: string) => void;
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
  const [companyFromProfile, setCompanyFromProfile] = useState(false);
  const [sourceContactRole, setSourceContactRole] = useState<string>();
  const [sourceContactOrganisation, setSourceContactOrganisation] = useState<string>();
  const [baselineSnapshot, setBaselineSnapshot] = useState("");
  const [contactOptionsTick, setContactOptionsTick] = useState(0);
  const registryVersion = useEcmContactRegistryVersion();
  const [primaryCreateOpen, setPrimaryCreateOpen] = useState(false);
  const [primaryCreatePrefill, setPrimaryCreatePrefill] = useState("");

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
      requiredAmount: undefined as unknown as number,
      monthlyIncome: undefined as unknown as number,
      approxCibilScore: undefined as unknown as ApproxCibilScoreBand,
      priority: "medium",
      loginDate: today,
      expectedLoginDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      source: "Direct",
      relationshipManager: loanManagers[0] ?? "",
      customerId: "",
      btInstitutionId: "",
      btInstitutionName: "",
      btAmount: undefined as unknown as number,
    },
  });

  const lendingType = form.watch("lendingType");
  const transactionType = form.watch("transactionType");
  const source = form.watch("source");
  const productOptions = useMemo(() => getProductsForLendingType(lendingType), [lendingType]);
  const showExistingLoan = transactionType === "balance_transfer";

  const contactOptions = useMemo(() => {
    const ecm = listEcmContacts()
      .filter((c) => isEcmContactUsable(c.status))
      .map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.mobilePrimary?.startsWith("pending-") ? "Provisional" : c.mobilePrimary,
        mobile: c.mobilePrimary?.startsWith("pending-") ? "" : c.mobilePrimary,
        email: c.personalEmail || c.officialEmail || "",
        city: c.city || "",
        state: c.state || "",
        employmentType: c.employmentType || "Salaried",
      }));
    const seed = CUSTOMER_SEED.map((c) => ({
      id: c.id,
      label: c.name,
      sublabel: c.mobile,
      mobile: c.mobile,
      email: c.email,
      city: c.city,
      state: c.state,
      employmentType: c.employmentType,
    }));
    const byId = new Map<string, (typeof seed)[number]>();
    for (const row of [...seed, ...ecm]) byId.set(row.id, row);
    return [...byId.values()];
  }, [contactOptionsTick, registryVersion]);

  const sourceContactOptions = useMemo(
    () => listSourceContactOptions(source),
    [source, contactOptionsTick, registryVersion],
  );
  const hideSourceContact = source === "Direct";

  const companyOptions = useMemo(() => {
    const base = buildDefaultParticipantEntityOptions()
      .filter((o) => o.entityType === "company")
      .map((o) => ({ id: o.id, label: o.name, sublabel: o.constitution }));
    if (
      associatedCompanyId &&
      associatedCompanyName &&
      !base.some((o) => o.id === associatedCompanyId)
    ) {
      return [
        {
          id: associatedCompanyId,
          label: associatedCompanyName,
          sublabel: companyFromProfile ? "From Borrower Profile" : undefined,
        },
        ...base,
      ];
    }
    return base;
  }, [associatedCompanyId, associatedCompanyName, companyFromProfile]);

  const participantEntityOptions = useMemo(
    () =>
      mapContactOptionsToParticipantEntities(
        contactOptions.map((c) => ({
          id: c.id,
          name: c.label,
          mobile: c.mobile,
          email: c.email,
        })),
      ),
    [contactOptions],
  );

  const applyAssociatedCompanyFromProfile = (employerName?: string, businessName?: string) => {
    const resolved = resolveAssociatedCompanyFromBorrowerProfile({ employerName, businessName });
    if (resolved) {
      setAssociatedCompanyId(resolved.id);
      setAssociatedCompanyName(resolved.name);
      setCompanyFromProfile(true);
    } else {
      setAssociatedCompanyId(undefined);
      setAssociatedCompanyName(undefined);
      setCompanyFromProfile(false);
    }
  };

  const selectPrimaryApplicant = (option: EntityMasterOption) => {
    const ecm = listEcmContacts().find((x) => x.id === option.id);
    if (ecm) {
      const profile = ecm.roleProfiles?.customer ?? {};
      form.setValue("customerId", ecm.id, { shouldDirty: true });
      form.setValue("customerName", ecm.name, { shouldDirty: true });
      form.setValue(
        "customerMobile",
        ecm.mobilePrimary?.startsWith("pending-") ? "" : ecm.mobilePrimary,
        { shouldDirty: true },
      );
      form.setValue(
        "customerEmail",
        ecm.personalEmail ||
          ecm.officialEmail ||
          (ecm.mobilePrimary?.startsWith("pending-")
            ? "pending@contact.local"
            : `${ecm.mobilePrimary}@contact.local`),
        { shouldDirty: true },
      );
      form.setValue("city", ecm.city || "Mumbai", { shouldDirty: true });
      form.setValue("state", ecm.state || "Maharashtra", { shouldDirty: true });
      form.setValue("employmentType", ecm.employmentType || "Salaried", { shouldDirty: true });
      applyAssociatedCompanyFromProfile(profile.employerName, profile.businessName);
      return;
    }

    const c = CUSTOMER_SEED.find((x) => x.id === option.id);
    if (!c) return;
    form.setValue("customerId", c.id, { shouldDirty: true });
    form.setValue("customerName", c.name, { shouldDirty: true });
    form.setValue("customerMobile", c.mobile, { shouldDirty: true });
    form.setValue("customerEmail", c.email, { shouldDirty: true });
    form.setValue("city", c.city, { shouldDirty: true });
    form.setValue("state", c.state, { shouldDirty: true });
    form.setValue("employmentType", c.employmentType, { shouldDirty: true });
    if (/pvt|ltd|llp|industries/i.test(c.name)) {
      form.setValue("customerType", "Corporate", { shouldDirty: true });
      applyAssociatedCompanyFromProfile(c.name, undefined);
    } else {
      setAssociatedCompanyId(undefined);
      setAssociatedCompanyName(undefined);
      setCompanyFromProfile(false);
    }
  };

  const applyProgressivePrimary = (contact: EcmContact) => {
    setContactOptionsTick((t) => t + 1);
    selectPrimaryApplicant({
      id: contact.id,
      label: contact.name,
      sublabel: contact.mobilePrimary,
    });
  };

  const selectSourceContact = (option: EntityMasterOption) => {
    const found = findSourceContactOption(source, option.id);
    form.setValue("sourceContactId", option.id, { shouldDirty: true });
    setSourceContactRole(found?.roleLabel);
    setSourceContactOrganisation(found?.organisation);
  };

  const selectAssociatedCompany = (option: EntityMasterOption) => {
    setAssociatedCompanyId(option.id);
    setAssociatedCompanyName(option.label);
    setCompanyFromProfile(false);
  };

  useEffect(() => {
    if (!open) return;
    setParticipants([]);
    setSourceContactRole(undefined);
    setSourceContactOrganisation(undefined);

    applyAssociatedCompanyFromProfile(prefillCustomer?.employerName, prefillCustomer?.businessName);

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
      requiredAmount: undefined as unknown as number,
      monthlyIncome: undefined as unknown as number,
      approxCibilScore: undefined as unknown as ApproxCibilScoreBand,
      priority: "medium",
      loginDate: today,
      expectedLoginDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      source: "Direct",
      sourceContactId: undefined,
      relationshipManager: prefillCustomer?.relationshipManager ?? loanManagers[0] ?? "",
      customerId: prefillCustomer?.id ?? "",
      btInstitutionId: "",
      btInstitutionName: "",
      btAmount: undefined as unknown as number,
    });
    setBaselineSnapshot(
      JSON.stringify({
        form: form.getValues(),
        participants: [],
        associatedCompanyId: null,
        associatedCompanyName: null,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when dialog opens
  }, [open, prefillCustomer]);

  useEffect(() => {
    const current = form.getValues("loanProduct");
    if (!productOptions.includes(current)) {
      form.setValue("loanProduct", productOptions[0] ?? "");
    }
  }, [productOptions, form]);

  useEffect(() => {
    if (hideSourceContact) {
      form.setValue("sourceContactId", undefined);
      setSourceContactRole(undefined);
      setSourceContactOrganisation(undefined);
      return;
    }
    const currentId = form.getValues("sourceContactId");
    if (currentId && !sourceContactOptions.some((o) => o.id === currentId)) {
      form.setValue("sourceContactId", undefined);
      setSourceContactRole(undefined);
      setSourceContactOrganisation(undefined);
    }
  }, [source, hideSourceContact, sourceContactOptions, form]);

  const watched = form.watch();
  const isDirty =
    form.formState.isDirty ||
    participants.length > 0 ||
    Boolean(associatedCompanyId) ||
    JSON.stringify({
      form: watched,
      participants,
      associatedCompanyId: associatedCompanyId ?? null,
      associatedCompanyName: associatedCompanyName ?? null,
    }) !== baselineSnapshot;

  const buildPayload = (
    values: FormValues,
    proceedToDocuments: boolean,
  ): { input: CreateLoanFileInput; meta: LoanCreateSubmitMeta } => {
    const synced = syncParticipantLegacyFields(
      participants,
      associatedCompanyName ? { companyName: associatedCompanyName } : undefined,
    );
    const sourceContact = findSourceContactOption(values.source, values.sourceContactId);

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
        approxCibilScore: values.approxCibilScore,
        lender: loanLenders[0] ?? "HDFC Bank",
        relationshipManager: values.relationshipManager,
        priority: values.priority,
        loginDate: new Date(values.loginDate).toISOString(),
        expectedLoginDate: new Date(values.expectedLoginDate).toISOString(),
        internalNotes: `Customer Type: ${values.customerType}`,
        businessDetails: {
          ...synced.businessDetails,
          ...(getContextAwareVisibility(values.employmentType).isSelfEmployedFamily
            ? {
                monthlySalary: undefined,
                annualTurnover: values.monthlyIncome,
              }
            : {
                monthlySalary: values.monthlyIncome,
                annualTurnover: undefined,
                annualProfit: undefined,
                annualGrossReceipts: undefined,
                annualProfessionalIncome: undefined,
              }),
        },
        ...(values.transactionType === "balance_transfer"
          ? {
              btInstitutionId: values.btInstitutionId,
              btInstitutionName: values.btInstitutionName,
              btAmount: values.btAmount,
            }
          : {}),
      },
      meta: {
        participants: synced.participants,
        associatedCompanyId,
        associatedCompanyName,
        source: values.source,
        sourceContactId: values.sourceContactId,
        sourceContactName: sourceContact?.label,
        sourceContactRole: sourceContactRole ?? sourceContact?.roleLabel,
        sourceContactOrganisation: sourceContactOrganisation ?? sourceContact?.organisation,
        proceedToDocuments,
      },
    };
  };

  const submitAndClose = (values: FormValues, proceedToDocuments: boolean) => {
    const { input, meta } = buildPayload(values, proceedToDocuments);
    onSubmit(input, meta);
    onOpenChange(false);
  };

  const handleSaveAndExit = form.handleSubmit((values) => submitAndClose(values, false));
  const handleProceedToDocuments = form.handleSubmit((values) => submitAndClose(values, true));

  const closeApi = useWorkspaceClose({
    onClose: () => onOpenChange(false),
    hasUnsavedChanges: isDirty,
    enableEscapeKey: false,
    onSaveAndClose: () =>
      new Promise<boolean>((resolve) => {
        void form.handleSubmit(
          (values) => {
            submitAndClose(values, false);
            resolve(true);
          },
          () => resolve(false),
        )();
      }),
  });

  const sourceContactId = form.watch("sourceContactId");
  const sourceContact = findSourceContactOption(source, sourceContactId);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true);
          else closeApi.requestClose();
        }}
      >
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
                        onCreateNew={(q) => {
                          setPrimaryCreatePrefill(q);
                          setPrimaryCreateOpen(true);
                        }}
                      />
                    </FormField>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <ReadOnlyField label="Mobile Number" value={form.watch("customerMobile")} />
                      <ReadOnlyField label="Email Address" value={form.watch("customerEmail")} />
                      <ReadOnlyField label="Employment Type" value={form.watch("employmentType")} />
                      <ReadOnlyField label="City" value={form.watch("city")} />
                    </div>

                    <FormField
                      label={
                        companyFromProfile
                          ? "Associated Company (from Borrower Profile)"
                          : "Associated Company (Optional)"
                      }
                    >
                      <EntityMasterSearch
                        placeholder="Search company…"
                        selectedId={associatedCompanyId}
                        selectedLabel={associatedCompanyName}
                        options={companyOptions}
                        onSelect={selectAssociatedCompany}
                      />
                      {companyFromProfile && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Capture once on Borrower Profile · reused here. Change only if needed.
                        </p>
                      )}
                    </FormField>

                    <div className="border-t border-blue-600/15 pt-4">
                      <p className="mb-3 text-xs font-semibold text-foreground">
                        Co-Applicants / Loan Participants
                      </p>
                      <LoanParticipantsPanel
                        participants={participants}
                        entityOptions={participantEntityOptions}
                        onChange={setParticipants}
                        maxParticipants={9}
                        onContactCreated={() => setContactOptionsTick((t) => t + 1)}
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
                        onValueChange={(v) => form.setValue("source", v, { shouldDirty: true })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOAN_JOURNEY_SOURCES.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    {!hideSourceContact && (
                      <FormField label="Source Contact">
                        <EntityMasterSearch
                          placeholder={
                            sourceContactOptions.length === 0
                              ? "No matching contacts for this source"
                              : "Search contact…"
                          }
                          selectedId={sourceContactId}
                          selectedLabel={sourceContact?.label}
                          options={sourceContactOptions}
                          onSelect={selectSourceContact}
                        />
                      </FormField>
                    )}

                    {!hideSourceContact && sourceContact && (
                      <>
                        <ReadOnlyField label="Mobile Number" value={sourceContact.mobile} />
                        <ReadOnlyField label="Email Address" value={sourceContact.email} />
                        <ReadOnlyField
                          label="Role / Designation"
                          value={sourceContactRole ?? sourceContact.roleLabel}
                        />
                        <ReadOnlyField
                          label="Organisation"
                          value={sourceContactOrganisation ?? sourceContact.organisation ?? "—"}
                        />
                      </>
                    )}
                  </div>
                  {!hideSourceContact && sourceContactId && onOpenSourceContact && (
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
                  description="Loan request and credit parameters"
                  icon={<FileText className="h-4 w-4" />}
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <FormField label="Product Type">
                      <Select
                        value={lendingType}
                        onValueChange={(v) => {
                          form.setValue("lendingType", v as LendingType, { shouldDirty: true });
                          const products = getProductsForLendingType(v as LendingType);
                          form.setValue("loanProduct", products[0] ?? "", { shouldDirty: true });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LENDING_TYPES.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Product">
                      <Select
                        value={form.watch("loanProduct")}
                        onValueChange={(v) => form.setValue("loanProduct", v, { shouldDirty: true })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {productOptions.map((p) => (
                            <SelectItem key={p} value={p} className="text-xs">
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Transaction Type">
                      <Select
                        value={form.watch("transactionType")}
                        onValueChange={(v) => {
                          const next = v as TransactionType;
                          form.setValue("transactionType", next, { shouldDirty: true });
                          if (next !== "balance_transfer") {
                            form.setValue("btInstitutionId", "", { shouldDirty: true });
                            form.setValue("btInstitutionName", "", { shouldDirty: true });
                            form.setValue("btAmount", undefined as unknown as number, {
                              shouldDirty: true,
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSACTION_TYPES.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <ExistingLoanInformationSection
                        visible={showExistingLoan}
                        institutionId={form.watch("btInstitutionId") || undefined}
                        outstandingAmount={form.watch("btAmount")}
                        onInstitutionChange={(id, name) => {
                          form.setValue("btInstitutionId", id, { shouldDirty: true });
                          form.setValue("btInstitutionName", name, { shouldDirty: true });
                        }}
                        onOutstandingChange={(amount) =>
                          form.setValue("btAmount", (amount ?? undefined) as number, {
                            shouldDirty: true,
                          })
                        }
                        institutionError={form.formState.errors.btInstitutionId?.message}
                        amountError={form.formState.errors.btAmount?.message}
                      />
                    </div>

                    <FormField label="Customer Type">
                      <Select
                        value={form.watch("customerType")}
                        onValueChange={(v) => form.setValue("customerType", v, { shouldDirty: true })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CUSTOMER_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField
                      label="Required Loan Amount (₹) *"
                      error={form.formState.errors.requiredAmount?.message}
                    >
                      <INRCurrencyInput
                        value={form.watch("requiredAmount")}
                        placeholder="Enter Required Loan Amount"
                        onChange={(v) =>
                          form.setValue(
                            "requiredAmount",
                            (v ?? undefined) as number,
                            { shouldDirty: true, shouldValidate: true },
                          )
                        }
                      />
                    </FormField>

                    <FormField
                      label={(() => {
                        const emp = form.watch("employmentType");
                        const ctx = getContextAwareVisibility(emp);
                        const cat = resolveContextCustomerCategory(emp);
                        if (ctx.isSalariedFamily) return "Monthly Salary (₹) *";
                        if (cat === "self_employed_professional") return "Annual Gross Receipts (₹) *";
                        if (ctx.isSelfEmployedFamily) return "Annual Turnover (₹) *";
                        return "Monthly Salary (₹) *";
                      })()}
                      error={form.formState.errors.monthlyIncome?.message}
                    >
                      <INRCurrencyInput
                        value={form.watch("monthlyIncome")}
                        onChange={(v) =>
                          form.setValue("monthlyIncome", v ?? 0, { shouldDirty: true })
                        }
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {(() => {
                          const emp = form.watch("employmentType");
                          const ctx = getContextAwareVisibility(emp);
                          const cat = resolveContextCustomerCategory(emp);
                          if (ctx.isSalariedFamily) {
                            return "Context-aware · salaried monthly salary for loan assessment.";
                          }
                          if (cat === "self_employed_professional") {
                            return "Context-aware · professional annual gross receipts (not salary).";
                          }
                          if (ctx.isSelfEmployedFamily) {
                            return "Context-aware · business annual turnover (not salary).";
                          }
                          return "Context-aware income metric for loan assessment.";
                        })()}
                      </p>
                    </FormField>

                    <ApproxCibilScoreField
                      value={form.watch("approxCibilScore")}
                      onChange={(v) =>
                        form.setValue("approxCibilScore", v, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      error={form.formState.errors.approxCibilScore?.message}
                    />

                    <FormField label="Priority">
                      <Select
                        value={form.watch("priority")}
                        onValueChange={(v) =>
                          form.setValue("priority", v as FormValues["priority"], {
                            shouldDirty: true,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["urgent", "high", "medium", "low"] as const).map((p) => (
                            <SelectItem key={p} value={p} className="text-xs capitalize">
                              {p}
                            </SelectItem>
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
              <Button type="button" variant="outline" onClick={closeApi.requestClose}>
                Cancel
              </Button>
              <Button type="button" variant="secondary" onClick={handleSaveAndExit}>
                Save &amp; Exit
              </Button>
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90"
                onClick={handleProceedToDocuments}
              >
                Proceed to Document Stage
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ProgressiveContactCreateModal
        open={primaryCreateOpen}
        onOpenChange={setPrimaryCreateOpen}
        initialName={primaryCreatePrefill}
        participantKind="primary_applicant"
        onCreated={applyProgressivePrimary}
      />

      <UnsavedChangesDialog
        open={closeApi.confirmOpen}
        onOpenChange={closeApi.setConfirmOpen}
        onDiscard={closeApi.handleDiscard}
        onSaveAndClose={closeApi.handleSaveAndClose}
        saving={closeApi.saving}
      />
    </>
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
