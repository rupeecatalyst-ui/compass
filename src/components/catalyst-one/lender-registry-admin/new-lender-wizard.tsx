"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { lenderRegistryClient } from "@/lib/enterprise-lender-registry";
import { useProductMasterOptions } from "@/lib/enterprise-product-master";
import {
  LENDER_MASTER_CLASSIFICATION_LABELS,
  type LenderContactDepartment,
  type LenderDocumentKind,
  type LenderInstitutionCategory,
  type LenderMasterClassification,
} from "@/types/enterprise-lender-registry";
import { cn } from "@/lib/utils";

const CLASSIFICATION_TO_INSTITUTION: Record<
  LenderMasterClassification,
  LenderInstitutionCategory
> = {
  public_sector_bank: "bank",
  private_sector_bank: "bank",
  small_finance_bank: "bank",
  housing_finance_company: "hfc",
  nbfc: "nbfc",
  cooperative_bank: "cooperative",
  payments_bank: "fintech",
  foreign_bank: "bank",
};

const STEPS = [
  "Basic Information",
  "Business Coverage",
  "Business Contacts",
  "Products Supported",
  "Program Management",
  "Supporting Documents",
  "Save",
] as const;

type ContactDraft = {
  name: string;
  designation: string;
  department: LenderContactDepartment;
  mobile: string;
  email: string;
  preferredContactMethod: string;
  enabled: boolean;
};

type ProgramDraft = {
  productCode: string;
  label: string;
  borrowerType: string;
  roiPercent: string;
  minRoiPercent: string;
  maxRoiPercent: string;
  processingFeeLabel: string;
  maxFundingAmount: string;
  maxLtvPercent: string;
  maxTenureMonths: string;
  minCibil: string;
  minIncomeAmount: string;
  employmentType: string;
  eligibleStates: string;
  eligibleCities: string;
  averageTatDays: string;
  remarks: string;
  status: "draft" | "active";
};

type DocDraft = {
  kind: LenderDocumentKind;
  title: string;
  fileName: string;
};

const emptyContact = (): ContactDraft => ({
  name: "",
  designation: "",
  department: "relationship_manager",
  mobile: "",
  email: "",
  preferredContactMethod: "mobile",
  enabled: true,
});

