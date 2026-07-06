"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  POLICY_RULE_SECTION_LABELS,
  POLICY_RULE_SECTION_ORDER,
} from "@/constants/policy-rule-sections";
import { formatRuleVersion } from "@/constants/rule-library";
import type { PolicyRuleReference } from "@/types/credit-risk-engine";
import { RuleCategoryBadge, RuleStatusBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-category-badge";
import { RuleSeverityBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-severity-badge";
import { getRuleById } from "@/lib/credit-risk-engine/rule-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PolicyRuleSectionsPanelProps {
  refs: PolicyRuleReference[];
  editable?: boolean;
  onRemove?: (ruleId: string) => void;
  onAddToSection?: (sectionId: PolicyRuleReference["sectionId"]) => void;
}

export function PolicyRuleSectionsPanel({
  refs,
  editable,
  onRemove,
  onAddToSection,
}: PolicyRuleSectionsPanelProps) {
  const grouped = POLICY_RULE_SECTION_ORDER.map((sectionId) => ({
    sectionId,
    label: POLICY_RULE_SECTION_LABELS[sectionId],
    rules: refs.filter((r) => r.sectionId === sectionId),
  }));

  return (
    <div className="space-y-4">
      {grouped.map(({ sectionId, label, rules }) => (
        <Card key={sectionId} className="glass-card border-border/60">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription>
                {rules.length} rule{rules.length === 1 ? "" : "s"} attached — references only, no duplicated logic.
              </CardDescription>
            </div>
            {editable && onAddToSection && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={() => onAddToSection(sectionId)}
              >
                <Plus className="h-3 w-3" />
                Attach Rule
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rules in this section.</p>
            ) : (
              <ul className="space-y-2">
                {rules.map((ref) => {
                  const rule = getRuleById(ref.ruleId);
                  return (
                    <li
                      key={ref.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/10 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`${ROUTES.ADMIN_CREDIT_RISK_RULE_LIBRARY}/${ref.ruleId}`}
                            className="text-sm font-medium hover:text-primary"
                          >
                            {ref.ruleName}
                          </Link>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {ref.ruleCode}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {formatRuleVersion(ref.majorVersion, ref.minorVersion)}
                          </span>
                        </div>
                        {rule && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <RuleCategoryBadge categoryId={rule.categoryId} />
                            <RuleSeverityBadge severity={rule.ruleSeverity} />
                            <RuleStatusBadge status={rule.status} />
                          </div>
                        )}
                      </div>
                      {editable && onRemove && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-destructive"
                          onClick={() => onRemove(ref.ruleId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
