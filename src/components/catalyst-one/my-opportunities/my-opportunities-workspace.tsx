"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Target } from "lucide-react";
import { OpportunityRegistryTable } from "@/components/catalyst-one/my-opportunities/opportunity-registry-table";
import { WorkspaceExitNav } from "@/components/enterprise/navigation";
import {
  MY_OPPORTUNITIES_OFFICIAL_NAME,
  MY_OPPORTUNITIES_SUBTITLE,
} from "@/constants/my-opportunities";
import { ROUTES } from "@/constants/routes";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { buildOpportunityWorkspaceStageHref } from "@/constants/opportunity-workspace-stages";
import { buildSimpleWorkspaceBreadcrumbs } from "@/constants/enterprise-exit-navigation";
import {
  freshLoginKpiTitle,
  type FreshLoginKpiBucketId,
} from "@/constants/opportunity-business-source";
import { rememberOpportunityRegistryRowContext } from "@/lib/lead-opportunity-journey/opportunity-context";
import {
  enterpriseOpportunityApiClient,
  OpportunityApiError,
} from "@/lib/enterprise-opportunity/opportunity-api-client";
import { mapEnterpriseOpportunityToRegistryRow } from "@/lib/enterprise-opportunity/map-opportunity-to-registry-row";
import {
  notifyOpportunitiesUpdated,
  subscribeOpportunitiesUpdated,
} from "@/lib/enterprise-opportunity/opportunity-data-sync";
import {
  buildAssignmentPatch,
  formatAssignedUsersLabel,
  writeAssignedUsersIntoExtension,
  type AssignedUserRef,
} from "@/lib/assigned-users";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { subscribeLoanFilesUpdated } from "@/lib/loan-data-sync";
import type { OpportunityRegistryRow } from "@/types/opportunity-registry";
import { cn } from "@/lib/utils";

function openOpportunityWorkspace(
  router: ReturnType<typeof useRouter>,
  row: OpportunityRegistryRow,
) {
  rememberOpportunityRegistryRowContext(row);
  router.push(
    buildOpportunityWorkspaceStageHref("opportunity_creation", {
      fileId: row.legacyLoanFileId ?? null,
      opportunityId: row.id,
    }),
  );
}

function editOpportunityWorkspace(
  router: ReturnType<typeof useRouter>,
  row: OpportunityRegistryRow,
) {
  rememberOpportunityRegistryRowContext(row);
  router.push(
    buildJourneyHref(ROUTES.LEAD_INFORMATION, {
      fileId: row.legacyLoanFileId ?? null,
      opportunityId: row.id,
    }),
  );
}

function parseSourceBucket(
  raw: string | null,
): "direct" | "channel_partner" | "referral" | "other" | undefined {
  if (
    raw === "direct" ||
    raw === "channel_partner" ||
    raw === "referral" ||
    raw === "other"
  ) {
    return raw;
  }
  return undefined;
}

/**
 * CO-ARCH-003 — Enterprise Opportunity Registry (My Opportunities).
 * Primary business list for all Opportunities (requirement queue).
 * CO-UX-006 — supports Fresh Login KPI drill-down via URL query.
 */
