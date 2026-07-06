"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { categoryToPolicySection } from "@/constants/policy-rule-sections";
import { getEnabledProducts } from "@/constants/product-master";
import {
  getActiveLenders,
  savePolicyDraft,
  transitionPolicyStatus,
} from "@/lib/credit-risk-engine/policy-store";
import { POLICY_RULE_CATEGORY_PAIRS } from "@/constants/policy-rule-sections";
import { getRuleById } from "@/lib/credit-risk-engine/rule-store";
import type { CreditRiskPolicySummary, PolicyRuleReference, PolicyRuleSectionId } from "@/types/credit-risk-engine";
import type { RuleLibraryVersion } from "@/types/rule-library";
import { CreditRiskEngineShell } from "@/components/catalyst-one/credit-risk-engine/credit-risk-engine-shell";
import { PolicyRulePicker } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-rule-picker";
import { PolicyRuleSectionsPanel } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-rule-sections-panel";
import { PolicyValidationWarnings } from "@/components/catalyst-one/credit-risk-engine/policy-library/policy-validation-warnings";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const CUSTOMER_CATEGORIES = [
  { id: "salaried", name: "Salaried" },
  { id: "self_employed", name: "Self Employed" },
  { id: "professional", name: "Professional" },
  { id: "pensioner", name: "Pensioner" },
  { id: "nri", name: "NRI" },
];

interface PolicyBuilderFormProps {
  initialPolicy?: CreditRiskPolicySummary;
  initialRuleRefs?: PolicyRuleReference[];
}

