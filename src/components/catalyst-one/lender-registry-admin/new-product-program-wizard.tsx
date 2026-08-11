"use client";

/**
 * CO-ARCH-005 — Product Program Creation Wizard.
 * Creates intentional commercial programs from a lender's Supported Products only.
 * Never invents programs from capability alone outside this wizard.
 */
import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/components/providers/auth-provider";
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
import { Textarea } from "@/components/ui/textarea";
import { lenderRegistryClient } from "@/lib/enterprise-lender-registry";
import { supportedProductOptionsForLender } from "@/lib/enterprise-lender-registry/program-architecture";
import type {
  EnterpriseLenderRecord,
  LenderRegistryProductCode,
} from "@/types/enterprise-lender-registry";
import { cn } from "@/lib/utils";
import { listSelectableCreditRiskPolicies } from "@/lib/enterprise-lender-registry/resolve-program-policy";

const STEPS = [
  "Select Lender",
  "Choose Product",
  "Configure Program",
  "Save",
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lenders: EnterpriseLenderRecord[];
  preselectedLenderId?: string;
  onCompleted: () => void;
};

export function NewProductProgramWizard({
  open,
  onOpenChange,
  lenders,
  preselectedLenderId,
  onCompleted,
}: Props) {
  const { user } = useAuthContext();
  const actor =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "admin";

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lenderId, setLenderId] = useState(preselectedLenderId ?? "");
  const [productCode, setProductCode] = useState<LenderRegistryProductCode | "">("");
  const [programName, setProgramName] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [roiPercent, setRoiPercent] = useState("");
  const [processingFeePct, setProcessingFeePct] = useState("");
  const [maxLtvPercent, setMaxLtvPercent] = useState("");
  const [maxTenureMonths, setMaxTenureMonths] = useState("");
  const [borrowerType, setBorrowerType] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [minCibil, setMinCibil] = useState("");
  const [minIncomeAmount, setMinIncomeAmount] = useState("");
  const [maxFoirPercent, setMaxFoirPercent] = useState("");
  const [maxDbrPercent, setMaxDbrPercent] = useState("");
  const [minFundingAmount, setMinFundingAmount] = useState("");
  const [creditRiskPolicyRef, setCreditRiskPolicyRef] = useState("");
  const [requiredDocumentTypes, setRequiredDocumentTypes] = useState("");
  const [averageTatDays, setAverageTatDays] = useState("");
  const [insuranceRequirement, setInsuranceRequirement] = useState("");
  const [eligibleStates, setEligibleStates] = useState("");
  const [notes, setNotes] = useState("");

  const lender = useMemo(
    () => lenders.find((l) => l.id === lenderId) ?? null,
    [lenders, lenderId],
  );
  const productOptions = supportedProductOptionsForLender(lender);

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(lenderId);
    if (step === 1) return Boolean(productCode);
    if (step === 2) return programName.trim().length > 1;
    return true;
  }, [step, lenderId, productCode, programName]);

  if (!open) return null;

  function reset() {
    setStep(0);
    setLenderId(preselectedLenderId ?? "");
    setProductCode("");
    setProgramName("");
    setCampaignName("");
    setRoiPercent("");
    setProcessingFeePct("");
    setMaxLtvPercent("");
    setMaxTenureMonths("");
    setBorrowerType("");
    setEmploymentType("");
    setMinCibil("");
    setMinIncomeAmount("");
    setMaxFoirPercent("");
    setMaxDbrPercent("");
    setMinFundingAmount("");
    setCreditRiskPolicyRef("");
    setRequiredDocumentTypes("");
    setAverageTatDays("");
    setInsuranceRequirement("");
    setEligibleStates("");
    setNotes("");
  }

  async function persist(mode: "draft" | "publish") {
    if (!lender || !productCode || !programName.trim()) return;
    setBusy(true);
    try {
      const codeBase = `${lender.shortName || lender.code}_${productCode}`
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "")
        .slice(0, 28);
      const label = campaignName.trim()
        ? `${programName.trim()} — ${campaignName.trim()}`
        : programName.trim();

      const program = await lenderRegistryClient.createProgram(
        {
          lenderId: lender.id,
          productCode,
          code: `${codeBase}_${Date.now().toString(36).toUpperCase()}`,
          label,
          borrowerType: borrowerType.trim() || undefined,
          employmentType: employmentType.trim() || undefined,
          roiPercent: roiPercent ? Number(roiPercent) : undefined,
          processingFeePct: processingFeePct ? Number(processingFeePct) : undefined,
          maxLtvPercent: maxLtvPercent ? Number(maxLtvPercent) : undefined,
          maxTenureMonths: maxTenureMonths ? Number(maxTenureMonths) : undefined,
          minCibil: minCibil ? Number(minCibil) : undefined,
          minIncomeAmount: minIncomeAmount ? Number(minIncomeAmount) : undefined,
          maxFoirPercent: maxFoirPercent ? Number(maxFoirPercent) : undefined,
          maxDbrPercent: maxDbrPercent ? Number(maxDbrPercent) : undefined,
          minFundingAmount: minFundingAmount ? Number(minFundingAmount) : undefined,
          creditRiskPolicyRef: creditRiskPolicyRef.trim() || undefined,
          requiredDocumentTypeIds: requiredDocumentTypes
            .split(/[,;\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
          averageTatDays: averageTatDays ? Number(averageTatDays) : undefined,
          eligibleStates: eligibleStates
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          remarks: [
            insuranceRequirement.trim()
              ? `Insurance: ${insuranceRequirement.trim()}`
              : "",
            campaignName.trim() ? `Campaign: ${campaignName.trim()}` : "",
            notes.trim(),
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
          lifecycleStatus: mode === "publish" ? "active" : "draft",
          status: mode === "publish" ? "active" : "draft",
          enabled: true,
        },
        actor,
      );

      if (mode === "publish") {
        await lenderRegistryClient.updateProgram(
          program.id,
          {
            lifecycleStatus: "active",
            status: "active",
            enabled: true,
          },
          actor,
        );
      }

      toast.success(
        mode === "publish"
          ? `Published program “${label}” — now available in comparison.`
          : `Draft program “${label}” saved.`,
      );
      reset();
      onOpenChange(false);
      onCompleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save program");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">New Product Program</h2>
          <p className="text-xs text-muted-foreground">
            Commercial offering wizard · Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Supported Products = capability. Programs = intentional commercial configuration.
            Nothing is auto-generated.
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
            <Field label="Lender *">
              <Select
                value={lenderId || undefined}
                onValueChange={(v) => {
                  setLenderId(v);
                  setProductCode("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lender from Enterprise Lender Registry" />
                </SelectTrigger>
                <SelectContent>
                  {lenders
                    .filter((l) => !l.isDeleted)
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {(l.displayName || l.label) + ` (${l.code})`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Showing Supported Products for{" "}
                <span className="font-medium text-foreground">
                  {lender?.displayName || lender?.label}
                </span>{" "}
                only. Add capabilities on the lender master before creating programs.
              </p>
              {productOptions.length === 0 ? (
                <CardNote>
                  This lender has no Supported Products. Update the lender master (Supported
                  Products) before creating a commercial program.
                </CardNote>
              ) : (
                <Field label="Supported Product *">
                  <Select
                    value={productCode || undefined}
                    onValueChange={(v) => {
                      setProductCode(v as LenderRegistryProductCode);
                      if (!programName.trim() && lender) {
                        const meta = productOptions.find((p) => p.code === v);
                        setProgramName(
                          `${lender.shortName || lender.displayName || lender.label} ${meta?.label ?? v} Standard`,
                        );
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose product capability" />
                    </SelectTrigger>
                    <SelectContent>
                      {productOptions.map((p) => (
                        <SelectItem key={p.code} value={p.code}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Program Name *" className="sm:col-span-2">
                <Input value={programName} onChange={(e) => setProgramName(e.target.value)} />
              </Field>
              <Field label="Campaign Name">
                <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
              </Field>
              <Field label="ROI %">
                <Input
                  type="number"
                  step="0.01"
                  value={roiPercent}
                  onChange={(e) => setRoiPercent(e.target.value)}
                />
              </Field>
              <Field label="Processing Fee %">
                <Input
                  type="number"
                  step="0.01"
                  value={processingFeePct}
                  onChange={(e) => setProcessingFeePct(e.target.value)}
                />
              </Field>
              <Field label="Max LTV %">
                <Input
                  type="number"
                  value={maxLtvPercent}
                  onChange={(e) => setMaxLtvPercent(e.target.value)}
                />
              </Field>
              <Field label="Max Tenure (months)">
                <Input
                  type="number"
                  value={maxTenureMonths}
                  onChange={(e) => setMaxTenureMonths(e.target.value)}
                />
              </Field>
              <Field label="Borrower Type / Eligibility">
                <Input
                  value={borrowerType}
                  onChange={(e) => setBorrowerType(e.target.value)}
                  placeholder="e.g. Salaried / Both"
                />
              </Field>
              <Field label="Employment Type">
                <Input
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  placeholder="salaried | self_employed"
                />
              </Field>
              <Field label="Min CIBIL">
                <Input
                  type="number"
                  value={minCibil}
                  onChange={(e) => setMinCibil(e.target.value)}
                  placeholder="e.g. 700"
                />
              </Field>
              <Field label="Min Income (₹)">
                <Input
                  type="number"
                  value={minIncomeAmount}
                  onChange={(e) => setMinIncomeAmount(e.target.value)}
                />
              </Field>
              <Field label="Max FOIR %">
                <Input
                  type="number"
                  step="0.01"
                  value={maxFoirPercent}
                  onChange={(e) => setMaxFoirPercent(e.target.value)}
                  placeholder="Frozen term · not DTI"
                />
              </Field>
              <Field label="Max DBR %">
                <Input
                  type="number"
                  step="0.01"
                  value={maxDbrPercent}
                  onChange={(e) => setMaxDbrPercent(e.target.value)}
                  placeholder="Frozen term · not DTI"
                />
              </Field>
              <Field label="Min Loan Amount (₹)">
                <Input
                  type="number"
                  value={minFundingAmount}
                  onChange={(e) => setMinFundingAmount(e.target.value)}
                />
              </Field>
              <Field label="Credit & Risk Policy">
                <Select
                  value={creditRiskPolicyRef || "__none__"}
                  onValueChange={(v) => setCreditRiskPolicyRef(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Published CRE policy only" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {listSelectableCreditRiskPolicies().map((p) => (
                      <SelectItem key={p.policyId} value={p.policyId}>
                        {p.policyName} ({p.policyCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Required Document Types (comma-separated codes)"
                className="sm:col-span-2"
              >
                <Textarea
                  value={requiredDocumentTypes}
                  onChange={(e) => setRequiredDocumentTypes(e.target.value)}
                  rows={2}
                  placeholder="e.g. PAN, AADHAAR, ITR, GST, BANK_STATEMENT"
                />
              </Field>
              <Field label="Processing TAT (days)">
                <Input
                  type="number"
                  value={averageTatDays}
                  onChange={(e) => setAverageTatDays(e.target.value)}
                />
              </Field>
              <Field label="Insurance Requirement">
                <Input
                  value={insuranceRequirement}
                  onChange={(e) => setInsuranceRequirement(e.target.value)}
                />
              </Field>
              <Field label="Eligible States (comma-separated)" className="sm:col-span-2">
                <Input
                  value={eligibleStates}
                  onChange={(e) => setEligibleStates(e.target.value)}
                />
              </Field>
              <Field label="Internal Notes" className="sm:col-span-2">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">{lender?.displayName || lender?.label}</span> ·{" "}
                {productOptions.find((p) => p.code === productCode)?.label || productCode}
              </p>
              <p className="text-muted-foreground">
                Program: <span className="text-foreground">{programName || "—"}</span>
                {campaignName ? ` · Campaign: ${campaignName}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Save Draft keeps the program out of comparison. Publish makes it available to the
                Lender Comparison engine and Borrow recommendations.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (step === 0) {
                reset();
                onOpenChange(false);
                return;
              }
              setStep((s) => Math.max(0, s - 1));
            }}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          <div className="flex flex-wrap gap-2">
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                size="sm"
                disabled={!canNext || busy}
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void persist("draft")}
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void persist("publish")}
                >
                  Publish
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
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function CardNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm text-warning">
      {children}
    </div>
  );
}
