/**
 * CO-ADMIN-004 — Production Reset & Demo Data Cleanup engine.
 *
 * Soft-deletes transactional business data inside a Prisma transaction.
 * Never mutates users, roles, products, lenders, masters, or identity.
 * Default feature flag OFF — no automatic deletion.
 */

import "server-only";

import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { comparePassword } from "@server/utils/password";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  isProductionResetEnabled,
  PRODUCTION_RESET_PRESERVED_CATEGORIES,
  PRODUCTION_RESET_TYPED_CONFIRMATION,
  selectionForPreset,
} from "@/constants/production-reset";
import { recordAdminGovernanceAction } from "@/lib/enterprise-governance/admin-governance";
import type {
  CutoverAnalysisResult,
  CutoverDemoVsLiveLine,
  ProductionResetAnalyseResult,
  ProductionResetCutoverReport,
  ProductionResetEntityCount,
  ProductionResetEntitySelection,
  ProductionResetExecuteRequest,
  ProductionResetExecutionResult,
  ProductionResetFilters,
  ProductionResetImpactAnalysis,
  ProductionResetImpactLine,
  ProductionResetPresetId,
  ProductionResetRunSummary,
} from "@/types/production-reset";
import { contactWhere, companyWhere, dealWhere, opportunityWhere } from "./filters";

const MS_PER_RECORD = 2;

function softPayload(actorId: string, reason: string) {
  return {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: actorId,
    deletionReason: reason,
  };
}

function emptySelection(): ProductionResetEntitySelection {
  return {
    contacts: false,
    opportunities: false,
    deals: false,
    tasks: false,
    documents: false,
    notes: false,
    timeline: false,
    notifications: false,
    activities: false,
  };
}

function normalizeSelection(
  preset: ProductionResetPresetId,
  selection?: ProductionResetEntitySelection,
): ProductionResetEntitySelection {
  return selectionForPreset(preset, selection ?? emptySelection());
}

function normalizeFilters(filters?: ProductionResetFilters): ProductionResetFilters {
  return {
    createdBefore: filters?.createdBefore ?? null,
    createdByUserIds: filters?.createdByUserIds ?? [],
    opportunityPrefixes: filters?.opportunityPrefixes ?? [],
    contactPrefixes: filters?.contactPrefixes ?? [],
    demoHeuristics: Boolean(filters?.demoHeuristics),
    importBatchOnly: Boolean(filters?.importBatchOnly),
  };
}

async function resolveOrganizationIds(): Promise<string[]> {
  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { id: true },
    take: 50,
  });
  return orgs.map((o) => o.id);
}

async function entityAgg(
  label: string,
  active: Promise<number>,
  deleted: Promise<number>,
  dates: Promise<{
    _min: { createdAt: Date | null };
    _max: { createdAt: Date | null; updatedAt?: Date | null };
  }>,
): Promise<ProductionResetEntityCount> {
  const [activeCount, alreadyDeletedCount, agg] = await Promise.all([
    active,
    deleted,
    dates,
  ]);
  return {
    entity: label,
    activeCount,
    alreadyDeletedCount,
    earliestCreatedAt: agg._min.createdAt?.toISOString() ?? null,
    latestCreatedAt: agg._max.createdAt?.toISOString() ?? null,
    latestUpdatedAt: agg._max.updatedAt?.toISOString() ?? agg._max.createdAt?.toISOString() ?? null,
  };
}

export class ProductionResetService {
  assertFeatureEnabled() {
    if (!isProductionResetEnabled()) {
      throw Object.assign(
        new Error(
          "Production Reset is disabled. Set PRODUCTION_RESET_ENABLED=true to enable (Super Admin only).",
        ),
        { statusCode: 403, code: "PRODUCTION_RESET_DISABLED" },
      );
    }
  }

  assertPersistence() {
    if (!isEnterprisePersistencePrisma()) {
      throw Object.assign(
        new Error("Production Reset requires ENTERPRISE_PERSISTENCE_MODE=prisma"),
        { statusCode: 503, code: "PERSISTENCE_REQUIRED" },
      );
    }
  }