export function PolicyBuilderForm({ initialPolicy, initialRuleRefs = [] }: PolicyBuilderFormProps) {
  const router = useRouter();
  const lenders = getActiveLenders();
  const products = getEnabledProducts();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<PolicyRuleSectionId>("financial");
  const [ruleRefs, setRuleRefs] = useState<PolicyRuleReference[]>(initialRuleRefs);
  const [savedPolicyId, setSavedPolicyId] = useState<string | undefined>(initialPolicy?.policyId);

  const [form, setForm] = useState({
    policyCode: initialPolicy?.policyCode ?? "",
    policyName: initialPolicy?.policyName ?? "",
    description: initialPolicy?.description ?? "",
    lenderId: initialPolicy?.lenderId ?? "",
    productId: initialPolicy?.productId ?? "",
    customerCategoryId: initialPolicy?.customerCategoryId ?? "",
    priority: String(initialPolicy?.priority ?? 50),
    approvalAuthority: initialPolicy?.approvalAuthority ?? "Chief Risk Officer",
    effectiveFrom: initialPolicy?.effectiveFrom ?? "",
    effectiveTo: initialPolicy?.effectiveTo ?? "",
    createdBy: initialPolicy?.createdBy ?? "Policy Admin",
  });

  const selectedLender = lenders.find((l) => l.id === form.lenderId);
  const selectedProduct = products.find((p) => p.id === form.productId);
  const selectedCategory = CUSTOMER_CATEGORIES.find((c) => c.id === form.customerCategoryId);

  const builderWarnings = (() => {
    const warnings: import("@/types/credit-risk-engine").PolicyValidationWarning[] = [];
    const seen = new Set<string>();
    const subCategories = new Set<string>();

    for (const ref of ruleRefs) {
      if (seen.has(ref.ruleId)) {
        warnings.push({
          code: "duplicate_rule",
          severity: "error",
          message: `Rule ${ref.ruleCode} is assigned more than once.`,
          ruleId: ref.ruleId,
        });
      }
      seen.add(ref.ruleId);
      const rule = getRuleById(ref.ruleId);
      if (rule?.subCategory) subCategories.add(rule.subCategory.toUpperCase());
    }

    for (const pair of POLICY_RULE_CATEGORY_PAIRS) {
      const hasA = subCategories.has(pair.a.toUpperCase());
      const hasB = subCategories.has(pair.b.toUpperCase());
      if (hasA && !hasB) {
        warnings.push({
          code: "missing_pair",
          severity: "warning",
          message: `Policy has ${pair.a} rule but no ${pair.b} rule — ${pair.label}.`,
          categoryId: pair.b,
        });
      }
    }

    return warnings;
  })();

  function handleAttachRule(rule: RuleLibraryVersion) {
    if (ruleRefs.some((r) => r.ruleId === rule.ruleId)) return;
    const sectionId = categoryToPolicySection(rule.categoryId);
    setRuleRefs((prev) => [
      ...prev,
      {
        id: `temp_${rule.ruleId}`,
        policyId: savedPolicyId ?? "draft",
        ruleId: rule.ruleId,
        ruleCode: rule.ruleCode,
        ruleName: rule.ruleName,
        sectionId: activeSection || sectionId,
        majorVersion: rule.majorVersion,
        minorVersion: rule.minorVersion,
        sortOrder: prev.filter((r) => r.sectionId === sectionId).length + 1,
      },
    ]);
  }

  function handleRemoveRule(ruleId: string) {
    setRuleRefs((prev) => prev.filter((r) => r.ruleId !== ruleId));
  }

  function handleSaveDraft() {
    const record = savePolicyDraft({
      policyId: savedPolicyId ?? initialPolicy?.policyId,
      policyCode: form.policyCode,
      policyName: form.policyName,
      description: form.description,
      lenderId: form.lenderId,
      lenderName: selectedLender?.name ?? "",
      productId: form.productId,
      productName: selectedProduct?.name ?? "",
      customerCategoryId: form.customerCategoryId || undefined,
      customerCategoryName: selectedCategory?.name,
      priority: Number(form.priority) || 50,
      approvalAuthority: form.approvalAuthority,
      effectiveFrom: form.effectiveFrom || undefined,
      effectiveTo: form.effectiveTo || undefined,
      createdBy: form.createdBy,
      ruleRefs: ruleRefs.map(({ ruleId, ruleCode, ruleName, sectionId, majorVersion, minorVersion, sortOrder }) => ({
        ruleId,
        ruleCode,
        ruleName,
        sectionId,
        majorVersion,
        minorVersion,
        sortOrder,
      })),
    });
    setSavedPolicyId(record.policyId);
    router.push(`${ROUTES.ADMIN_CREDIT_RISK_POLICY_LIBRARY}/${record.policyId}`);
  }

  function handleTransition(to: CreditRiskPolicySummary["status"]) {
    const id = savedPolicyId ?? initialPolicy?.policyId;
    if (!id) return;
    transitionPolicyStatus(id, to, form.createdBy);
    router.push(`${ROUTES.ADMIN_CREDIT_RISK_POLICY_LIBRARY}/${id}`);
  }

  return (
    <CreditRiskEngineShell
      title={initialPolicy ? "Edit Policy" : "Create Policy"}
      description="Assemble reusable rules from the Rule Library — policies never duplicate business logic."
      actions={
        <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
          <Link href={ROUTES.ADMIN_CREDIT_RISK_POLICY_LIBRARY}>Cancel</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Policy Identity</CardTitle>
            <CardDescription>Select lender, product and customer category before attaching rules.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Policy Code" required>
              <Input
                value={form.policyCode}
                onChange={(e) => setForm({ ...form, policyCode: e.target.value.toUpperCase() })}
                placeholder="HL_STD_MATRIX"
              />
            </Field>
            <Field label="Policy Name" required>
              <Input
                value={form.policyName}
                onChange={(e) => setForm({ ...form, policyName: e.target.value })}
                placeholder="Secured Home Loan — Standard Matrix"
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Policy purpose and scope..."
              />
            </Field>
            <Field label="Lender" required>
              <Select value={form.lenderId} onValueChange={(v) => setForm({ ...form, lenderId: v })}>
                <SelectTrigger><SelectValue placeholder="Select lender" /></SelectTrigger>
                <SelectContent>
                  {lenders.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Product" required>
              <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Customer Category">
              <Select
                value={form.customerCategoryId || "__none__"}
                onValueChange={(v) => setForm({ ...form, customerCategoryId: v === "__none__" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {CUSTOMER_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Input
                type="number"
                min={1}
                max={100}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              />
            </Field>
            <Field label="Approval Authority">
              <Input
                value={form.approvalAuthority}
                onChange={(e) => setForm({ ...form, approvalAuthority: e.target.value })}
              />
            </Field>
            <Field label="Effective From">
              <Input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
            </Field>
            <Field label="Effective To">
              <Input type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} />
            </Field>
          </CardContent>
        </Card>

        <Separator />

        <PolicyRuleSectionsPanel
          refs={ruleRefs}
          editable
          onRemove={handleRemoveRule}
          onAddToSection={(sectionId) => {
            setActiveSection(sectionId);
            setPickerOpen(true);
          }}
        />

        <PolicyValidationWarnings warnings={builderWarnings} />

        <PolicyRulePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          excludeRuleIds={ruleRefs.map((r) => r.ruleId)}
          onSelect={handleAttachRule}
        />

        <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 border-t border-border/60 bg-background/95 py-4 backdrop-blur">
          <Button onClick={handleSaveDraft} disabled={!form.policyCode || !form.policyName || !form.lenderId || !form.productId}>
            Save Draft
          </Button>
          {(savedPolicyId ?? initialPolicy?.policyId) && (
            <>
              <Button variant="outline" onClick={() => handleTransition("validated")}>Validate</Button>
              <Button variant="outline" onClick={() => handleTransition("testing")}>Test</Button>
              <Button variant="outline" onClick={() => handleTransition("approved")}>Approve</Button>
              <Button variant="default" onClick={() => handleTransition("published")}>Publish</Button>
            </>
          )}
        </div>
      </div>
    </CreditRiskEngineShell>
  );
}

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
