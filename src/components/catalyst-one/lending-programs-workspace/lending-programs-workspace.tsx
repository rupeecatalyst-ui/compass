"use client";

/**
 * CO-LW-001 — Enterprise Lending Programs Workspace (Phase 1).
 * CO-LW-003 — UX optimisation only (density, Product View ops desk, scroll).
 * CO-LW-004 — Executive Operations Dashboard UX: KPI strip + visual analytics
 * (LpKpiStrip / LpDashboardCharts), Product Family navigation, and CHANAKYA
 * Insights moved to an on-demand drawer (no permanent right rail).
 * Orchestration only — consumes existing SSOTs. No new registry.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Package,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { buildElwWorkspaceHref } from "@/constants/enterprise-lender-workspace";
import {
  LENDING_PROGRAMS_ACTIVE_DAYS,
  LENDING_PROGRAMS_WORKSPACE_TITLE,
} from "@/constants/lending-programs-workspace";
import { ROUTES } from "@/constants/routes";
import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import {
  buildLpProductFamilies,
  deriveApprovalRejection,
  deriveAverageTatDays,
  deriveBusinessFitFromProgram,
  deriveCityDistribution,
  deriveMonthlyDisbursalTrend,
  derivePipelineFunnel,
  deriveProductMixFromPrograms,
  deriveProgrammeCoverage,
  deriveRelationshipSignals,
  deriveStageDistribution,
  filterLenders,
  formatLpDays,
  formatLpMonths,
  formatLpPercent,
  formatLpValue,
  lenderDisplayName,
  lendersSupportingProduct,
  listActiveLenders,
  listRelationshipTeamForLender,
  loadDealActivityByLender,
  loadLendingProgramsSnapshot,
  loadLivePipelineForLender,
  loadLivePipelineForProduct,
  programsForLender,
  programsForProduct,
} from "@/lib/lending-programs-workspace";
import { lenderRegistryClient } from "@/lib/enterprise-lender-registry";
import { ensureEnterpriseRegistryHydrated } from "@/lib/enterprise-registry/hydrate";
import { listConversationActivities } from "@/lib/enterprise-conversation-intelligence";
import { listEdcTimelineByContext } from "@/lib/enterprise-dialogue-center";
import type {
  LendingProgramsLivePipeline,
  LendingProgramsSnapshot,
  LendingProgramsTeamMember,
  LendingProgramsView,
} from "@/types/lending-programs-workspace";
import { LENDING_PROGRAMS_NOT_SPECIFIED } from "@/types/lending-programs-workspace";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LpDashboardCharts, LpKpiStrip } from "./lp-dashboard-charts";
import { ChanakyaInsightsDrawer } from "./chanakya-insights-drawer";

function Section({
  title,
  children,
  className,
  compact,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-md border border-border/80 bg-card",
        compact ? "px-2 py-1.5" : "px-2.5 py-2",
        className,
      )}
    >
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] leading-snug text-muted-foreground">{children}</p>;
}

function FitBadge({ supported }: { supported: boolean | null }) {
  if (supported === true) {
    return (
      <Badge variant="outline" className="border-emerald-600/40 text-emerald-700 text-[10px]">
        Yes
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] text-muted-foreground">
      {LENDING_PROGRAMS_NOT_SPECIFIED}
    </Badge>
  );
}

type LivePanels = {
  pipeline: LendingProgramsLivePipeline | null;
  team: LendingProgramsTeamMember[];
  activities: Array<{ id: string; title: string; at: string }>;
  timeline: Array<{ id: string; title: string; at: string }>;
  documents: Array<{ id: string; title: string; kind?: string }>;
};

async function loadLenderLivePanels(lenderId: string): Promise<LivePanels> {
  const [pipe, contacts, docs] = await Promise.all([
    loadLivePipelineForLender(lenderId),
    lenderRegistryClient.listContacts(lenderId).catch(() => []),
    lenderRegistryClient.listDocuments(lenderId).catch(() => []),
  ]);
  const members = listRelationshipTeamForLender(lenderId, contacts);
  const documents = docs
    .filter((d) => !d.isDeleted)
    .map((d) => ({ id: d.id, title: d.title, kind: d.kind }));

  const actRows: Array<{ id: string; title: string; at: string }> = [];
  try {
    const all = listConversationActivities();
    for (const m of members.slice(0, 8)) {
      for (const a of all) {
        if (a.contactId === m.id || (a.contextType === "contact" && a.contextId === m.id)) {
          actRows.push({
            id: a.id,
            title: a.title || a.bodyText || "Activity",
            at: a.recordedAt || a.createdAt || "",
          });
        }
      }
    }
  } catch {
    /* ignore */
  }

  let timeline: Array<{ id: string; title: string; at: string }> = [];
  try {
    const edcRows: Array<{ id: string; title: string; at: string }> = [];
    for (const m of members.slice(0, 6)) {
      const edc = listEdcTimelineByContext("contact", m.id).slice(0, 4);
      for (const e of edc) {
        edcRows.push({
          id: e.id,
          title: e.title || e.description || e.eventType || "Event",
          at: e.occurredOn || "",
        });
      }
    }
    timeline = edcRows.slice(0, 10);
  } catch {
    timeline = [];
  }

  return {
    pipeline: pipe,
    team: members,
    activities: actRows.slice(0, 10),
    timeline,
    documents,
  };
}