  async analyse(): Promise<ProductionResetAnalyseResult> {
    this.assertPersistence();
    const organizationIds = await resolveOrganizationIds();
    const warnings: string[] = [];
    if (organizationIds.length === 0) {
      warnings.push("No active organizations found — counts will be zero.");
    }

    const orgFilter = { organizationId: { in: organizationIds } };
    const entities: ProductionResetEntityCount[] = [];

    if (organizationIds.length > 0) {
      entities.push(
        await entityAgg(
          "Companies",
          prisma.ecmCompany.count({ where: { ...orgFilter, isDeleted: false } }),
          prisma.ecmCompany.count({ where: { ...orgFilter, isDeleted: true } }),
          prisma.ecmCompany.aggregate({
            where: orgFilter,
            _min: { createdAt: true },
            _max: { createdAt: true, updatedAt: true },
          }),
        ),
        await entityAgg(
          "Contacts",
          prisma.ecmContact.count({ where: { ...orgFilter, isDeleted: false } }),
          prisma.ecmContact.count({ where: { ...orgFilter, isDeleted: true } }),
          prisma.ecmContact.aggregate({
            where: orgFilter,
            _min: { createdAt: true },
            _max: { createdAt: true, updatedAt: true },
          }),
        ),
        await entityAgg(
          "Customers (Contacts)",
          prisma.ecmContact.count({ where: { ...orgFilter, isDeleted: false } }),
          prisma.ecmContact.count({ where: { ...orgFilter, isDeleted: true } }),
          prisma.ecmContact.aggregate({
            where: orgFilter,
            _min: { createdAt: true },
            _max: { createdAt: true, updatedAt: true },
          }),
        ),
        await entityAgg(
          "Opportunities",
          prisma.enterpriseOpportunity.count({
            where: { ...orgFilter, isDeleted: false },
          }),
          prisma.enterpriseOpportunity.count({
            where: { ...orgFilter, isDeleted: true },
          }),
          prisma.enterpriseOpportunity.aggregate({
            where: orgFilter,
            _min: { createdAt: true },
            _max: { createdAt: true, updatedAt: true },
          }),
        ),
        await entityAgg(
          "Deals",
          prisma.enterpriseDeal.count({ where: { ...orgFilter, isDeleted: false } }),
          prisma.enterpriseDeal.count({ where: { ...orgFilter, isDeleted: true } }),
          prisma.enterpriseDeal.aggregate({
            where: orgFilter,
            _min: { createdAt: true },
            _max: { createdAt: true, updatedAt: true },
          }),
        ),
        await entityAgg(
          "Deal projections",
          prisma.enterpriseDeal.count({
            where: {
              ...orgFilter,
              isDeleted: false,
              OR: [
                { legacyLoanFileId: { not: null } },
                { fileNumber: { not: null } },
              ],
            },
          }),
          prisma.enterpriseDeal.count({
            where: {
              ...orgFilter,
              isDeleted: true,
              OR: [
                { legacyLoanFileId: { not: null } },
                { fileNumber: { not: null } },
              ],
            },
          }),
          prisma.enterpriseDeal.aggregate({
            where: orgFilter,
            _min: { createdAt: true },
            _max: { createdAt: true, updatedAt: true },
          }),
        ),
        await entityAgg(
          "Tasks",
          prisma.enterpriseDealTask.count({
            where: { ...orgFilter, isDeleted: false },
          }),
          prisma.enterpriseDealTask.count({
            where: { ...orgFilter, isDeleted: true },
          }),
          prisma.enterpriseDealTask.aggregate({
            where: orgFilter,
            _min: { createdAt: true },
            _max: { createdAt: true, updatedAt: true },
          }),
        ),
        await entityAgg(
          "Documents (deal links)",
          prisma.enterpriseDealDocumentLink.count({
            where: { ...orgFilter, isDeleted: false },
          }),
          prisma.enterpriseDealDocumentLink.count({
            where: { ...orgFilter, isDeleted: true },
          }),
          prisma.enterpriseDealDocumentLink.aggregate({
            where: orgFilter,
            _min: { createdAt: true },
            _max: { createdAt: true, updatedAt: true },
          }),
        ),
        await entityAgg(
          "Customer Notes",
          prisma.enterpriseDealNote.count({
            where: { ...orgFilter, isDeleted: false },
          }),
          prisma.enterpriseDealNote.count({
            where: { ...orgFilter, isDeleted: true },
          }),
          prisma.enterpriseDealNote.aggregate({
            where: orgFilter,
            _min: { createdAt: true },
            _max: { createdAt: true, updatedAt: true },
          }),
        ),
        await entityAgg(
          "Timeline Events",
          prisma.enterpriseDealTimelineEvent.count({ where: orgFilter }),
          Promise.resolve(0),
          prisma.enterpriseDealTimelineEvent.aggregate({
            where: orgFilter,
            _min: { createdAt: true },
            _max: { createdAt: true },
          }),
        ),
        await entityAgg(
          "Notifications",
          prisma.enterpriseDealNotificationLink.count({
            where: { ...orgFilter, isDeleted: false },
          }),
          prisma.enterpriseDealNotificationLink.count({
            where: { ...orgFilter, isDeleted: true },
          }),
          prisma.enterpriseDealNotificationLink.aggregate({
            where: orgFilter,
            _min: { createdAt: true },
            _max: { createdAt: true, updatedAt: true },
          }),
        ),
        {
          entity: "Messages",
          activeCount: 0,
          alreadyDeletedCount: 0,
          earliestCreatedAt: null,
          latestCreatedAt: null,
          latestUpdatedAt: null,
        },
        await entityAgg(
          "Activities",
          prisma.enterpriseDealActivity.count({
            where: { ...orgFilter, isDeleted: false },
          }),
          prisma.enterpriseDealActivity.count({
            where: { ...orgFilter, isDeleted: true },
          }),
          prisma.enterpriseDealActivity.aggregate({
            where: orgFilter,
            _min: { createdAt: true },
            _max: { createdAt: true, updatedAt: true },
          }),
        ),
      );
      warnings.push(
        "Messages are portal/token projections (not a durable transactional table) — excluded from reset counts.",
      );
    }

    const estimatedRecordsAffected = entities
      .filter((e) => e.entity !== "Customers (Contacts)" && e.entity !== "Deal projections")
      .reduce((sum, e) => sum + e.activeCount, 0);

    return {
      generatedAt: new Date().toISOString(),
      persistenceReady: true,
      featureEnabled: isProductionResetEnabled(),
      organizationIds,
      entities,
      estimatedRecordsAffected,
      preservedCategories: [...PRODUCTION_RESET_PRESERVED_CATEGORIES],
      warnings,
    };
  }