const emptyProgram = (productCode: string): ProgramDraft => ({
  productCode,
  label: "",
  borrowerType: "",
  roiPercent: "",
  minRoiPercent: "",
  maxRoiPercent: "",
  processingFeeLabel: "",
  maxFundingAmount: "",
  maxLtvPercent: "",
  maxTenureMonths: "",
  minCibil: "",
  minIncomeAmount: "",
  employmentType: "both",
  eligibleStates: "",
  eligibleCities: "",
  averageTatDays: "",
  remarks: "",
  status: "draft",
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
};

export function NewLenderWizard({ open, onOpenChange, onCompleted }: Props) {
  const { user } = useAuthContext();
  const actor = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "admin";
  const { options: productMasterOptions } = useProductMasterOptions(true);
  const LENDER_REGISTRY_PRODUCT_OPTIONS = productMasterOptions.map((p) => ({
    code: p.code,
    label: p.label,
  }));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [label, setLabel] = useState("");
  const [legalName, setLegalName] = useState("");
  const [shortName, setShortName] = useState("");
  const [classification, setClassification] =
    useState<LenderMasterClassification>("private_sector_bank");
  const [website, setWebsite] = useState("");
  const [rbi, setRbi] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [customerCarePhone, setCustomerCarePhone] = useState("");
  const [customerCareEmail, setCustomerCareEmail] = useState("");
  const [headquarters, setHeadquarters] = useState("");
  const [statusDraft, setStatusDraft] = useState<"draft" | "active">("draft");

  const [panIndia, setPanIndia] = useState(false);
  const [statesServed, setStatesServed] = useState("");
  const [citiesServed, setCitiesServed] = useState("");

  const [contacts, setContacts] = useState<ContactDraft[]>([emptyContact()]);
  const [products, setProducts] = useState<string[]>(["home_loan"]);
  const [programs, setPrograms] = useState<ProgramDraft[]>([]);
  const [documents, setDocuments] = useState<DocDraft[]>([]);

  const canNext = useMemo(() => {
    if (step === 0) return label.trim().length > 1;
    if (step === 3) return products.length > 0;
    return true;
  }, [step, label, products.length]);

  if (!open) return null;

  function reset() {
    setStep(0);
    setLabel("");
    setLegalName("");
    setShortName("");
    setClassification("private_sector_bank");
    setWebsite("");
    setRbi("");
    setLogoUrl("");
    setCustomerCarePhone("");
    setCustomerCareEmail("");
    setHeadquarters("");
    setStatusDraft("draft");
    setPanIndia(false);
    setStatesServed("");
    setCitiesServed("");
    setContacts([emptyContact()]);
    setProducts(["home_loan"]);
    setPrograms([]);
    setDocuments([]);
  }

  function ensureProgramsForProducts(nextProducts: string[]) {
    setPrograms((prev) => {
      const kept = prev.filter((p) => nextProducts.includes(p.productCode));
      for (const code of nextProducts) {
        if (!kept.some((p) => p.productCode === code)) {
          const meta = LENDER_REGISTRY_PRODUCT_OPTIONS.find((p) => p.code === code);
          kept.push({
            ...emptyProgram(code),
            label: meta ? `${meta.label} Standard` : "Standard Program",
          });
        }
      }
      return kept;
    });
  }

  async function persist(mode: "draft" | "publish" | "archive") {
    setBusy(true);
    try {
      const categories = await lenderRegistryClient.listCategoriesAsync();
      const categoryId = categories[0]?.id;
      if (!categoryId) {
        throw new Error(
          "No Enterprise Lender category available. Create a category in Lender Registry Admin first.",
        );
      }
      const institutionCategory = CLASSIFICATION_TO_INSTITUTION[classification];

      const { record: lender } = await lenderRegistryClient.createLender(
        {
          categoryId,
          // LND code allocated by store / API — never free-typed
          label: label.trim(),
          legalName: (legalName || label).trim(),
          displayName: label.trim(),
          shortName: shortName.trim() || undefined,
          institutionCategory,
          classification,
          website: website.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
          rbiRegistrationNumber: rbi.trim() || undefined,
          rbiRegulated: true,
          customerCarePhone: customerCarePhone.trim() || undefined,
          customerCareEmail: customerCareEmail.trim() || undefined,
          headquartersLabel: headquarters.trim() || undefined,
          panIndia,
          coverageStates: statesServed
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          coverageCities: citiesServed
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          productsSupported: products,
          lifecycleStatus: mode === "publish" ? "active" : mode === "archive" ? "retired" : "draft",
          operationalStatus: mode === "publish" ? "active" : "inactive",
          status: mode === "publish" ? "active" : mode === "archive" ? "archived" : "draft",
          enabled: mode !== "archive",
        },
        actor,
      );

      await lenderRegistryClient.replaceContacts(
        lender.id,
        contacts
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name,
            designation: c.designation || undefined,
            department: c.department,
            mobile: c.mobile || undefined,
            email: c.email || undefined,
            preferredContactMethod: c.preferredContactMethod || undefined,
            enabled: c.enabled,
          })),
        actor,
      );

      await lenderRegistryClient.replaceDocuments(
        lender.id,
        documents
          .filter((d) => d.title.trim())
          .map((d) => ({
            kind: d.kind,
            title: d.title,
            fileName: d.fileName || undefined,
          })),
        actor,
      );

      for (const prog of programs.filter((p) => p.label.trim())) {
        await lenderRegistryClient.createProgram(
          {
            lenderId: lender.id,
            productCode: prog.productCode,
            code: `${lender.code}_${prog.productCode}_${Date.now().toString(36)}`.toUpperCase(),
            label: prog.label.trim(),
            borrowerType: prog.borrowerType || undefined,
            employmentType: prog.employmentType || undefined,
            roiPercent: prog.roiPercent ? Number(prog.roiPercent) : undefined,
            minRoiPercent: prog.minRoiPercent ? Number(prog.minRoiPercent) : undefined,
            maxRoiPercent: prog.maxRoiPercent ? Number(prog.maxRoiPercent) : undefined,
            processingFeeLabel: prog.processingFeeLabel || undefined,
            maxFundingAmount: prog.maxFundingAmount ? Number(prog.maxFundingAmount) : undefined,
            maxLtvPercent: prog.maxLtvPercent ? Number(prog.maxLtvPercent) : undefined,
            maxTenureMonths: prog.maxTenureMonths ? Number(prog.maxTenureMonths) : undefined,
            minCibil: prog.minCibil ? Number(prog.minCibil) : undefined,
            minIncomeAmount: prog.minIncomeAmount ? Number(prog.minIncomeAmount) : undefined,
            eligibleStates: prog.eligibleStates
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            eligibleCities: prog.eligibleCities
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            averageTatDays: prog.averageTatDays ? Number(prog.averageTatDays) : undefined,
            remarks: prog.remarks || undefined,
            lifecycleStatus: mode === "publish" || prog.status === "active" ? "active" : "draft",
            status: mode === "publish" || prog.status === "active" ? "active" : "draft",
            enabled: mode !== "archive",
          },
          actor,
        );
      }

      if (mode === "publish") {
        await lenderRegistryClient.publishLender(lender.id, actor);
      }
      if (mode === "archive") {
        await lenderRegistryClient.archiveLender(lender.id, actor);
      }

      toast.success(
        mode === "publish"
          ? "Lender published to Enterprise Lender Registry."
          : mode === "archive"
            ? "Lender archived."
            : "Lender saved as draft.",
      );
      reset();
      onOpenChange(false);
      onCompleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save lender");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">New Lender</h2>
          <p className="text-xs text-muted-foreground">
            Enterprise Lender Registry wizard · Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {STEPS.map((labelStep, i) => (
              <span
                key={labelStep}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px]",
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                      ? "bg-muted text-foreground"
                      : "bg-muted/50 text-muted-foreground",
                )}
              >
                {i < step ? <Check className="mr-1 inline h-3 w-3" /> : null}
                {i + 1}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Display Name *">
                <Input value={label} onChange={(e) => setLabel(e.target.value)} />
              </Field>
              <Field label="Official Legal Name">
                <Input
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Defaults to display name"
                />
              </Field>
              <Field label="Short Name">
                <Input value={shortName} onChange={(e) => setShortName(e.target.value)} />
              </Field>
              <Field label="Classification *">
                <Select
                  value={classification}
                  onValueChange={(v) => setClassification(v as LenderMasterClassification)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LENDER_MASTER_CLASSIFICATION_LABELS) as LenderMasterClassification[]).map(
                      (key) => (
                        <SelectItem key={key} value={key}>
                          {LENDER_MASTER_CLASSIFICATION_LABELS[key]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={statusDraft}
                  onValueChange={(v) => setStatusDraft(v as "draft" | "active")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Headquarters">
                <Input value={headquarters} onChange={(e) => setHeadquarters(e.target.value)} />
              </Field>
              <Field label="Website">
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
              </Field>
              <Field label="RBI Registration Number">
                <Input value={rbi} onChange={(e) => setRbi(e.target.value)} />
              </Field>
              <Field label="Customer Care Phone">
                <Input
                  value={customerCarePhone}
                  onChange={(e) => setCustomerCarePhone(e.target.value)}
                />
              </Field>
              <Field label="Customer Care Email">
                <Input
                  value={customerCareEmail}
                  onChange={(e) => setCustomerCareEmail(e.target.value)}
                />
              </Field>
              <Field label="Logo URL / Upload path" className="sm:col-span-2">
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Paste logo URL (file upload stores URL reference)"
                />
                <Input
                  type="file"
                  accept="image/*"
                  className="mt-2"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setLogoUrl(String(reader.result ?? ""));
                    reader.readAsDataURL(file);
                  }}
                />
              </Field>
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Immutable Lender Code (LND000001…) is allocated automatically on save.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={panIndia} onCheckedChange={(v) => setPanIndia(Boolean(v))} />
                PAN India
              </label>
              <Field label="States Served (comma-separated)">
                <Textarea
                  value={statesServed}
                  onChange={(e) => setStatesServed(e.target.value)}
                  rows={3}
                />
              </Field>
              <Field label="Cities Served (comma-separated)">
                <Textarea
                  value={citiesServed}
                  onChange={(e) => setCitiesServed(e.target.value)}
                  rows={3}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {contacts.map((c, idx) => (
                <div key={idx} className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
                  <Field label="Name">
                    <Input
                      value={c.name}
                      onChange={(e) => {
                        const next = [...contacts];
                        next[idx] = { ...c, name: e.target.value };
                        setContacts(next);
                      }}
                    />
                  </Field>
                  <Field label="Designation">
                    <Input
                      value={c.designation}
                      onChange={(e) => {
                        const next = [...contacts];
                        next[idx] = { ...c, designation: e.target.value };
                        setContacts(next);
                      }}
                    />
                  </Field>
                  <Field label="Department">
                    <Select
                      value={c.department}
                      onValueChange={(v) => {
                        const next = [...contacts];
                        next[idx] = { ...c, department: v as LenderContactDepartment };
                        setContacts(next);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relationship_manager">Relationship Manager</SelectItem>
                        <SelectItem value="credit">Credit Manager</SelectItem>
                        <SelectItem value="sales">Sales Manager</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="escalation">Escalation</SelectItem>
                        <SelectItem value="regional_head">Regional Head</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Preferred Contact Method">
                    <Input
                      value={c.preferredContactMethod}
                      onChange={(e) => {
                        const next = [...contacts];
                        next[idx] = { ...c, preferredContactMethod: e.target.value };
                        setContacts(next);
                      }}
                    />
                  </Field>
                  <Field label="Mobile">
                    <Input
                      value={c.mobile}
                      onChange={(e) => {
                        const next = [...contacts];
                        next[idx] = { ...c, mobile: e.target.value };
                        setContacts(next);
                      }}
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      value={c.email}
                      onChange={(e) => {
                        const next = [...contacts];
                        next[idx] = { ...c, email: e.target.value };
                        setContacts(next);
                      }}
                    />
                  </Field>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setContacts([...contacts, emptyContact()])}>
                + Add Contact
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {LENDER_REGISTRY_PRODUCT_OPTIONS.map((p) => {
                const checked = products.includes(p.code);
                return (
                  <label
                    key={p.code}
                    className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const on = Boolean(v);
                        const next = on
                          ? [...products, p.code]
                          : products.filter((code) => code !== p.code);
                        setProducts(next);
                        ensureProgramsForProducts(next);
                      }}
                    />
                    {p.label}
                  </label>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              {programs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Select products in Step 4, then configure programs here.
                </p>
              ) : null}
              {programs.map((prog, idx) => (
                <div key={`${prog.productCode}-${idx}`} className="space-y-2 rounded-lg border border-border/60 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {LENDER_REGISTRY_PRODUCT_OPTIONS.find((p) => p.code === prog.productCode)?.label ??
                      prog.productCode}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Program Name">
                      <Input
                        value={prog.label}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, label: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="Borrower Type">
                      <Input
                        value={prog.borrowerType}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, borrowerType: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="ROI %">
                      <Input
                        value={prog.roiPercent}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, roiPercent: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="Min ROI">
                      <Input
                        value={prog.minRoiPercent}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, minRoiPercent: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="Max ROI">
                      <Input
                        value={prog.maxRoiPercent}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, maxRoiPercent: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="Processing Fee">
                      <Input
                        value={prog.processingFeeLabel}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, processingFeeLabel: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="Maximum Funding">
                      <Input
                        value={prog.maxFundingAmount}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, maxFundingAmount: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="Maximum LTV %">
                      <Input
                        value={prog.maxLtvPercent}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, maxLtvPercent: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="Maximum Tenure (months)">
                      <Input
                        value={prog.maxTenureMonths}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, maxTenureMonths: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="Minimum CIBIL">
                      <Input
                        value={prog.minCibil}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, minCibil: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="Minimum Income">
                      <Input
                        value={prog.minIncomeAmount}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, minIncomeAmount: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="Employment Type">
                      <Select
                        value={prog.employmentType}
                        onValueChange={(v) => {
                          const next = [...programs];
                          next[idx] = { ...prog, employmentType: v };
                          setPrograms(next);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="salaried">Salaried</SelectItem>
                          <SelectItem value="self_employed">Self-employed</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Eligible States">
                      <Input
                        value={prog.eligibleStates}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, eligibleStates: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="Eligible Cities">
                      <Input
                        value={prog.eligibleCities}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, eligibleCities: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="TAT (days)">
                      <Input
                        value={prog.averageTatDays}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, averageTatDays: e.target.value };
                          setPrograms(next);
                        }}
                      />
                    </Field>
                    <Field label="Program Status">
                      <Select
                        value={prog.status}
                        onValueChange={(v) => {
                          const next = [...programs];
                          next[idx] = { ...prog, status: v as "draft" | "active" };
                          setPrograms(next);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Remarks" className="sm:col-span-2">
                      <Textarea
                        value={prog.remarks}
                        onChange={(e) => {
                          const next = [...programs];
                          next[idx] = { ...prog, remarks: e.target.value };
                          setPrograms(next);
                        }}
                        rows={2}
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const code = products[0] ?? "home_loan";
                  setPrograms([...programs, emptyProgram(code)]);
                }}
              >
                + Add Program
              </Button>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              {(
                [
                  "agreement",
                  "policy",
                  "program_circular",
                  "rate_sheet",
                  "sanction_format",
                  "kfs",
                  "other",
                ] as LenderDocumentKind[]
              ).map((kind) => (
                <div key={kind} className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Field label={kind.replace(/_/g, " ")}>
                    <Input
                      placeholder="Document title"
                      onBlur={(e) => {
                        const title = e.target.value.trim();
                        if (!title) return;
                        setDocuments((prev) => {
                          const without = prev.filter((d) => d.kind !== kind);
                          return [...without, { kind, title, fileName: "" }];
                        });
                      }}
                    />
                  </Field>
                  <Field label="File">
                    <Input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setDocuments((prev) => {
                          const without = prev.filter((d) => d.kind !== kind);
                          return [
                            ...without,
                            { kind, title: file.name, fileName: file.name },
                          ];
                        });
                      }}
                    />
                  </Field>
                </div>
              ))}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">{label || "—"}</span> ·{" "}
                {LENDER_MASTER_CLASSIFICATION_LABELS[classification]} · {products.length} products ·{" "}
                {contacts.filter((c) => c.name).length} contacts ·{" "}
                {programs.filter((p) => p.label).length} programs
              </p>
              <p className="text-muted-foreground">
                Save Draft keeps the lender inactive for comparison. Publish makes programs
                available on the read-only Lenders comparison page. Archive retires the lender.
                Lender Code is assigned as LND###### and never changes after issue.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <div className="flex flex-wrap gap-2">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                disabled={!canNext}
                onClick={() => {
                  if (step === 3) ensureProgramsForProducts(products);
                  setStep((s) => s + 1);
                }}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" disabled={busy} onClick={() => void persist("draft")}>
                  Save Draft
                </Button>
                <Button type="button" disabled={busy} onClick={() => void persist("publish")}>
                  Publish
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void persist("archive")}
                >
                  Archive
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
