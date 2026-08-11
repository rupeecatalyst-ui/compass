"use client";

/**
 * CO-WP-003 — Interactive Wealth Partner Business Network (Network tab).
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Network,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WEALTH_PARTNER_NETWORK_PERIOD_OPTIONS,
} from "@/constants/enterprise-wealth-partner-registry";
import { wealthPartnerApiClient } from "@/lib/enterprise-wealth-partner-registry";
import { cn } from "@/lib/utils";
import type {
  WealthPartnerNetworkIntelligenceBundle,
  WealthPartnerNetworkIntelligenceFilters,
  WealthPartnerNetworkNodeHealth,
  WealthPartnerNetworkTreeNode,
  WealthPartnerNetworkPeriodPreset,
} from "@/types/enterprise-wealth-partner-registry";

function formatInr(n: number): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n);
  }
}

function formatActivity(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function healthDot(health: WealthPartnerNetworkNodeHealth) {
  return cn(
    "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
    health === "active" && "bg-emerald-500",
    health === "needs_attention" && "bg-amber-400",
    health === "inactive" && "bg-rose-500",
  );
}

function healthLabel(health: WealthPartnerNetworkNodeHealth) {
  if (health === "active") return "Active";
  if (health === "needs_attention") return "Needs Attention";
  return "Inactive";
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function NetworkTreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onOpen,
}: {
  node: WealthPartnerNetworkTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (node: WealthPartnerNetworkTreeNode) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const m = node.rolled;

  return (
    <div className="relative">
      {depth > 0 ? (
        <div
          className="pointer-events-none absolute left-[-12px] top-0 h-full w-px bg-border"
          aria-hidden
        />
      ) : null}
      <div
        className={cn(
          "group mb-2 rounded-xl border bg-card/80 shadow-sm transition-colors",
          "hover:border-primary/40 hover:bg-accent/30",
          depth === 0 && "border-primary/30 bg-primary/5",
        )}
        style={{ marginLeft: depth === 0 ? 0 : Math.min(depth, 8) * 18 }}
      >
        <div className="flex items-start gap-2 p-3">
          <button
            type="button"
            className={cn(
              "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground",
              !hasChildren && "invisible",
            )}
            aria-label={isOpen ? "Collapse" : "Expand"}
            onClick={() => onToggle(node.id)}
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => onOpen(node)}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={healthDot(node.health)} title={healthLabel(node.health)} />
              <span className="text-sm font-semibold text-foreground">{node.name}</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {node.partnerTypeLabel}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {node.relationshipLabel}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  node.health === "active" && "text-emerald-700",
                  node.health === "needs_attention" && "text-amber-700",
                  node.health === "inactive" && "text-rose-700",
                )}
              >
                {healthLabel(node.health)}
              </span>
            </div>

            <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Business Volume"
                value={formatInr(m.businessVolume)}
              />
              <Metric
                label="Opportunities"
                value={String(m.opportunitiesGenerated)}
              />
              <Metric label="Deals Converted" value={String(m.dealsConverted)} />
              <Metric label="Conversion" value={`${m.conversionRatio}%`} />
              <Metric
                label="Last Activity"
                value={formatActivity(m.lastActivityAt)}
              />
              {hasChildren ? (
                <Metric
                  label="Direct members"
                  value={String(node.children.length)}
                />
              ) : null}
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              Click to open workspace · Values include descendants beneath this node
            </p>
          </button>
        </div>
      </div>

      {hasChildren && isOpen
        ? node.children.map((child) => (
            <NetworkTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onOpen={onOpen}
            />
          ))
        : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function collectExpandableIds(node: WealthPartnerNetworkTreeNode, into: Set<string>) {
  if (node.children.length) {
    into.add(node.id);
    for (const c of node.children) collectExpandableIds(c, into);
  }
}

interface WealthPartnerNetworkIntelligenceProps {
  partnerId: string;
  refreshToken?: number;
}

export function WealthPartnerNetworkIntelligence({
  partnerId,
  refreshToken = 0,
}: WealthPartnerNetworkIntelligenceProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<WealthPartnerNetworkIntelligenceBundle | null>(
    null,
  );
  const [filters, setFilters] = useState<WealthPartnerNetworkIntelligenceFilters>({
    period: "all",
    productCode: "all",
    branchId: "all",
    region: "all",
    partnerType: "all",
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await wealthPartnerApiClient.getNetworkIntelligence(partnerId, filters);
      setBundle(data);
      const next = new Set<string>();
      next.add(data.tree.id);
      for (const child of data.tree.children) {
        if (child.children.length) next.add(child.id);
      }
      setExpanded(next);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load Business Network",
      );
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [partnerId, filters]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  function patchFilter(patch: Partial<WealthPartnerNetworkIntelligenceFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    if (!bundle) return;
    const next = new Set<string>();
    collectExpandableIds(bundle.tree, next);
    setExpanded(next);
  }

  function collapseAll() {
    if (!bundle) return;
    setExpanded(new Set([bundle.tree.id]));
  }

  function openNode(node: WealthPartnerNetworkTreeNode) {
    if (!node.href) {
      toast.message("No workspace link for this node.");
      return;
    }
    router.push(node.href);
  }

  const period = (filters.period ?? "all") as WealthPartnerNetworkPeriodPreset;
  const options = bundle?.filterOptions;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Business Network</p>
            <p className="text-[11px] text-muted-foreground">
              Interactive ecosystem over Contact / Company relationships — expand, filter, navigate.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={expandAll}>
            Expand all
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={collapseAll}>
            Collapse
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {bundle ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <SummaryCard
            title="Total Network Members"
            value={String(bundle.summary.totalNetworkMembers)}
          />
          <SummaryCard
            title="Active Members"
            value={String(bundle.summary.activeMembers)}
          />
          <SummaryCard
            title="Business Generated"
            value={formatInr(bundle.summary.businessGenerated)}
          />
          <SummaryCard
            title="Opportunities"
            value={String(bundle.summary.opportunities)}
          />
          <SummaryCard title="Deals" value={String(bundle.summary.deals)} />
          <SummaryCard
            title="Conversion Ratio"
            value={`${bundle.summary.conversionRatio}%`}
          />
          <SummaryCard
            title="Commission Payable"
            value={formatInr(bundle.summary.commissionPayable)}
          />
        </div>
      ) : null}

      <div className="grid gap-3 rounded-xl border bg-muted/20 p-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <FilterSelect
          label="Period"
          value={period}
          onChange={(v) => {
            const next = v as WealthPartnerNetworkPeriodPreset;
            const periodKey =
              next === "month"
                ? options?.months[0]?.value
                : next === "quarter"
                  ? options?.quarters[0]?.value
                  : next === "financial_year"
                    ? options?.financialYears[0]?.value
                    : undefined;
            patchFilter({ period: next, periodKey });
          }}
          items={WEALTH_PARTNER_NETWORK_PERIOD_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        {period === "month" ? (
          <FilterSelect
            label="Month"
            value={filters.periodKey ?? options?.months[0]?.value ?? ""}
            onChange={(v) => patchFilter({ periodKey: v })}
            items={(options?.months ?? []).map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        ) : null}
        {period === "quarter" ? (
          <FilterSelect
            label="Quarter"
            value={filters.periodKey ?? options?.quarters[0]?.value ?? ""}
            onChange={(v) => patchFilter({ periodKey: v })}
            items={(options?.quarters ?? []).map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        ) : null}
        {period === "financial_year" ? (
          <FilterSelect
            label="Financial Year"
            value={filters.periodKey ?? options?.financialYears[0]?.value ?? ""}
            onChange={(v) => patchFilter({ periodKey: v })}
            items={(options?.financialYears ?? []).map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        ) : null}
        <FilterSelect
          label="Product"
          value={String(filters.productCode ?? "all")}
          onChange={(v) => patchFilter({ productCode: v })}
          items={[
            { value: "all", label: "All products" },
            ...(options?.products ?? []).map((o) => ({
              value: o.value,
              label: o.label,
            })),
          ]}
        />
        <FilterSelect
          label="Branch"
          value={String(filters.branchId ?? "all")}
          onChange={(v) => patchFilter({ branchId: v })}
          items={[
            { value: "all", label: "All branches" },
            ...(options?.branches ?? []).map((o) => ({
              value: o.value,
              label: o.label,
            })),
          ]}
        />
        <FilterSelect
          label="Region"
          value={String(filters.region ?? "all")}
          onChange={(v) => patchFilter({ region: v })}
          items={[
            { value: "all", label: "All regions" },
            ...(options?.regions ?? []).map((o) => ({
              value: o.value,
              label: o.label,
            })),
          ]}
        />
        <FilterSelect
          label="Wealth Partner Type"
          value={String(filters.partnerType ?? "all")}
          onChange={(v) => patchFilter({ partnerType: v })}
          items={[
            { value: "all", label: "All types" },
            ...(options?.partnerTypes ?? []).map((o) => ({
              value: o.value,
              label: o.label,
            })),
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className={healthDot("active")} /> Active
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={healthDot("needs_attention")} /> Needs Attention
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={healthDot("inactive")} /> Inactive
        </span>
      </div>

      {loading && !bundle ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Building Business Network…
        </div>
      ) : bundle ? (
      <div className="rounded-xl border bg-gradient-to-b from-muted/30 to-background p-4 overflow-visible">
          <NetworkTreeNode
            node={bundle.tree}
            depth={0}
            expanded={expanded}
            onToggle={toggle}
            onOpen={openNode}
          />
          {bundle.tree.children.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No network members yet. Add relationships below to grow the Business Network.
            </p>
          ) : null}
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            {bundle.definition}
          </p>
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Business Network unavailable.
        </p>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: Array<{ value: string; label: string }>;
}) {
  const safeValue = items.some((i) => i.value === value)
    ? value
    : items[0]?.value ?? "all";
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Select value={safeValue} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