  /**
   * CO-CUTOVER-001 — Demo vs live inventory + dry-run impact.
   * Never mutates data. Administrator must review before any execute.
   */
  async analyseCutover(): Promise<CutoverAnalysisResult> {
    this.assertPersistence();
    const inventory = await this.analyse();
    const demoFilters: ProductionResetFilters = {
      demoHeuristics: true,
      importBatchOnly: false,
      createdBefore: null,
      createdByUserIds: [],
      opportunityPrefixes: [],
      contactPrefixes: [],
    };
    const demoImpactPreview = await this.buildImpact(
      "demo_data_only",
      undefined,
      demoFilters,
      "dry_run",
    );

    const organizationIds = inventory.organizationIds;
    const demoVsLive: CutoverDemoVsLiveLine[] = [];

    if (organizationIds.length > 0) {
      const orgFilter = { organizationId: { in: organizationIds }, isDeleted: false };
      const [
        contactsTotal,
        contactsDemo,
        companiesTotal,
        companiesDemo,
        oppsTotal,
        oppsDemo,
        dealsTotal,
        dealsDemo,
        metricSnapshots,
      ] = await Promise.all([
        prisma.ecmContact.count({ where: orgFilter }),
        prisma.ecmContact.count({ where: contactWhere(organizationIds, demoFilters) }),
        prisma.ecmCompany.count({ where: orgFilter }),
        prisma.ecmCompany.count({ where: companyWhere(organizationIds, demoFilters) }),
        prisma.enterpriseOpportunity.count({ where: orgFilter }),
        prisma.enterpriseOpportunity.count({
          where: opportunityWhere(organizationIds, demoFilters),
        }),
        prisma.enterpriseDeal.count({ where: orgFilter }),
        prisma.enterpriseDeal.count({ where: dealWhere(organizationIds, demoFilters) }),
        prisma.enterpriseMetricSnapshot.count({
          where: { organizationId: { in: organizationIds } },
        }).catch(() => 0),
      ]);

      const push = (
        entity: string,
        totalActive: number,
        demoCandidateCount: number,
        notes?: string,
      ) => {
        demoVsLive.push({
          entity,
          totalActive,
          demoCandidateCount,
          liveRetainedEstimate: Math.max(0, totalActive - demoCandidateCount),
          notes,
        });
      };

      push(
        "Contacts",
        contactsTotal,
        contactsDemo,
        "Demo heuristics: Demo/Test name prefixes, demo emails, createdBy=demo-seed",
      );
      push(
        "Companies",
        companiesTotal,
        companiesDemo,
        "Demo heuristics: Demo/Test company names, createdBy=demo-seed",
      );
      push(
        "Opportunities",
        oppsTotal,
        oppsDemo,
        "Demo heuristics: DEMO/TEST/UAT numbers, demo names/emails, demo-seed",
      );
      push(
        "Deals",
        dealsTotal,
        dealsDemo,
        "Demo heuristics: DEMO/TEST numbers, import batches, demo-seed",
      );
      demoVsLive.push({
        entity: "Enterprise Metric Snapshots (EME)",
        totalActive: metricSnapshots,
        demoCandidateCount: 0,
        liveRetainedEstimate: metricSnapshots,
        notes:
          "Not soft-deleted in demo reset — regenerate via EME Force Recalculate after cleanup (Phase 4).",
      });
    }

    return {
      programme: "CO-CUTOVER-001",
      generatedAt: new Date().toISOString(),
      deletionPerformed: false,
      awaitingAdministratorReview: true,
      persistenceReady: inventory.persistenceReady,
      featureEnabled: inventory.featureEnabled,
      organizationIds: inventory.organizationIds,
      preservedCategories: inventory.preservedCategories,
      inventory: inventory.entities,
      demoVsLive,
      demoImpactPreview,
      rebuildPlan: [
        "Administration → Enterprise Metrics → Force Recalculate (EME Category A + B)",
        "Refresh User Home / RM Workspace (derived from live Opportunities, Deals, ETE)",
        "Refresh Enterprise BI / Mission Control consumers (EBI compose — no formula rewrite)",
        "Confirm dashboard Visual Analytics prefers EME snapshots over entity derive fallback",
        "Purge client-local demo caches by ensuring CATALYST_DEMO_SEEDS_ENABLED remains false in production builds",
      ],
      validationChecklist: [
        "Dashboards display only live business metrics",
        "Contact Strategy / Contacts registry shows only live contacts",
        "KPI totals reconcile with live Opportunities",
        "My Deals counts reconcile with live Deals",
        "No orphan Deal children for soft-deleted parents",
        "Masters (users, products, lenders, product-lender matrix, policies) unchanged",
      ],
      warnings: [
        ...inventory.warnings,
        ...demoImpactPreview.warnings,
        "NO DELETION has been performed. Execute only after Super Admin review of this analysis.",
        "Unmarked live records that look like demo (e.g. real customer named Test) will NOT match heuristics — review false-negative risk.",
        "Unmarked demo records without DEMO/TEST prefixes may remain — sample review recommended before go-live.",
      ],
      recommendations: [
        "Review demoVsLive counts and demoImpactPreview.lines carefully.",
        "Prefer preset demo_data_only (never production_cutover) when live transactions must be retained.",
        "Enable PRODUCTION_RESET_ENABLED only for the cutover window; disable immediately after.",
        "Run Dry-run in Administration → Production Reset, then Execute with password + typed confirmation.",
        "After execute: run EME Force Recalculate, then complete validation checklist.",
      ],
    };
  }

