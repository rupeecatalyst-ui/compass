"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import {
  OPERATORS_BY_DATA_TYPE,
  RULE_CATEGORY_LABELS,
  RULE_DATA_TYPE_LABELS,
  RULE_INHERITANCE_LABELS,
  RULE_OPERATOR_LABELS,
  RULE_SCOPE_LABELS,
  RULE_TYPE_LABELS,
  inheritsFromScope,
} from "@/constants/rule-library";
import { RULE_SEVERITY_DEFINITIONS, RULE_SEVERITY_LABELS } from "@/constants/rule-severity";
import {
  computeReviewStatus,
  RULE_OWNER_LABELS,
  RULE_REVIEW_CYCLE_LABELS,
} from "@/constants/rule-governance";
import { PROPERTY_TYPES } from "@/constants/loan-stage-master";
import { getEnabledProducts } from "@/constants/product-master";
import { getOccupancyMaster } from "@/constants/occupancy-master";
import { getLatestRuleVersions, getRuleCategories, saveRuleDraft } from "@/lib/credit-risk-engine/rule-store";
import type {
  RuleCategoryId,
  RuleDataType,
  RuleInheritanceLevel,
  RuleLibraryVersion,
  RuleOperator,
  RuleOwnerId,
  RuleReviewCycleId,
  RuleScope,
  RuleSeverity,
  RuleType,
} from "@/types/rule-library";
import { CreditRiskEngineShell } from "@/components/catalyst-one/credit-risk-engine/credit-risk-engine-shell";
import { GovernanceMasterSelect } from "@/components/catalyst-one/credit-risk-engine/rule-library/governance-master-select";
import { RuleReviewStatusBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-review-status-badge";
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

const CUSTOMER_CATEGORIES = ["Salaried", "Self Employed", "Professional", "Pensioner", "NRI"];

interface RuleBuilderFormProps {
  initialRule?: RuleLibraryVersion;
}

export function RuleBuilderForm({ initialRule }: RuleBuilderFormProps) {
  const router = useRouter();
  const categories = getRuleCategories();
  const products = getEnabledProducts().map((p) => p.name);
  const occupancyOptions = getOccupancyMaster().map((o) => o.label);
  const availableRules = getLatestRuleVersions().filter((r) => r.ruleId !== initialRule?.ruleId);

  const [form, setForm] = useState({
    ruleCode: initialRule?.ruleCode ?? "",
    ruleName: initialRule?.ruleName ?? "",
    description: initialRule?.description ?? "",
    ruleScope: (initialRule?.ruleScope ?? "financial") as RuleScope,
    ruleType: (initialRule?.ruleType ?? "validation") as RuleType,
    ruleSeverity: (initialRule?.ruleSeverity ?? "medium") as RuleSeverity,
    severityChangeReason: "",
    inheritanceLevel: (initialRule?.inheritanceLevel ?? inheritsFromScope("financial")) as RuleInheritanceLevel,
    categoryId: (initialRule?.categoryId ?? "financial") as RuleCategoryId,
    subCategory: initialRule?.subCategory ?? "",
    dataType: (initialRule?.dataType ?? "number") as RuleDataType,
    operator: (initialRule?.operator ?? "less_than_or_equal") as RuleOperator,
    value: initialRule?.value ?? "",
    dependsOnRuleIds: initialRule?.dependsOnRuleIds ?? [] as string[],
    applicableProducts: initialRule?.applicableProducts ?? [],
    applicableCustomerCategories: initialRule?.applicableCustomerCategories ?? [],
    applicablePropertyTypes: initialRule?.applicablePropertyTypes ?? [],
    applicableOccupancy: initialRule?.applicableOccupancy ?? [],
    effectiveFrom: initialRule?.effectiveFrom ?? "",
    effectiveTo: initialRule?.effectiveTo ?? "",
    createdBy: initialRule?.createdBy ?? "Policy Admin",
    businessImpact: initialRule?.businessImpact ?? "",
    affectedSystems: initialRule?.affectedSystems ?? [] as string[],
    ruleOwnerId: (initialRule?.ruleOwnerId ?? "risk_team") as RuleOwnerId,
    reviewCycleId: (initialRule?.reviewCycleId ?? "quarterly") as RuleReviewCycleId,
    nextReviewDate: initialRule?.nextReviewDate ?? "",
    lastReviewedOn: initialRule?.lastReviewedOn ?? "",
    lastReviewedBy: initialRule?.lastReviewedBy ?? "",
    businessJustification: initialRule?.businessJustification ?? "",
    approvalAuthority: initialRule?.approvalAuthority ?? "Chief Risk Officer",
  });

  const operators = OPERATORS_BY_DATA_TYPE[form.dataType] ?? [];
  const computedReviewStatus = computeReviewStatus({
    nextReviewDate: form.nextReviewDate || new Date().toISOString().slice(0, 10),
    lastReviewedOn: form.lastReviewedOn || undefined,
  });

  const patch = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  const toggleArrayItem = (key: keyof typeof form, item: string) => {
    const arr = form[key] as string[];
    patch({
      [key]: arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item],
    } as Partial<typeof form>);
  };

  const handleSave = () => {
    const saved = saveRuleDraft({
      ruleId: initialRule?.ruleId,
      ruleCode: form.ruleCode,
      ruleName: form.ruleName,
      description: form.description,
      ruleScope: form.ruleScope,
      ruleType: form.ruleType,
      ruleSeverity: form.ruleSeverity,
      severityChangeReason: form.severityChangeReason || undefined,
      inheritanceLevel: form.inheritanceLevel,
      categoryId: form.categoryId,
      subCategory: form.subCategory,
      dataType: form.dataType,
      operator: form.operator,
      value: form.value,
      dependsOnRuleIds: form.dependsOnRuleIds,
      applicableProducts: form.applicableProducts,
      applicableCustomerCategories: form.applicableCustomerCategories,
      applicablePropertyTypes: form.applicablePropertyTypes,
      applicableOccupancy: form.applicableOccupancy,
      effectiveFrom: form.effectiveFrom || undefined,
      effectiveTo: form.effectiveTo || undefined,
      createdBy: form.createdBy,
      status: "draft",
      businessImpact: form.businessImpact,
      affectedSystems: form.affectedSystems,
      ruleOwnerId: form.ruleOwnerId,
      reviewCycleId: form.reviewCycleId,
      nextReviewDate: form.nextReviewDate,
      lastReviewedOn: form.lastReviewedOn || undefined,
      lastReviewedBy: form.lastReviewedBy || undefined,
      businessJustification: form.businessJustification,
      approvalAuthority: form.approvalAuthority,
    });
    router.push(`${ROUTES.ADMIN_CREDIT_RISK_RULE_LIBRARY}/${saved.ruleId}`);
  };

  return (
    <CreditRiskEngineShell
      title={initialRule ? "Edit Rule" : "Rule Builder"}
      description="Create reusable lending rules — policies reference rules from this library."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link href={ROUTES.ADMIN_CREDIT_RISK_RULE_LIBRARY}>Cancel</Link>
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleSave}
            disabled={!form.nextReviewDate.trim()}
            title={!form.nextReviewDate.trim() ? "Next Review Date is mandatory" : undefined}
          >
            Save Draft
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Rule Identity</CardTitle>
            <CardDescription>Core identification and classification fields.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Rule Code *">
              <Input
                className="h-8 font-mono text-xs"
                value={form.ruleCode}
                onChange={(e) => patch({ ruleCode: e.target.value.toUpperCase() })}
                placeholder="e.g. FIN_FOIR_MAX"
              />
            </Field>
            <Field label="Rule Name *">
              <Input
                className="h-8 text-xs"
                value={form.ruleName}
                onChange={(e) => patch({ ruleName: e.target.value })}
              />
            </Field>
            <Field label="Rule Scope *">
              <Select
                value={form.ruleScope}
                onValueChange={(v) => {
                  const scope = v as RuleScope;
                  patch({ ruleScope: scope, inheritanceLevel: inheritsFromScope(scope) });
                }}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RULE_SCOPE_LABELS) as RuleScope[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">{RULE_SCOPE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Rule Type *">
              <Select value={form.ruleType} onValueChange={(v) => patch({ ruleType: v as RuleType })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RULE_TYPE_LABELS) as RuleType[]).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{RULE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Rule Severity *" className="sm:col-span-2">
              <Select value={form.ruleSeverity} onValueChange={(v) => patch({ ruleSeverity: v as RuleSeverity })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RULE_SEVERITY_LABELS) as RuleSeverity[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {RULE_SEVERITY_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {RULE_SEVERITY_DEFINITIONS[form.ruleSeverity]}
              </p>
            </Field>
            {initialRule && form.ruleSeverity !== initialRule.ruleSeverity && (
              <Field label="Severity Change Reason" className="sm:col-span-2">
                <Input
                  className="h-8 text-xs"
                  value={form.severityChangeReason}
                  onChange={(e) => patch({ severityChangeReason: e.target.value })}
                  placeholder="Required for audit when changing severity"
                />
              </Field>
            )}
            <Field label="Inheritance Level">
              <Select
                value={form.inheritanceLevel}
                onValueChange={(v) => patch({ inheritanceLevel: v as RuleInheritanceLevel })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RULE_INHERITANCE_LABELS) as RuleInheritanceLevel[]).map((l) => (
                    <SelectItem key={l} value={l} className="text-xs">{RULE_INHERITANCE_LABELS[l]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category *" className="sm:col-span-2">
              <Select value={form.categoryId} onValueChange={(v) => patch({ categoryId: v as RuleCategoryId })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {RULE_CATEGORY_LABELS[c.id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sub Category">
              <Input
                className="h-8 text-xs"
                value={form.subCategory}
                onChange={(e) => patch({ subCategory: e.target.value })}
                placeholder="e.g. FOIR, LTV, CIBIL"
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Rule Logic</CardTitle>
            <CardDescription>Data type, operator and threshold value.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Data Type *">
              <Select
                value={form.dataType}
                onValueChange={(v) => {
                  const dt = v as RuleDataType;
                  const ops = OPERATORS_BY_DATA_TYPE[dt];
                  patch({ dataType: dt, operator: ops[0] ?? "equals" });
                }}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RULE_DATA_TYPE_LABELS) as RuleDataType[]).map((dt) => (
                    <SelectItem key={dt} value={dt} className="text-xs">
                      {RULE_DATA_TYPE_LABELS[dt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Operator *">
              <Select value={form.operator} onValueChange={(v) => patch({ operator: v as RuleOperator })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op} value={op} className="text-xs">
                      {RULE_OPERATOR_LABELS[op]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Value *">
              <Input
                className="h-8 font-mono text-xs"
                value={form.value}
                onChange={(e) => patch({ value: e.target.value })}
                placeholder={form.operator === "between" ? "min,max" : form.dataType === "enum" ? "A,B,C" : "threshold"}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Rule Dependencies</CardTitle>
            <CardDescription>Upstream rules this rule depends on — composition mapping for impact analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChipSelector
              label="Depends On Rules"
              options={availableRules.map((r) => r.ruleId)}
              optionLabels={Object.fromEntries(availableRules.map((r) => [r.ruleId, `${r.ruleName} (${r.ruleCode})`]))}
              selected={form.dependsOnRuleIds}
              onToggle={(id) => toggleArrayItem("dependsOnRuleIds", id)}
            />
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Applicability</CardTitle>
            <CardDescription>Products, customer segments and property dimensions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChipSelector label="Applicable Products" options={products} selected={form.applicableProducts} onToggle={(v) => toggleArrayItem("applicableProducts", v)} />
            <Separator />
            <ChipSelector label="Applicable Customer Categories" options={CUSTOMER_CATEGORIES} selected={form.applicableCustomerCategories} onToggle={(v) => toggleArrayItem("applicableCustomerCategories", v)} />
            <Separator />
            <ChipSelector label="Applicable Property Types" options={[...PROPERTY_TYPES]} selected={form.applicablePropertyTypes} onToggle={(v) => toggleArrayItem("applicablePropertyTypes", v)} />
            <Separator />
            <ChipSelector label="Applicable Occupancy" options={occupancyOptions} selected={form.applicableOccupancy} onToggle={(v) => toggleArrayItem("applicableOccupancy", v)} />
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Governance</CardTitle>
            <CardDescription>Rule owner, review cycle and mandatory next review date.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Business Impact">
              <Input className="h-8 text-xs" value={form.businessImpact} onChange={(e) => patch({ businessImpact: e.target.value })} />
            </Field>
            <Field label="Rule Owner *">
              <GovernanceMasterSelect
                value={form.ruleOwnerId}
                options={RULE_OWNER_LABELS}
                onChange={(v) => patch({ ruleOwnerId: v })}
                placeholder="Select owner"
                searchPlaceholder="Search owners…"
              />
            </Field>
            <Field label="Review Cycle *">
              <GovernanceMasterSelect
                value={form.reviewCycleId}
                options={RULE_REVIEW_CYCLE_LABELS}
                onChange={(v) => patch({ reviewCycleId: v })}
                placeholder="Select cycle"
                searchPlaceholder="Search cycles…"
              />
            </Field>
            <Field label="Next Review Date *">
              <Input type="date" className="h-8 text-xs" value={form.nextReviewDate} onChange={(e) => patch({ nextReviewDate: e.target.value })} />
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Governance reminder only — rules never auto-expire.
              </p>
            </Field>
            <Field label="Review Status">
              <div className="flex h-8 items-center">
                <RuleReviewStatusBadge status={computedReviewStatus} />
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">Computed — not stored.</p>
            </Field>
            <Field label="Last Reviewed On">
              <Input type="date" className="h-8 text-xs" value={form.lastReviewedOn} onChange={(e) => patch({ lastReviewedOn: e.target.value })} />
            </Field>
            <Field label="Last Reviewed By">
              <Input className="h-8 text-xs" value={form.lastReviewedBy} onChange={(e) => patch({ lastReviewedBy: e.target.value })} placeholder="e.g. Risk Team Lead" />
            </Field>
            <Field label="Approval Authority" className="sm:col-span-2">
              <Input className="h-8 text-xs" value={form.approvalAuthority} onChange={(e) => patch({ approvalAuthority: e.target.value })} />
            </Field>
            <Field label="Business Justification" className="sm:col-span-2">
              <textarea
                className="flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                value={form.businessJustification}
                onChange={(e) => patch({ businessJustification: e.target.value })}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Effective Dates</CardTitle>
            <CardDescription>Version will be assigned on save. Published versions are immutable.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Effective From">
              <Input type="date" className="h-8 text-xs" value={form.effectiveFrom} onChange={(e) => patch({ effectiveFrom: e.target.value })} />
            </Field>
            <Field label="Effective To">
              <Input type="date" className="h-8 text-xs" value={form.effectiveTo} onChange={(e) => patch({ effectiveTo: e.target.value })} />
            </Field>
          </CardContent>
        </Card>
      </div>
    </CreditRiskEngineShell>
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
    <div className={className}>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ChipSelector({
  label,
  options,
  selected,
  onToggle,
  optionLabels,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  optionLabels?: Record<string, string>;
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          const display = optionLabels?.[opt] ?? opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:bg-muted/30"
              }`}
            >
              {display}
            </button>
          );
        })}
      </div>
    </div>
  );
}