export function LendingProgramsWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialView =
    searchParams.get("view") === "product" ? "product" : ("lender" as LendingProgramsView);
  const [view, setView] = useState<LendingProgramsView>(initialView);
  const [snapshot, setSnapshot] = useState<LendingProgramsSnapshot | null>(null);
  const [dealActivity, setDealActivity] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chanakyaOpen, setChanakyaOpen] = useState(false);

  const [lenderSearch, setLenderSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [selectedLenderId, setSelectedLenderId] = useState<string | null>(
    searchParams.get("lenderId"),
  );
  const [selectedProductCode, setSelectedProductCode] = useState<string | null>(
    searchParams.get("productId") || searchParams.get("productCode"),
  );
  const [expandedFamilyIds, setExpandedFamilyIds] = useState<Set<string>>(new Set());
  /** Product View — focus lender among eligible for team / deep pipeline. */
  const [productFocusLenderId, setProductFocusLenderId] = useState<string | null>(null);

  const [pipeline, setPipeline] = useState<LendingProgramsLivePipeline | null>(null);
  const [productPipeline, setProductPipeline] = useState<LendingProgramsLivePipeline | null>(
    null,
  );
  const [team, setTeam] = useState<LendingProgramsTeamMember[]>([]);
  const [productTeam, setProductTeam] = useState<LendingProgramsTeamMember[]>([]);
  const [activities, setActivities] = useState<
    Array<{ id: string; title: string; at: string }>
  >([]);
  const [productActivities, setProductActivities] = useState<
    Array<{ id: string; title: string; at: string }>
  >([]);
  const [timeline, setTimeline] = useState<Array<{ id: string; title: string; at: string }>>(
    [],
  );
  const [documents, setDocuments] = useState<
    Array<{ id: string; title: string; kind?: string }>
  >([]);

  const syncUrl = useCallback(
    (next: { view?: LendingProgramsView; lenderId?: string | null; productCode?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      const v = next.view ?? view;
      params.set("view", v);
      const lid = next.lenderId === undefined ? selectedLenderId : next.lenderId;
      const pc = next.productCode === undefined ? selectedProductCode : next.productCode;
      if (lid) params.set("lenderId", lid);
      else params.delete("lenderId");
      if (pc) params.set("productCode", pc);
      else params.delete("productCode");
      params.delete("productId");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams, selectedLenderId, selectedProductCode, view],
  );

  const reloadAll = useCallback(async (force = false) => {
    setRefreshing(true);
    try {
      await ensureEnterpriseRegistryHydrated(force).catch(() => undefined);
      const [snap, activity] = await Promise.all([
        loadLendingProgramsSnapshot({ force }),
        loadDealActivityByLender(),
      ]);
      setSnapshot(snap);
      setDealActivity(activity);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load Lending Programs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void reloadAll(false);
  }, [reloadAll]);

  // Lender View live panels
  useEffect(() => {
    if (!selectedLenderId || !snapshot || view !== "lender") {
      if (view === "lender") {
        setPipeline(null);
        setTeam([]);
        setActivities([]);
        setTimeline([]);
        setDocuments([]);
      }
      return;
    }
    let cancelled = false;
    void (async () => {
      const panels = await loadLenderLivePanels(selectedLenderId);
      if (cancelled) return;
      setPipeline(panels.pipeline);
      setTeam(panels.team);
      setActivities(panels.activities);
      setTimeline(panels.timeline);
      setDocuments(panels.documents);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedLenderId, snapshot, view]);

  // Product View — product-scoped pipeline + focus-lender team
  useEffect(() => {
    if (!selectedProductCode || !snapshot || view !== "product") {
      if (view === "product") {
        setProductPipeline(null);
        setProductTeam([]);
        setProductActivities([]);
      }
      return;
    }
    let cancelled = false;
    const product = snapshot.products.find((p) => p.code === selectedProductCode);
    void (async () => {
      const pipe = await loadLivePipelineForProduct(
        selectedProductCode,
        product?.label ?? null,
      );
      if (cancelled) return;
      setProductPipeline(pipe);

      if (productFocusLenderId) {
        const panels = await loadLenderLivePanels(productFocusLenderId);
        if (cancelled) return;
        setProductTeam(panels.team);
        setProductActivities(panels.activities);
      } else {
        setProductTeam([]);
        setProductActivities([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProductCode, productFocusLenderId, snapshot, view]);

  const activeLenders = useMemo(() => {
    if (!snapshot) return [];
    return listActiveLenders(snapshot, dealActivity);
  }, [snapshot, dealActivity]);

  const filteredActive = useMemo(() => {
    if (!snapshot) return [];
    return filterLenders(activeLenders, {
      search: lenderSearch,
      productCode: productFilter === "all" ? "" : productFilter,
      region: regionFilter === "all" ? "" : regionFilter,
      snapshot,
    });
  }, [snapshot, activeLenders, lenderSearch, productFilter, regionFilter]);

  const searchableRemainder = useMemo(() => {
    if (!snapshot || !lenderSearch.trim()) return [];
    const activeIds = new Set(activeLenders.map((l) => l.id));
    const rest = snapshot.lenders.filter((l) => !activeIds.has(l.id));
    return filterLenders(rest, {
      search: lenderSearch,
      productCode: productFilter === "all" ? "" : productFilter,
      region: regionFilter === "all" ? "" : regionFilter,
      snapshot,
    }).slice(0, 40);
  }, [snapshot, activeLenders, lenderSearch, productFilter, regionFilter]);

  const selectedLender = useMemo(
    () => snapshot?.lenders.find((l) => l.id === selectedLenderId) ?? null,
    [snapshot, selectedLenderId],
  );

  const lenderPrograms = useMemo(() => {
    if (!snapshot || !selectedLenderId) return [];
    return programsForLender(snapshot, selectedLenderId);
  }, [snapshot, selectedLenderId]);

  const selectedProduct = useMemo(
    () => snapshot?.products.find((p) => p.code === selectedProductCode) ?? null,
    [snapshot, selectedProductCode],
  );

  const programmeCountsByProduct = useMemo(() => {
    if (!snapshot) return {};
    const map: Record<string, number> = {};
    for (const p of snapshot.publishedPrograms) {
      const code = p.productCode?.trim();
      if (!code) continue;
      map[code] = (map[code] ?? 0) + 1;
    }
    return map;
  }, [snapshot]);

  const productFamilies = useMemo(() => {
    if (!snapshot) return [];
    return buildLpProductFamilies(snapshot.products, programmeCountsByProduct);
  }, [snapshot, programmeCountsByProduct]);

  const familiesForDisplay = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return productFamilies;
    return productFamilies
      .map((f) => ({
        ...f,
        members: f.members.filter(
          (m) => m.label.toLowerCase().includes(q) || m.code.toLowerCase().includes(q),
        ),
      }))
      .filter((f) => f.members.length > 0);
  }, [productFamilies, productSearch]);

  const selectedFamily = useMemo(
    () =>
      productFamilies.find((f) => f.members.some((m) => m.code === selectedProductCode)) ??
      null,
    [productFamilies, selectedProductCode],
  );

  useEffect(() => {
    if (!selectedProductCode) return;
    const family = productFamilies.find((f) =>
      f.members.some((m) => m.code === selectedProductCode),
    );
    if (!family) return;
    setExpandedFamilyIds((prev) => {
      if (prev.has(family.id)) return prev;
      const next = new Set(prev);
      next.add(family.id);
      return next;
    });
  }, [selectedProductCode, productFamilies]);

  const toggleFamily = (id: string) => {
    setExpandedFamilyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const productPrograms = useMemo(() => {
    if (!snapshot || !selectedProductCode) return [];
    return programsForProduct(snapshot, selectedProductCode);
  }, [snapshot, selectedProductCode]);

  const productLenders = useMemo(() => {
    if (!snapshot || !selectedProductCode) return [];
    return lendersSupportingProduct(snapshot, selectedProductCode);
  }, [snapshot, selectedProductCode]);

  const primaryProgramForFit = productPrograms[0] ?? lenderPrograms[0] ?? null;
  const businessFit = useMemo(
    () => deriveBusinessFitFromProgram(primaryProgramForFit),
    [primaryProgramForFit],
  );

  // --- Lender View analytics (CO-LW-004) ---
  const lenderStageSlices = useMemo(() => deriveStageDistribution(pipeline), [pipeline]);
  const lenderFunnel = useMemo(() => derivePipelineFunnel(pipeline), [pipeline]);
  const lenderApproval = useMemo(() => deriveApprovalRejection(pipeline), [pipeline]);
  const lenderProductMix = useMemo(
    () => deriveProductMixFromPrograms(lenderPrograms),
    [lenderPrograms],
  );
  const lenderCoverage = useMemo(() => {
    if (!snapshot || !selectedLenderId) return [];
    return deriveProgrammeCoverage(snapshot, selectedLenderId);
  }, [snapshot, selectedLenderId]);
  const lenderCities = useMemo(() => {
    if (!snapshot || !selectedLenderId) return [];
    return deriveCityDistribution(snapshot, selectedLenderId);
  }, [snapshot, selectedLenderId]);
  const lenderTat = useMemo(() => deriveAverageTatDays(lenderPrograms), [lenderPrograms]);
  const lenderMonthlyTrend = useMemo(() => deriveMonthlyDisbursalTrend(pipeline), [pipeline]);
  const lenderRelationshipSignals = useMemo(
    () =>
      deriveRelationshipSignals({
        teamCount: team.length,
        dealCount: pipeline?.dealCount ?? 0,
        activityCount: activities.length,
        programmeCount: lenderPrograms.length,
      }),
    [team.length, pipeline, activities.length, lenderPrograms.length],
  );

  const lenderKpiItems = useMemo(
    () => [
      { label: "Programmes", value: lenderPrograms.length },
      { label: "Deals", value: pipeline?.dealCount ?? 0 },
      { label: "Opportunities", value: pipeline?.opportunityHints ?? 0 },
      { label: "Disbursed", value: pipeline?.disbursedCount ?? 0 },
      { label: "Team Contacts", value: team.length },
      {
        label: "Avg TAT",
        value: lenderTat != null ? `${lenderTat}d` : LENDING_PROGRAMS_NOT_SPECIFIED,
      },
    ],
    [lenderPrograms.length, pipeline, team.length, lenderTat],
  );

  // --- Product View analytics (CO-LW-004) ---
  const productStageSlices = useMemo(
    () => deriveStageDistribution(productPipeline),
    [productPipeline],
  );
  const productFunnel = useMemo(() => derivePipelineFunnel(productPipeline), [productPipeline]);
  const productApproval = useMemo(
    () => deriveApprovalRejection(productPipeline),
    [productPipeline],
  );
  const productProductMix = useMemo(
    () => deriveProductMixFromPrograms(productPrograms),
    [productPrograms],
  );
  const productCoverage = useMemo(() => {
    if (!snapshot) return [];
    return deriveProgrammeCoverage({ ...snapshot, publishedPrograms: productPrograms });
  }, [snapshot, productPrograms]);
  const productCities = useMemo(() => {
    if (!snapshot) return [];
    return deriveCityDistribution({ ...snapshot, lenders: productLenders });
  }, [snapshot, productLenders]);
  const productTat = useMemo(() => deriveAverageTatDays(productPrograms), [productPrograms]);
  const productMonthlyTrend = useMemo(
    () => deriveMonthlyDisbursalTrend(productPipeline),
    [productPipeline],
  );
  const productRelationshipSignals = useMemo(
    () =>
      deriveRelationshipSignals({
        teamCount: productTeam.length,
        dealCount: productPipeline?.dealCount ?? 0,
        activityCount: productActivities.length,
        programmeCount: productPrograms.length,
      }),
    [productTeam.length, productPipeline, productActivities.length, productPrograms.length],
  );

  const productKpiItems = useMemo(
    () => [
      { label: "Eligible Lenders", value: productLenders.length },
      { label: "Programmes", value: productPrograms.length },
      { label: "Deals", value: productPipeline?.dealCount ?? 0 },
      { label: "Opportunities", value: productPipeline?.opportunityHints ?? 0 },
      { label: "Disbursed", value: productPipeline?.disbursedCount ?? 0 },
      {
        label: "Avg TAT",
        value: productTat != null ? `${productTat}d` : LENDING_PROGRAMS_NOT_SPECIFIED,
      },
    ],
    [productLenders.length, productPrograms.length, productPipeline, productTat],
  );

  const openLenderWorkspace = (lenderId: string) => {
    router.push(
      buildElwWorkspaceHref(lenderId, {
        from: "lenders",
        returnTo: `${ROUTES.LENDERS}?view=lender&lenderId=${encodeURIComponent(lenderId)}`,
      }),
    );
  };

  const onSelectLender = (id: string) => {
    setSelectedLenderId(id);
    syncUrl({ view: "lender", lenderId: id });
  };

  const onSelectProduct = (code: string) => {
    setSelectedProductCode(code);
    setProductFocusLenderId(null);
    syncUrl({ view: "product", productCode: code });
  };

  const handleOpenContact = () => {
    const source = view === "product" ? productTeam : team;
    const first = source[0];
    if (!first || first.source !== "ecm_banker") {
      toast.message(view === "product" ? "Select a lender" : "Open Contact", {
        description:
          view === "product"
            ? "Focus an eligible lender with an ECM Banker contact to open Contact Registry."
            : "Link an ECM Banker contact to open the Contact Registry.",
      });
      return;
    }
    router.push(`${ROUTES.CONTACTS}?contactId=${encodeURIComponent(first.id)}`);
  };

  const handleCreateOpportunity = () => {
    router.push(ROUTES.MY_OPPORTUNITIES);
  };

  if (loading && !snapshot) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Loading {LENDING_PROGRAMS_WORKSPACE_TITLE}…
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="space-y-2 p-2">
        <p className="text-sm text-destructive">Unable to load Lending Programs snapshot.</p>
        <Button size="sm" onClick={() => void reloadAll(true)}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn("flex w-full flex-col gap-1.5 transition-[padding] duration-200", chanakyaOpen && "pr-80")}
        data-surface="lending-programs-workspace"
        data-sprint="CO-LW-004"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs
            value={view}
            onValueChange={(v) => {
              const next = v === "product" ? "product" : "lender";
              setView(next);
              syncUrl({ view: next });
            }}
            className="w-full"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList className="h-8 w-fit">
                <TabsTrigger value="lender" className="h-7 gap-1 px-2.5 text-[11px]">
                  <Building2 className="h-3 w-3" />
                  Lender View
                </TabsTrigger>
                <TabsTrigger value="product" className="h-7 gap-1 px-2.5 text-[11px]">
                  <Package className="h-3 w-3" />
                  Product View
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-[11px]"
                  disabled={refreshing}
                  onClick={() => void reloadAll(true)}
                >
                  <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
                  Refresh Snapshot
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={chanakyaOpen ? "default" : "outline"}
                  className="h-7 gap-1 px-2 text-[11px]"
                  onClick={() => setChanakyaOpen((o) => !o)}
                  aria-pressed={chanakyaOpen}
                >
                  <Sparkles className="h-3 w-3" />
                  CHANAKYA Insights
                </Button>
              </div>
            </div>

            <TabsContent value="lender" className="mt-1.5 outline-none">
              <div className="grid gap-1.5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
                <aside className="flex flex-col gap-1.5 rounded-md border border-border/80 bg-card p-1.5 lg:sticky lg:top-14 lg:max-h-[calc(100vh-5.5rem)]">
                  <Input
                    className="h-7 text-[11px]"
                    placeholder="Search lenders…"
                    value={lenderSearch}
                    onChange={(e) => setLenderSearch(e.target.value)}
                  />
                  <Select value={productFilter} onValueChange={setProductFilter}>
                    <SelectTrigger className="h-7 text-[11px]">
                      <SelectValue placeholder="Product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        All products
                      </SelectItem>
                      {snapshot.products.map((p) => (
                        <SelectItem key={p.code} value={p.code} className="text-xs">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={regionFilter} onValueChange={setRegionFilter}>
                    <SelectTrigger className="h-7 text-[11px]">
                      <SelectValue placeholder="Region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        All regions
                      </SelectItem>
                      {snapshot.regions.slice(0, 80).map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] uppercase text-muted-foreground">
                    Active ({LENDING_PROGRAMS_ACTIVE_DAYS}d) · {filteredActive.length}
                  </p>
                  <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
                    {filteredActive.length === 0 ? (
                      <EmptyHint>No active lenders in window. Search to find others.</EmptyHint>
                    ) : (
                      filteredActive.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px] hover:bg-muted/60",
                            selectedLenderId === l.id && "bg-muted font-medium",
                          )}
                          onClick={() => onSelectLender(l.id)}
                        >
                          <LenderLogo
                            lender={lenderDisplayName(l)}
                            logoUrl={l.logoUrl}
                            website={l.website}
                            size="sm"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{lenderDisplayName(l)}</span>
                            <span className="block truncate text-[9px] text-muted-foreground">
                              {l.code}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                    {searchableRemainder.length > 0 && (
                      <>
                        <p className="mt-1.5 text-[9px] uppercase text-muted-foreground">
                          Search results
                        </p>
                        {searchableRemainder.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            className={cn(
                              "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px] hover:bg-muted/60",
                              selectedLenderId === l.id && "bg-muted font-medium",
                            )}
                            onClick={() => onSelectLender(l.id)}
                          >
                            <LenderLogo
                              lender={lenderDisplayName(l)}
                              logoUrl={l.logoUrl}
                              website={l.website}
                              size="sm"
                            />
                            <span className="truncate">{lenderDisplayName(l)}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </aside>

                <div className="min-w-0 space-y-1.5">
                  {!selectedLender ? (
                    <Section title="Work area" compact>
                      <EmptyHint>
                        Select a lender to view KPIs, visual analytics, programmes, team, and
                        live pipeline.
                      </EmptyHint>
                    </Section>
                  ) : (
                    <>
                      <Section title="Lender" compact>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <LenderLogo
                              lender={lenderDisplayName(selectedLender)}
                              logoUrl={selectedLender.logoUrl}
                              website={selectedLender.website}
                              size="lg"
                              className="rounded-md"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold leading-tight">
                                {lenderDisplayName(selectedLender)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {selectedLender.code}
                                {selectedLender.classification
                                  ? ` · ${selectedLender.classification}`
                                  : ""}
                                {" · "}
                                HQ {formatLpValue(selectedLender.headquartersLabel)}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-[11px]"
                            onClick={() => openLenderWorkspace(selectedLender.id)}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open Workspace
                          </Button>
                        </div>
                      </Section>

                      <LpKpiStrip items={lenderKpiItems} />

                      <LpDashboardCharts
                        stageSlices={lenderStageSlices}
                        funnel={lenderFunnel}
                        approvalSlices={lenderApproval}
                        productMix={lenderProductMix}
                        programmeCoverage={lenderCoverage}
                        citySlices={lenderCities}
                        relationshipSignals={lenderRelationshipSignals}
                        monthlyTrend={lenderMonthlyTrend}
                        averageTat={lenderTat}
                      />

                      <div className="grid gap-1.5 md:grid-cols-2">
                        <Section title="Published Programmes" compact>
                          {lenderPrograms.length === 0 ? (
                            <EmptyHint>No published programmes for this lender.</EmptyHint>
                          ) : (
                            <ul className="max-h-40 space-y-0.5 overflow-y-auto">
                              {lenderPrograms.map((p) => (
                                <li
                                  key={p.id}
                                  className="flex flex-wrap items-baseline justify-between gap-1 rounded border border-border/50 px-1.5 py-1 text-[11px]"
                                >
                                  <span className="font-medium">{p.label}</span>
                                  <span className="text-muted-foreground">
                                    {formatLpValue(p.productCode)} · ROI{" "}
                                    {formatLpPercent(p.roiPercent)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </Section>
                        <Section title="Supported Products" compact>
                          <div className="flex flex-wrap gap-1">
                            {(snapshot.capabilityByLender[selectedLender.id] ?? []).length ===
                            0 ? (
                              <EmptyHint>{LENDING_PROGRAMS_NOT_SPECIFIED}</EmptyHint>
                            ) : (
                              (snapshot.capabilityByLender[selectedLender.id] ?? []).map(
                                (code) => {
                                  const label =
                                    snapshot.products.find((p) => p.code === code)?.label ??
                                    code;
                                  return (
                                    <Badge key={code} variant="secondary" className="text-[10px]">
                                      {label}
                                    </Badge>
                                  );
                                },
                              )
                            )}
                          </div>
                        </Section>
                      </div>

                      <div className="grid gap-1.5 md:grid-cols-2">
                        <Section title="Relationship Team" compact>
                          {team.length === 0 ? (
                            <EmptyHint>
                              No ECM Banker or lender contacts linked yet. Capture Sales
                              Contacts during Identify Lender.
                            </EmptyHint>
                          ) : (
                            <ul className="max-h-36 space-y-0.5 overflow-y-auto text-[11px]">
                              {team.map((m) => (
                                <li key={`${m.source}-${m.id}`}>
                                  <span className="font-medium">{m.name}</span>
                                  <span className="text-muted-foreground">
                                    {" · "}
                                    {formatLpValue(m.designation)}
                                    {" · "}
                                    {formatLpValue(m.mobile)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </Section>
                        <Section title="Pipeline (Live)" compact>
                          {!pipeline || pipeline.dealCount === 0 ? (
                            <EmptyHint>No live Enterprise Deals for this lender.</EmptyHint>
                          ) : (
                            <div className="space-y-0.5 text-[11px]">
                              <p>
                                Deals <strong>{pipeline.dealCount}</strong>
                                {" · "}
                                Opportunities <strong>{pipeline.opportunityHints}</strong>
                                {" · "}
                                Disbursed <strong>{pipeline.disbursedCount}</strong>
                              </p>
                              <ul className="max-h-28 space-y-0.5 overflow-y-auto">
                                {pipeline.recentDealLabels.map((d) => (
                                  <li key={d.id} className="truncate text-muted-foreground">
                                    {d.label} · {d.stage}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </Section>
                      </div>

                      <div className="grid gap-1.5 sm:grid-cols-3">
                        <Section title="Business Information" compact>
                          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px]">
                            <dt className="text-muted-foreground">Care phone</dt>
                            <dd className="truncate">
                              {formatLpValue(selectedLender.customerCarePhone)}
                            </dd>
                            <dt className="text-muted-foreground">Care email</dt>
                            <dd className="truncate">
                              {formatLpValue(selectedLender.customerCareEmail)}
                            </dd>
                            <dt className="text-muted-foreground">Pan India</dt>
                            <dd>{selectedLender.panIndia ? "Yes" : "No"}</dd>
                            <dt className="text-muted-foreground">Web</dt>
                            <dd className="truncate">{formatLpValue(selectedLender.website)}</dd>
                          </dl>
                        </Section>
                        <Section title="Activities (ECIE)" compact>
                          {activities.length === 0 ? (
                            <EmptyHint>No conversation activities for linked contacts.</EmptyHint>
                          ) : (
                            <ul className="max-h-28 space-y-0.5 overflow-y-auto text-[11px]">
                              {activities.map((a) => (
                                <li key={a.id} className="truncate">
                                  {a.title}
                                </li>
                              ))}
                            </ul>
                          )}
                        </Section>
                        <Section title="Timeline · Documents" compact>
                          {timeline.length === 0 && documents.length === 0 ? (
                            <EmptyHint>No EDC events or lender documents yet.</EmptyHint>
                          ) : (
                            <ul className="max-h-28 space-y-0.5 overflow-y-auto text-[11px]">
                              {timeline.slice(0, 4).map((e) => (
                                <li key={e.id} className="truncate">
                                  {e.title}
                                </li>
                              ))}
                              {documents.slice(0, 4).map((d) => (
                                <li key={d.id} className="truncate text-muted-foreground">
                                  Doc · {d.title}
                                </li>
                              ))}
                            </ul>
                          )}
                        </Section>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="product" className="mt-1.5 outline-none">
              <div className="grid gap-1.5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
                <aside className="flex flex-col gap-1.5 rounded-md border border-border/80 bg-card p-1.5 lg:sticky lg:top-14 lg:max-h-[calc(100vh-5.5rem)]">
                  <p className="text-[9px] uppercase text-muted-foreground">
                    Product Families · {familiesForDisplay.length}
                  </p>
                  <Input
                    className="h-7 text-[11px]"
                    placeholder="Search products…"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                    {familiesForDisplay.length === 0 ? (
                      <EmptyHint>No products match your search.</EmptyHint>
                    ) : (
                      familiesForDisplay.map((family) => {
                        const expanded =
                          expandedFamilyIds.has(family.id) || productSearch.trim().length > 0;
                        return (
                          <div key={family.id} className="rounded border border-border/60">
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-1 px-1.5 py-1 text-left text-[11px] font-medium hover:bg-muted/50"
                              onClick={() => toggleFamily(family.id)}
                            >
                              <span className="truncate">{family.label}</span>
                              <span className="flex shrink-0 items-center gap-1 text-[9px] font-normal text-muted-foreground">
                                {family.members.length}
                                {expanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </span>
                            </button>
                            {expanded && (
                              <div className="space-y-0.5 border-t border-border/50 px-1 py-1">
                                {family.members.map((m) => (
                                  <button
                                    key={m.code}
                                    type="button"
                                    className={cn(
                                      "w-full rounded px-1.5 py-1 text-left text-[11px] hover:bg-muted/60",
                                      selectedProductCode === m.code && "bg-muted font-medium",
                                    )}
                                    onClick={() => onSelectProduct(m.code)}
                                  >
                                    <span className="block truncate">{m.label}</span>
                                    <span className="block truncate text-[9px] text-muted-foreground">
                                      {m.code}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </aside>

                <div className="min-w-0 space-y-1.5">
                  {!selectedProduct ? (
                    <Section title="Product workspace" compact>
                      <EmptyHint>
                        Select a product to review KPIs, eligible lenders, programme comparison,
                        and live pipeline.
                      </EmptyHint>
                    </Section>
                  ) : (
                    <>
                      <Section title="Selected Product" compact>
                        <div className="min-w-0">
                          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                            {selectedFamily?.label ?? "Product Family"}
                          </p>
                          <p className="truncate text-sm font-semibold leading-tight">
                            {selectedProduct.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {selectedProduct.code}
                          </p>
                        </div>
                      </Section>

                      <LpKpiStrip items={productKpiItems} />

                      <Section title="Eligible Lenders" compact>
                        {productLenders.length === 0 ? (
                          <EmptyHint>
                            No lenders with capability or published programmes.
                          </EmptyHint>
                        ) : (
                          <ul className="max-h-48 space-y-0.5 overflow-y-auto">
                            {productLenders.map((l) => {
                              const progCount = productPrograms.filter(
                                (p) => p.lenderId === l.id,
                              ).length;
                              return (
                                <li key={l.id}>
                                  <button
                                    type="button"
                                    className={cn(
                                      "flex w-full items-center justify-between gap-2 rounded border border-transparent px-1.5 py-1 text-left text-[11px] hover:border-border hover:bg-muted/40",
                                      productFocusLenderId === l.id &&
                                        "border-border bg-muted font-medium",
                                    )}
                                    onClick={() => setProductFocusLenderId(l.id)}
                                    onDoubleClick={() => {
                                      setView("lender");
                                      onSelectLender(l.id);
                                    }}
                                  >
                                    <span className="truncate">{lenderDisplayName(l)}</span>
                                    <span className="shrink-0 text-[9px] text-muted-foreground">
                                      {progCount} prog
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <p className="mt-1 text-[9px] text-muted-foreground">
                          Select lender for Relationship Team · double-click opens Lender View
                        </p>
                      </Section>

                      <Section title="Comparison Matrix" compact>
                        <ComparisonMatrix programs={productPrograms} snapshot={snapshot} />
                      </Section>

                      <div className="grid gap-1.5 md:grid-cols-2">
                        <Section title="Pipeline (Live)" compact>
                          {!productPipeline || productPipeline.dealCount === 0 ? (
                            <EmptyHint>
                              No live Enterprise Deals matched to this product.
                            </EmptyHint>
                          ) : (
                            <div className="space-y-0.5 text-[11px]">
                              <p>
                                Deals <strong>{productPipeline.dealCount}</strong>
                                {" · "}
                                Disbursed <strong>{productPipeline.disbursedCount}</strong>
                              </p>
                              {productPipeline.activeDealStages.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {productPipeline.activeDealStages.slice(0, 6).map((s) => (
                                    <Badge
                                      key={s.stage}
                                      variant="outline"
                                      className="text-[9px] font-normal"
                                    >
                                      {s.stage} · {s.count}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}
                              <ul className="max-h-24 space-y-0.5 overflow-y-auto">
                                {productPipeline.recentDealLabels.map((d) => (
                                  <li key={d.id} className="truncate text-muted-foreground">
                                    {d.label} · {d.stage}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </Section>
                        <Section title="Active Opportunities" compact>
                          {!productPipeline || productPipeline.opportunityHints === 0 ? (
                            <EmptyHint>
                              No linked Opportunity hints on live Deals for this product.
                            </EmptyHint>
                          ) : (
                            <div className="space-y-0.5 text-[11px]">
                              <p>
                                Linked opportunities (via Deals):{" "}
                                <strong>{productPipeline.opportunityHints}</strong>
                              </p>
                              <ul className="max-h-28 space-y-0.5 overflow-y-auto">
                                {productPipeline.recentDealLabels.map((d) => (
                                  <li
                                    key={`opp-${d.id}`}
                                    className="truncate text-muted-foreground"
                                  >
                                    {d.label} · {d.stage}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </Section>
                      </div>

                      <LpDashboardCharts
                        stageSlices={productStageSlices}
                        funnel={productFunnel}
                        approvalSlices={productApproval}
                        productMix={productProductMix}
                        programmeCoverage={productCoverage}
                        citySlices={productCities}
                        relationshipSignals={productRelationshipSignals}
                        monthlyTrend={productMonthlyTrend}
                        averageTat={productTat}
                      />

                      <div className="grid gap-1.5 md:grid-cols-2">
                        <Section title="Relationship Team" compact>
                          {!productFocusLenderId ? (
                            <EmptyHint>
                              Select an eligible lender to load relationship contacts.
                            </EmptyHint>
                          ) : productTeam.length === 0 ? (
                            <EmptyHint>
                              No ECM Banker or lender contacts linked for the focused lender.
                            </EmptyHint>
                          ) : (
                            <ul className="max-h-32 space-y-0.5 overflow-y-auto text-[11px]">
                              {productTeam.map((m) => (
                                <li key={`pt-${m.source}-${m.id}`}>
                                  <span className="font-medium">{m.name}</span>
                                  <span className="text-muted-foreground">
                                    {" · "}
                                    {formatLpValue(m.designation)}
                                    {" · "}
                                    {formatLpValue(m.mobile)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </Section>
                        <Section title="Business Fit" compact>
                          <p className="mb-1 text-[9px] text-muted-foreground">
                            Factual flags from programme fields only — never inferred.
                          </p>
                          <div className="grid grid-cols-2 gap-1">
                            {businessFit.map((cell) => (
                              <div
                                key={cell.key}
                                className="flex items-center justify-between rounded border border-border/50 px-1.5 py-1 text-[11px]"
                              >
                                <span className="truncate">{cell.label}</span>
                                <FitBadge supported={cell.supported} />
                              </div>
                            ))}
                          </div>
                        </Section>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <p className="pb-1 text-[9px] text-muted-foreground">
          Snapshot {snapshot.generatedAt ? new Date(snapshot.generatedAt).toLocaleString() : ""} ·
          masters only · pipeline / activities / timeline remain live
        </p>
      </div>

      <ChanakyaInsightsDrawer
        open={chanakyaOpen}
        onOpenChange={setChanakyaOpen}
        focusLabel={
          view === "product"
            ? (selectedProduct?.label ?? null)
            : selectedLender
              ? lenderDisplayName(selectedLender)
              : null
        }
        productMode={view === "product"}
        team={view === "product" ? productTeam : team}
        pipeline={view === "product" ? productPipeline : pipeline}
        onOpenContact={handleOpenContact}
        onCreateOpportunity={handleCreateOpportunity}
      />
    </>
  );
}

function ComparisonMatrix({
  programs,
  snapshot,
}: {
  programs: EnterpriseLenderProgramRecord[];
  snapshot: LendingProgramsSnapshot;
}) {
  if (programs.length === 0) {
    return <EmptyHint>No published programmes for this product.</EmptyHint>;
  }

  const lenderName = (id: string) => {
    const l = snapshot.lenders.find((x) => x.id === id);
    return l ? lenderDisplayName(l) : id.slice(0, 8);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-border text-left text-[9px] uppercase text-muted-foreground">
            <th className="px-1 py-1">Lender</th>
            <th className="px-1 py-1">Programme</th>
            <th className="px-1 py-1">Interest Rate</th>
            <th className="px-1 py-1">Processing Fee</th>
            <th className="px-1 py-1">Max LTV</th>
            <th className="px-1 py-1">FOIR</th>
            <th className="px-1 py-1">Tenure</th>
            <th className="px-1 py-1">TAT</th>
            <th className="px-1 py-1">Segments</th>
          </tr>
        </thead>
        <tbody>
          {programs.map((p) => (
            <tr key={p.id} className="border-b border-border/40">
              <td className="px-1 py-1 font-medium">{lenderName(p.lenderId)}</td>
              <td className="px-1 py-1">{p.label}</td>
              <td className="px-1 py-1 tabular-nums">{formatLpPercent(p.roiPercent)}</td>
              <td className="px-1 py-1">
                {p.processingFeeLabel?.trim()
                  ? p.processingFeeLabel
                  : formatLpPercent(p.processingFeePct)}
              </td>
              <td className="px-1 py-1 tabular-nums">{formatLpPercent(p.maxLtvPercent)}</td>
              <td className="px-1 py-1">{LENDING_PROGRAMS_NOT_SPECIFIED}</td>
              <td className="px-1 py-1">{formatLpMonths(p.maxTenureMonths)}</td>
              <td className="px-1 py-1">{formatLpDays(p.averageTatDays)}</td>
              <td className="px-1 py-1">
                {formatLpValue(
                  [p.employmentType, p.borrowerType].filter(Boolean).join(" · ") || null,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