  async buildImpact(
    preset: ProductionResetPresetId,
    selectionInput: ProductionResetEntitySelection | undefined,
    filtersInput: ProductionResetFilters | undefined,
    mode: "dry_run" | "execute",
  ): Promise<ProductionResetImpactAnalysis> {
    this.assertPersistence();
    const organizationIds = await resolveOrganizationIds();
    const selection = normalizeSelection(preset, selectionInput);
    const filters =
      preset === "demo_data_only"
        ? normalizeFilters({
            ...filtersInput,
            demoHeuristics: filtersInput?.demoHeuristics ?? true,
            importBatchOnly: filtersInput?.importBatchOnly ?? false,
          })
        : normalizeFilters(filtersInput);

    const lines: ProductionResetImpactLine[] = [];
    const relationshipImpact: string[] = [];
    const orphanRisks: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [
      "Run Dry-run before every execute.",
      "Verify Recovery Center soft-delete ledger after execute.",
      "Confirm masters (users, products, lenders, policies) remain intact.",
    ];

    if (organizationIds.length === 0) {
      warnings.push("No organizations — nothing to reset.");
      return {
        generatedAt: new Date().toISOString(),
        mode,
        preset,
        selection,
        filters,
        lines,
        totalMatched: 0,
        estimatedDurationMs: 0,
        relationshipImpact,
        orphanRisks,
        warnings,
        recommendations,
      };
    }

    const oppWhere = opportunityWhere(organizationIds, filters);
    const dWhere = dealWhere(organizationIds, filters);
    const cWhere = contactWhere(organizationIds, filters);

    const [oppIds, dealIds, contactIds] = await Promise.all([
      selection.opportunities || selection.deals || selection.contacts
        ? prisma.enterpriseOpportunity.findMany({
            where: oppWhere,
            select: { id: true },
            take: 50_000,
          })
        : Promise.resolve([] as { id: string }[]),
      selection.deals ||
      selection.tasks ||
      selection.documents ||
      selection.notes ||
      selection.timeline ||
      selection.notifications ||
      selection.activities ||
      selection.opportunities ||
      selection.contacts
        ? prisma.enterpriseDeal.findMany({
            where: dWhere,
            select: { id: true, opportunityId: true, primaryContactId: true },
            take: 50_000,
          })
        : Promise.resolve(
            [] as { id: string; opportunityId: string | null; primaryContactId: string | null }[],
          ),
      selection.contacts
        ? prisma.ecmContact.findMany({
            where: cWhere,
            select: { id: true },
            take: 50_000,
          })
        : Promise.resolve([] as { id: string }[]),
    ]);

    let expandedDealIds = new Set(dealIds.map((d) => d.id));
    let expandedOppIds = new Set(oppIds.map((o) => o.id));
    const expandedContactIds = new Set(contactIds.map((c) => c.id));

    if (selection.opportunities) {
      const childDeals = await prisma.enterpriseDeal.findMany({
        where: {
          organizationId: { in: organizationIds },
          isDeleted: false,
          opportunityId: { in: [...expandedOppIds] },
        },
        select: { id: true },
        take: 50_000,
      });
      for (const d of childDeals) expandedDealIds.add(d.id);
      if (childDeals.length) {
        relationshipImpact.push(
          `${childDeals.length} deal(s) depend on selected opportunities and will be soft-deleted.`,
        );
      }
    }

    if (selection.contacts && expandedContactIds.size > 0) {
      const dependentOpps = await prisma.enterpriseOpportunity.findMany({
        where: {
          organizationId: { in: organizationIds },
          isDeleted: false,
          primaryContactId: { in: [...expandedContactIds] },
        },
        select: { id: true },
        take: 50_000,
      });
      for (const o of dependentOpps) expandedOppIds.add(o.id);
      const dependentDeals = await prisma.enterpriseDeal.findMany({
        where: {
          organizationId: { in: organizationIds },
          isDeleted: false,
          OR: [
            { primaryContactId: { in: [...expandedContactIds] } },
            { opportunityId: { in: [...expandedOppIds] } },
          ],
        },
        select: { id: true },
        take: 50_000,
      });
      for (const d of dependentDeals) expandedDealIds.add(d.id);
      relationshipImpact.push(
        `Contact selection expands to ${dependentOpps.length} opportunity(ies) and ${dependentDeals.length} deal(s) to avoid FK orphans.`,
      );
    }

    const dealIdList = [...expandedDealIds];

    if (selection.contacts) {
      lines.push({
        entity: "contacts",
        matchedCount: expandedContactIds.size,
        action: "soft_delete",
      });
    }
    if (selection.opportunities) {
      lines.push({
        entity: "opportunities",
        matchedCount: expandedOppIds.size,
        action: "soft_delete",
      });
    }
    if (selection.deals || selection.contacts || selection.opportunities) {
      if (selection.deals || selection.contacts || selection.opportunities) {
        lines.push({
          entity: "deals",
          matchedCount: dealIdList.length,
          action: "soft_delete",
          dependentOf:
            selection.deals
              ? undefined
              : selection.opportunities
                ? "opportunities"
                : "contacts",
        });
      }
    }

    const childCount = async (
      countFn: () => Promise<number>,
      selected: boolean,
      entity: ProductionResetImpactLine["entity"],
    ) => {
      const include =
        selected || selection.deals || selection.opportunities || selection.contacts;
      if (!include) return;
      if (dealIdList.length === 0) {
        if (selected) lines.push({ entity, matchedCount: 0, action: "soft_delete" });
        return;
      }
      const count = await countFn();
      lines.push({
        entity,
        matchedCount: count,
        action: "soft_delete",
        dependentOf: selected ? undefined : "deals",
      });
    };

    await childCount(
      () =>
        prisma.enterpriseDealTask.count({
          where: { dealId: { in: dealIdList }, isDeleted: false },
        }),
      selection.tasks,
      "tasks",
    );
    await childCount(
      () =>
        prisma.enterpriseDealDocumentLink.count({
          where: { dealId: { in: dealIdList }, isDeleted: false },
        }),
      selection.documents,
      "documents",
    );
    await childCount(
      () =>
        prisma.enterpriseDealNote.count({
          where: { dealId: { in: dealIdList }, isDeleted: false },
        }),
      selection.notes,
      "notes",
    );
    await childCount(
      () =>
        prisma.enterpriseDealNotificationLink.count({
          where: { dealId: { in: dealIdList }, isDeleted: false },
        }),
      selection.notifications,
      "notifications",
    );
    await childCount(
      () =>
        prisma.enterpriseDealActivity.count({
          where: { dealId: { in: dealIdList }, isDeleted: false },
        }),
      selection.activities,
      "activities",
    );
    if (selection.timeline) {
      const timelineCount =
        dealIdList.length === 0
          ? 0
          : await prisma.enterpriseDealTimelineEvent.count({
              where: { dealId: { in: dealIdList } },
            });
      lines.push({
        entity: "timeline",
        matchedCount: timelineCount,
        action: "hard_delete",
        dependentOf: "deals",
      });
      warnings.push(
        "Timeline events are append-only — selected timeline rows are hard-deleted (not soft-deleted).",
      );
      orphanRisks.push(
        "Hard-deleting timeline removes immutable deal history for those deals permanently.",
      );
    }

    if (
      !selection.contacts &&
      !selection.opportunities &&
      !selection.deals &&
      !selection.tasks &&
      !selection.documents &&
      !selection.notes &&
      !selection.timeline &&
      !selection.notifications &&
      !selection.activities
    ) {
      warnings.push("No entities selected — impact is empty.");
    }

    const totalMatched = lines.reduce((s, l) => s + l.matchedCount, 0);
    return {
      generatedAt: new Date().toISOString(),
      mode,
      preset,
      selection,
      filters,
      lines,
      totalMatched,
      estimatedDurationMs: Math.max(50, totalMatched * MS_PER_RECORD),
      relationshipImpact,
      orphanRisks,
      warnings,
      recommendations,
    };
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) return false;
    return comparePassword(password, user.passwordHash);
  }

  async run(
    actor: { userId: string; email?: string; name?: string },
    request: ProductionResetExecuteRequest,
  ): Promise<ProductionResetExecutionResult> {
    this.assertPersistence();
    this.assertFeatureEnabled();

    const dryRun = request.mode !== "execute";
    const reason = (request.reason ?? "").trim();
    if (reason.length < 8) {
      throw Object.assign(new Error("Business reason is required (min 8 characters)."), {
        statusCode: 400,
        code: "REASON_REQUIRED",
      });
    }

    if (!dryRun) {
      if (!request.acknowledgedIrreversible) {
        throw Object.assign(new Error("Irreversible acknowledgement is required."), {
          statusCode: 400,
          code: "ACK_REQUIRED",
        });
      }
      if (request.typedConfirmation !== PRODUCTION_RESET_TYPED_CONFIRMATION) {
        throw Object.assign(
          new Error(`Typed confirmation must be exactly "${PRODUCTION_RESET_TYPED_CONFIRMATION}".`),
          { statusCode: 400, code: "CONFIRMATION_MISMATCH" },
        );
      }
      if (!request.password || !(await this.verifyPassword(actor.userId, request.password))) {
        throw Object.assign(new Error("Administrator password verification failed."), {
          statusCode: 401,
          code: "PASSWORD_INVALID",
        });
      }
    }

    const startedAt = new Date();
    const runId = randomUUID();
    const impact = await this.buildImpact(
      request.preset,
      request.selection,
      request.filters,
      dryRun ? "dry_run" : "execute",
    );

    const organizationIds = await resolveOrganizationIds();
    const deletionReason = `CO-ADMIN-004 Production Reset [${runId}]: ${reason}`;

    let countsRemoved: Record<string, number> = {};
    let errorMessage: string | null = null;
    let status: ProductionResetExecutionResult["status"] = "success";

    const runRow = await prisma.productionResetRun.create({
      data: {
        id: runId,
        organizationId: organizationIds[0] ?? null,
        mode: dryRun ? "dry_run" : "execute",
        status: "running",
        dryRun,
        actorUserId: actor.userId,
        actorEmail: actor.email ?? null,
        actorName: actor.name ?? null,
        reason,
        preset: request.preset,
        selection: impact.selection as unknown as Prisma.InputJsonValue,
        filters: impact.filters as unknown as Prisma.InputJsonValue,
        impact: impact as unknown as Prisma.InputJsonValue,
        startedAt,
      },
    });

    try {
      if (dryRun) {
        countsRemoved = Object.fromEntries(
          impact.lines.map((l) => [String(l.entity), l.matchedCount]),
        );
      } else {
        countsRemoved = await this.executeSoftDelete({
          actorId: actor.userId,
          organizationIds,
          selection: impact.selection,
          filters: impact.filters,
          deletionReason,
        });
      }

      const countsRemaining = await this.snapshotRemaining(organizationIds);
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      const report = this.buildReport({
        runId,
        dryRun,
        actor,
        completedAt,
        durationMs,
        countsRemoved,
        countsRemaining,
        warnings: impact.warnings,
        recommendations: impact.recommendations,
      });

      await prisma.productionResetRun.update({
        where: { id: runRow.id },
        data: {
          status: "success",
          countsRemoved: countsRemoved as Prisma.InputJsonValue,
          countsRemaining: countsRemaining as Prisma.InputJsonValue,
          warnings: impact.warnings as Prisma.InputJsonValue,
          durationMs,
          completedAt,
          reportSummary: report.summary,
          reportJson: report as unknown as Prisma.InputJsonValue,
        },
      });

      recordAdminGovernanceAction({
        actorUserId: actor.userId,
        actorName: actor.name,
        category: "organization_settings",
        changeType: "updated",
        impactScope: "organization",
        entityType: "production_reset_run",
        entityId: runId,
        entityLabel: dryRun ? "Production Reset Dry-Run" : "Production Reset Execute",
        previousValue: null,
        newValue: { countsRemoved, dryRun },
        justification: reason,
        relatedEngine: "CO-ADMIN-004 Production Reset",
      });

      return {
        runId,
        mode: dryRun ? "dry_run" : "execute",
        status,
        dryRun,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        reason,
        countsRemoved,
        countsRemaining,
        impact,
        report,
        warnings: impact.warnings,
        errorMessage: null,
      };
    } catch (err) {
      status = "failed";
      errorMessage = err instanceof Error ? err.message : "Production reset failed";
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      await prisma.productionResetRun.update({
        where: { id: runRow.id },
        data: {
          status: "failed",
          errorMessage,
          durationMs,
          completedAt,
        },
      });
      recordAdminGovernanceAction({
        actorUserId: actor.userId,
        actorName: actor.name,
        category: "organization_settings",
        changeType: "updated",
        impactScope: "organization",
        entityType: "production_reset_run",
        entityId: runId,
        entityLabel: "Production Reset Failed",
        previousValue: null,
        newValue: { errorMessage, dryRun },
        justification: reason,
        relatedEngine: "CO-ADMIN-004 Production Reset",
      });
      throw Object.assign(new Error(errorMessage), {
        statusCode: 500,
        code: "PRODUCTION_RESET_FAILED",
        runId,
      });
    }
  }

  private async executeSoftDelete(input: {
    actorId: string;
    organizationIds: string[];
    selection: ProductionResetEntitySelection;
    filters: ProductionResetFilters;
    deletionReason: string;
  }): Promise<Record<string, number>> {
    const { actorId, organizationIds, selection, filters, deletionReason } = input;
    const soft = softPayload(actorId, deletionReason);

    return prisma.$transaction(
      async (tx) => {
        const counts: Record<string, number> = {};
        const oppWhere = opportunityWhere(organizationIds, filters);
        const dWhere = dealWhere(organizationIds, filters);
        const cWhere = contactWhere(organizationIds, filters);

        let contactIds: string[] = [];
        let oppIds: string[] = [];
        let dealIds: string[] = [];

        if (selection.contacts) {
          const rows = await tx.ecmContact.findMany({
            where: cWhere,
            select: { id: true },
            take: 50_000,
          });
          contactIds = rows.map((r) => r.id);
        }
        if (selection.opportunities || selection.contacts) {
          const rows = await tx.enterpriseOpportunity.findMany({
            where: selection.opportunities
              ? oppWhere
              : {
                  organizationId: { in: organizationIds },
                  isDeleted: false,
                  primaryContactId: { in: contactIds },
                },
            select: { id: true },
            take: 50_000,
          });
          oppIds = rows.map((r) => r.id);
        }
        if (
          selection.deals ||
          selection.opportunities ||
          selection.contacts ||
          selection.tasks ||
          selection.documents ||
          selection.notes ||
          selection.timeline ||
          selection.notifications ||
          selection.activities
        ) {
          const rows = await tx.enterpriseDeal.findMany({
            where:
              selection.deals || !(selection.opportunities || selection.contacts)
                ? dWhere
                : {
                    organizationId: { in: organizationIds },
                    isDeleted: false,
                    OR: [
                      { opportunityId: { in: oppIds } },
                      ...(contactIds.length
                        ? [{ primaryContactId: { in: contactIds } }]
                        : []),
                    ],
                  },
            select: { id: true },
            take: 50_000,
          });
          dealIds = rows.map((r) => r.id);
          if (selection.opportunities && oppIds.length) {
            const child = await tx.enterpriseDeal.findMany({
              where: {
                organizationId: { in: organizationIds },
                isDeleted: false,
                opportunityId: { in: oppIds },
              },
              select: { id: true },
              take: 50_000,
            });
            dealIds = [...new Set([...dealIds, ...child.map((d) => d.id)])];
          }
        }

        const dealFilter = { dealId: { in: dealIds }, isDeleted: false as const };

        const softChildren = async (
          key: string,
          enabled: boolean,
          run: () => Promise<{ count: number }>,
        ) => {
          if (!enabled && !(selection.deals || selection.opportunities || selection.contacts)) {
            return;
          }
          if (!enabled && dealIds.length === 0) return;
          if (!(enabled || selection.deals || selection.opportunities || selection.contacts)) {
            return;
          }
          if (dealIds.length === 0) {
            counts[key] = 0;
            return;
          }
          const result = await run();
          counts[key] = result.count;
        };

        await softChildren("tasks", selection.tasks, () =>
          tx.enterpriseDealTask.updateMany({ where: dealFilter, data: soft }),
        );
        await softChildren("activities", selection.activities, () =>
          tx.enterpriseDealActivity.updateMany({ where: dealFilter, data: soft }),
        );
        await softChildren("notes", selection.notes, () =>
          tx.enterpriseDealNote.updateMany({ where: dealFilter, data: soft }),
        );
        await softChildren("documents", selection.documents, () =>
          tx.enterpriseDealDocumentLink.updateMany({ where: dealFilter, data: soft }),
        );
        await softChildren("notifications", selection.notifications, () =>
          tx.enterpriseDealNotificationLink.updateMany({ where: dealFilter, data: soft }),
        );

        if (selection.timeline && dealIds.length > 0) {
          const result = await tx.enterpriseDealTimelineEvent.deleteMany({
            where: { dealId: { in: dealIds } },
          });
          counts.timeline = result.count;
        }

        if (
          (selection.deals || selection.opportunities || selection.contacts) &&
          dealIds.length > 0
        ) {
          // Soft-delete remaining deal children to avoid operational orphans
          await tx.enterpriseDealParticipant.updateMany({
            where: dealFilter,
            data: soft,
          });
          await tx.enterpriseDealCounterpartyAssignment.updateMany({
            where: dealFilter,
            data: soft,
          });
          await tx.enterpriseDealAssignment.updateMany({
            where: dealFilter,
            data: soft,
          });
          if (!selection.tasks) {
            await tx.enterpriseDealTask.updateMany({ where: dealFilter, data: soft });
          }
          if (!selection.activities) {
            await tx.enterpriseDealActivity.updateMany({ where: dealFilter, data: soft });
          }
          if (!selection.notes) {
            await tx.enterpriseDealNote.updateMany({ where: dealFilter, data: soft });
          }
          if (!selection.documents) {
            await tx.enterpriseDealDocumentLink.updateMany({
              where: dealFilter,
              data: soft,
            });
          }
          if (!selection.notifications) {
            await tx.enterpriseDealNotificationLink.updateMany({
              where: dealFilter,
              data: soft,
            });
          }

          const dealResult = await tx.enterpriseDeal.updateMany({
            where: { id: { in: dealIds }, isDeleted: false },
            data: soft,
          });
          counts.deals = dealResult.count;
        }

        if ((selection.opportunities || selection.contacts) && oppIds.length > 0) {
          const oppResult = await tx.enterpriseOpportunity.updateMany({
            where: { id: { in: oppIds }, isDeleted: false },
            data: soft,
          });
          counts.opportunities = oppResult.count;
        }

        if (selection.contacts && contactIds.length > 0) {
          const contactResult = await tx.ecmContact.updateMany({
            where: { id: { in: contactIds }, isDeleted: false },
            data: soft,
          });
          counts.contacts = contactResult.count;
        }

        return counts;
      },
      { maxWait: 15_000, timeout: 120_000 },
    );
  }

  private async snapshotRemaining(
    organizationIds: string[],
  ): Promise<Record<string, number>> {
    if (organizationIds.length === 0) {
      return {
        contacts: 0,
        opportunities: 0,
        deals: 0,
        tasks: 0,
        documents: 0,
        notes: 0,
        timeline: 0,
        notifications: 0,
        activities: 0,
        users: 0,
        products: 0,
        lenders: 0,
      };
    }
    const org = { organizationId: { in: organizationIds } };
    const [
      contacts,
      opportunities,
      deals,
      tasks,
      documents,
      notes,
      timeline,
      notifications,
      activities,
      users,
      products,
      lenders,
    ] = await Promise.all([
      prisma.ecmContact.count({ where: { ...org, isDeleted: false } }),
      prisma.enterpriseOpportunity.count({ where: { ...org, isDeleted: false } }),
      prisma.enterpriseDeal.count({ where: { ...org, isDeleted: false } }),
      prisma.enterpriseDealTask.count({ where: { ...org, isDeleted: false } }),
      prisma.enterpriseDealDocumentLink.count({ where: { ...org, isDeleted: false } }),
      prisma.enterpriseDealNote.count({ where: { ...org, isDeleted: false } }),
      prisma.enterpriseDealTimelineEvent.count({ where: org }),
      prisma.enterpriseDealNotificationLink.count({
        where: { ...org, isDeleted: false },
      }),
      prisma.enterpriseDealActivity.count({ where: { ...org, isDeleted: false } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.enterpriseProduct.count({ where: { ...org, isDeleted: false } }),
      prisma.enterpriseLender.count({ where: { ...org, isDeleted: false } }),
    ]);
    return {
      contacts,
      opportunities,
      deals,
      tasks,
      documents,
      notes,
      timeline,
      notifications,
      activities,
      users,
      products,
      lenders,
    };
  }

  private buildReport(input: {
    runId: string;
    dryRun: boolean;
    actor: { userId: string; email?: string; name?: string };
    completedAt: Date;
    durationMs: number;
    countsRemoved: Record<string, number>;
    countsRemaining: Record<string, number>;
    warnings: string[];
    recommendations: string[];
  }): ProductionResetCutoverReport {
    const removedTotal = Object.values(input.countsRemoved).reduce((a, b) => a + b, 0);
    return {
      title: "Production Reset Report",
      summary: input.dryRun
        ? `Dry-run ${input.runId}: would affect approximately ${removedTotal} transactional record(s). No data was deleted.`
        : `Execute ${input.runId}: soft-deleted ${removedTotal} transactional record(s). Masters preserved.`,
      runId: input.runId,
      dryRun: input.dryRun,
      administrator: {
        userId: input.actor.userId,
        email: input.actor.email,
        name: input.actor.name,
      },
      executedAt: input.completedAt.toISOString(),
      durationMs: input.durationMs,
      entityCountsRemoved: input.countsRemoved,
      remainingCounts: input.countsRemaining,
      warnings: input.warnings,
      recommendations: input.recommendations,
      preservedMastersNote:
        "Users, roles, products, lenders, workflows, policies, organization settings, reference masters, and audit configuration were not modified.",
    };
  }

  async listRuns(limit = 25): Promise<ProductionResetRunSummary[]> {
    this.assertPersistence();
    const rows = await prisma.productionResetRun.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(100, Math.max(1, limit)),
    });
    return rows.map((r) => {
      const removed = (r.countsRemoved ?? {}) as Record<string, number>;
      const totalRemoved = Object.values(removed).reduce(
        (a, b) => a + (typeof b === "number" ? b : 0),
        0,
      );
      return {
        id: r.id,
        mode: r.mode as ProductionResetRunSummary["mode"],
        status: r.status as ProductionResetRunSummary["status"],
        dryRun: r.dryRun,
        actorUserId: r.actorUserId,
        actorEmail: r.actorEmail,
        reason: r.reason,
        durationMs: r.durationMs,
        createdAt: r.createdAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        totalRemoved: r.dryRun ? null : totalRemoved,
      };
    });
  }

  async getRun(runId: string) {
    this.assertPersistence();
    return prisma.productionResetRun.findUnique({ where: { id: runId } });
  }
}

export const productionResetService = new ProductionResetService();