export function MyOpportunitiesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tick, setTick] = useState(0);
  const [rows, setRows] = useState<OpportunityRegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("Loading…");

  const freshLoginToday = searchParams.get("freshLogin") === "today";
  const sourceBucket = parseSourceBucket(searchParams.get("sourceBucket"));
  const sourceCode = searchParams.get("sourceCode")?.trim() || undefined;
  const requirementStage = searchParams.get("requirementStage")?.trim() || undefined;
  const q = searchParams.get("q")?.trim() || undefined;
  const ageBucket = searchParams.get("ageBucket")?.trim() || undefined;

  const listContextLabel = useMemo(() => {
    if (freshLoginToday) {
      const bucketTitle = sourceBucket
        ? freshLoginKpiTitle(sourceBucket as FreshLoginKpiBucketId)
        : "Total";
      return `Today's Fresh Logins · ${bucketTitle}`;
    }
    if (sourceBucket) return `Source bucket · ${freshLoginKpiTitle(sourceBucket)}`;
    if (sourceCode) return `Source · ${sourceCode}`;
    if (requirementStage) return `Stage · ${requirementStage.replace(/_/g, " ")}`;
    if (ageBucket) return `Ageing · ${ageBucket.replace(/_/g, "–")}`;
    if (q) return `Search · ${q}`;
    return null;
  }, [freshLoginToday, sourceBucket, sourceCode, requirementStage, ageBucket, q]);

  const clearListContext = useCallback(() => {
    router.replace(ROUTES.MY_OPPORTUNITIES);
  }, [router]);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const unsubOpp = subscribeOpportunitiesUpdated(() => setTick((t) => t + 1));
    const unsubLoan = subscribeLoanFilesUpdated(() => setTick((t) => t + 1));
    const onFocus = () => setTick((t) => t + 1);
    window.addEventListener("focus", onFocus);
    return () => {
      unsubOpp();
      unsubLoan();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void enterpriseOpportunityApiClient
      .searchOpportunities({
        limit: 100,
        offset: 0,
        freshLoginToday: freshLoginToday || undefined,
        sourceBucket,
        sourceCode,
        requirementStage,
        q,
      })
      .then((result) => {
        if (cancelled) return;
        let mapped = result.items.map(mapEnterpriseOpportunityToRegistryRow);
        if (ageBucket) {
          const asOf = Date.now();
          mapped = mapped.filter((row) => {
            const created = row.createdAt ? Date.parse(row.createdAt) : NaN;
            if (Number.isNaN(created)) return false;
            const days = Math.floor((asOf - created) / (1000 * 60 * 60 * 24));
            switch (ageBucket) {
              case "0_7":
                return days <= 7;
              case "8_15":
                return days >= 8 && days <= 15;
              case "16_30":
                return days >= 16 && days <= 30;
              case "31_60":
                return days >= 31 && days <= 60;
              case "60_plus":
                return days >= 61;
              default:
                return true;
            }
          });
        }
        setRows(mapped);
        setSourceLabel("SSOT: Enterprise DB");
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load opportunities";
        setRows([]);
        setError(message);
        setSourceLabel("Unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick, freshLoginToday, sourceBucket, sourceCode, requirementStage, q, ageBucket]);

  const handleDeleteOpportunity = useCallback(async (row: OpportunityRegistryRow) => {
    try {
      await enterpriseOpportunityApiClient.deleteOpportunity(row.id);
      toast.success("Opportunity deleted successfully.");
      refresh();
    } catch (err) {
      const message =
        err instanceof OpportunityApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to delete Opportunity";
      toast.error(message);
      throw err;
    }
  }, [refresh]);

  const handleAssignUsers = useCallback(
    async (row: OpportunityRegistryRow, users: AssignedUserRef[]) => {
      const patch = buildAssignmentPatch(users);
      let hierarchyVisibilityUserIds: string[] = [];
      try {
        const params = new URLSearchParams({
          userIds: patch.hierarchySeedUserIds.join(","),
        });
        const res = await authenticatedJsonFetch(
          `/api/users/hierarchy-ancestors?${params.toString()}`,
        );
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: { ancestorUserIds?: string[] };
        };
        if (res.ok && body.success) {
          hierarchyVisibilityUserIds = body.data?.ancestorUserIds ?? [];
        }
      } catch {
        hierarchyVisibilityUserIds = [];
      }
      const lendingExtension = writeAssignedUsersIntoExtension(
        row.lendingExtension,
        patch.lendingExtensionPatch,
        {
          primaryOwnerUserId: patch.primaryOwnerUserId,
          hierarchyVisibilityUserIds,
        },
      );
      try {
        const updated = await enterpriseOpportunityApiClient.updateOpportunity(row.id, {
          lendingExtension,
          primaryOwnerUserId: patch.primaryOwnerUserId,
          relationshipManagerUserId: patch.relationshipManagerUserId,
          relationshipManagerName: patch.relationshipManagerName,
          rowVersion: row.rowVersion,
        });
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...mapEnterpriseOpportunityToRegistryRow(updated),
                  assignedUsers: patch.lendingExtensionPatch,
                  owner: formatAssignedUsersLabel(patch.lendingExtensionPatch),
                }
              : r,
          ),
        );
        toast.success("Assigned users updated.");
        refresh();
      } catch (err) {
        const message =
          err instanceof OpportunityApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to update assigned users";
        toast.error(message);
        throw err;
      }
    },
    [refresh],
  );

  return (
    <div
      className="flex h-[calc(100vh-3.5rem)] flex-col gap-0 overflow-hidden"
      data-sprint="CO-ARCH-003"
      data-surface="opportunity-registry"
    >
      <WorkspaceExitNav
        breadcrumbs={buildSimpleWorkspaceBreadcrumbs(MY_OPPORTUNITIES_OFFICIAL_NAME)}
        className="shrink-0"
      />
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-2.5 py-1.5 md:px-3 md:py-2">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <h1 className="truncate text-sm font-semibold tracking-tight md:text-[15px]">
              {MY_OPPORTUNITIES_OFFICIAL_NAME}
            </h1>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              · {MY_OPPORTUNITIES_SUBTITLE}
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                error
                  ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                  : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
              )}
              title={error ?? undefined}
            >
              {sourceLabel}
            </span>
          </div>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {rows.length} opportunities
          </p>
        </header>

        {error ? (
          <p className="shrink-0 text-[11px] text-amber-800 dark:text-amber-200" role="status">
            Opportunity Registry unavailable — {error}
          </p>
        ) : null}

        <OpportunityRegistryTable
          rows={rows}
          loading={loading}
          listContextLabel={listContextLabel}
          onClearListContext={listContextLabel ? clearListContext : undefined}
          onOpenOpportunity={(row) => openOpportunityWorkspace(router, row)}
          onEditOpportunity={(row) => editOpportunityWorkspace(router, row)}
          onDeleteOpportunity={handleDeleteOpportunity}
          onAssignUsers={handleAssignUsers}
          onRefresh={() => {
            notifyOpportunitiesUpdated();
            refresh();
          }}
        />
      </div>
    </div>
  );
}
