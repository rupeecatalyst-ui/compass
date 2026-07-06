"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  RULE_CATEGORY_LABELS,
  RULE_SCOPE_LABELS,
  RULE_TYPE_LABELS,
  formatRuleVersion,
} from "@/constants/rule-library";
import {
  RULE_OWNER_LABELS,
  RULE_REVIEW_STATUS_LABELS,
  computeReviewStatus,
} from "@/constants/rule-governance";
import { RULE_SEVERITY_LABELS } from "@/constants/rule-severity";
import { getLatestRuleVersions } from "@/lib/credit-risk-engine/rule-store";
import type { RuleLibraryVersion } from "@/types/rule-library";
import { RuleCategoryBadge, RuleStatusBadge, RuleTypeBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-category-badge";
import { RuleSeverityBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-severity-badge";
import { RuleReviewStatusBadge } from "@/components/catalyst-one/credit-risk-engine/rule-library/rule-review-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

interface PolicyRulePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeRuleIds?: string[];
  onSelect: (rule: RuleLibraryVersion) => void;
  title?: string;
}

const ALL = "__all__";

export function PolicyRulePicker({
  open,
  onOpenChange,
  excludeRuleIds = [],
  onSelect,
  title = "Select Rule from Library",
}: PolicyRulePickerProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [scopeFilter, setScopeFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [severityFilter, setSeverityFilter] = useState(ALL);
  const [ownerFilter, setOwnerFilter] = useState(ALL);
  const [reviewFilter, setReviewFilter] = useState(ALL);

  const rules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return getLatestRuleVersions().filter((rule) => {
      if (excludeRuleIds.includes(rule.ruleId)) return false;
      if (categoryFilter !== ALL && rule.categoryId !== categoryFilter) return false;
      if (scopeFilter !== ALL && rule.ruleScope !== scopeFilter) return false;
      if (typeFilter !== ALL && rule.ruleType !== typeFilter) return false;
      if (severityFilter !== ALL && rule.ruleSeverity !== severityFilter) return false;
      if (ownerFilter !== ALL && rule.ruleOwnerId !== ownerFilter) return false;
      const reviewStatus = computeReviewStatus(rule);
      if (reviewFilter !== ALL && reviewStatus !== reviewFilter) return false;
      if (!q) return true;
      return (
        rule.ruleCode.toLowerCase().includes(q) ||
        rule.ruleName.toLowerCase().includes(q) ||
        rule.description.toLowerCase().includes(q)
      );
    });
  }, [query, categoryFilter, scopeFilter, typeFilter, severityFilter, ownerFilter, reviewFilter, excludeRuleIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Search and filter Rule Library entries. Policies reference rules — never duplicate business logic.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-6 py-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rule name, code, description..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterSelect value={categoryFilter} onChange={setCategoryFilter} placeholder="Category">
              {Object.entries(RULE_CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={scopeFilter} onChange={setScopeFilter} placeholder="Scope">
              {Object.entries(RULE_SCOPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={typeFilter} onChange={setTypeFilter} placeholder="Type">
              {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={severityFilter} onChange={setSeverityFilter} placeholder="Severity">
              {Object.entries(RULE_SEVERITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={ownerFilter} onChange={setOwnerFilter} placeholder="Owner">
              {Object.entries(RULE_OWNER_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={reviewFilter} onChange={setReviewFilter} placeholder="Review Status">
              {Object.entries(RULE_REVIEW_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </FilterSelect>
          </div>
          <Card className="max-h-[50vh] overflow-auto border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                      No rules match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={rule.ruleId}>
                      <TableCell className="font-mono text-xs">{rule.ruleCode}</TableCell>
                      <TableCell className="max-w-[10rem] truncate text-xs font-medium">
                        {rule.ruleName}
                      </TableCell>
                      <TableCell>
                        <RuleCategoryBadge categoryId={rule.categoryId} />
                      </TableCell>
                      <TableCell>
                        <RuleTypeBadge ruleType={rule.ruleType} />
                      </TableCell>
                      <TableCell>
                        <RuleSeverityBadge severity={rule.ruleSeverity} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatRuleVersion(rule.majorVersion, rule.minorVersion)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <RuleStatusBadge status={rule.status} />
                          <RuleReviewStatusBadge status={computeReviewStatus(rule)} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            onSelect(rule);
                            onOpenChange(false);
                          }}
                        >
                          Attach
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
          <p className="text-xs text-muted-foreground">{rules.length} rule(s) available</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[130px] text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {placeholder}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}
