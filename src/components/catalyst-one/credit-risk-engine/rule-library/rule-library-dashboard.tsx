"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { RULE_CATEGORY_LABELS } from "@/constants/rule-library";
import { getRuleCategories, getRuleReviewNotifications, searchRules } from "@/lib/credit-risk-engine/rule-store";
import type { RuleCategoryId } from "@/types/rule-library";
import { CreditRiskEngineShell } from "@/components/catalyst-one/credit-risk-engine/credit-risk-engine-shell";
import { RuleLibraryKpiGrid } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-library-kpi-grid";
import { RuleInheritancePanel } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-inheritance-panel";
import { RuleTable } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-table";
import { WORKSPACE_CLOSE } from "@/constants/workspace-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RuleLibraryDashboard() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<RuleCategoryId | "all">("all");
  const categories = getRuleCategories();
  const notifications = getRuleReviewNotifications();

  const rules = useMemo(() => {
    const cat = categoryFilter === "all" ? undefined : categoryFilter;
    return searchRules(query, cat);
  }, [query, categoryFilter]);

  return (
    <CreditRiskEngineShell
      workspaceName="Rule Library"
      closeTo={WORKSPACE_CLOSE.CREDIT_RISK_ENGINE}
      title="Rule Library"
      description="Parent repository for all reusable lending rules — policies reference rules from here."
      showSearch
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search rule code, name, category..."
      actions={
        <Button size="sm" className="h-8 text-xs" asChild>
          <Link href={ROUTES.ADMIN_CREDIT_RISK_RULE_BUILDER}>
            <Plus className="h-3.5 w-3.5" />
            New Rule
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <RuleLibraryKpiGrid />

        {notifications.length > 0 && (
          <Card className="glass-card border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Governance Notifications</CardTitle>
              <p className="text-xs text-muted-foreground">
                Due in 2 days — notify Rule Owner and Super Administrator (foundation only).
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.map((n) => (
                <p key={n.id} className="text-sm">
                  {n.message}
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        <RuleInheritancePanel />

        <div className="flex flex-wrap gap-2">
          <CategoryChip
            active={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
            label="All Categories"
          />
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              active={categoryFilter === cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              label={RULE_CATEGORY_LABELS[cat.id]}
            />
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {rules.length} rule{rules.length === 1 ? "" : "s"} · Policies must reference rules — no duplicated logic
          </p>
          <RuleTable rules={rules} />
        </div>
      </div>
    </CreditRiskEngineShell>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40",
      )}
    >
      {label}
    </button>
  );
}
