import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
  withOpsRoute,
} from "@/lib/api/auth-route-utils";
import {
  GOVERNANCE_IMPORTANT_FIELDS,
  recordEntityChange,
  recordFieldAuditsFromDiff,
} from "@/lib/enterprise-governance";
import { recordBusinessAudit } from "@/lib/ops";
import type { ApiResponse } from "@/types/api";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import {
  assertOperationalStatus,
  assertPriority,
  assertRowVersion,
} from "@server/services/enterprise-deal/deal-validation";
import {
  enterpriseDealApiGuard,
  mapDealRouteError,
  parseInclude,
  resolveActorDisplayName,
} from "../_lib/route-utils";

type Ctx = { params: Promise<{ dealId: string }> };

function dealGovernanceSnapshot(deal: Record<string, unknown> | null | undefined) {
  if (!deal) return {};
  return {
    requestedAmount: deal.requestedAmount,
    approvedAmount: deal.approvedAmount,
    productId: deal.productId,
    productCode: deal.productCode,
    productLabel: deal.productLabel,
    subStage: deal.subStage,
    operationalStatus: deal.operationalStatus,
    lifecycleStatus: deal.lifecycleStatus,
    relationshipManagerUserId: deal.relationshipManagerUserId,
    relationshipManagerName: deal.relationshipManagerName,
    priority: deal.priority,
    status: deal.operationalStatus ?? deal.lifecycleStatus,
    lenderId: deal.lenderId,
    assignedLender: deal.lenderId,
  };
}

/** GET — Read Deal · PATCH — Update Deal · DELETE — Soft-delete Deal */
export async function GET(request: Request, context: Ctx) {
  const { dealId } = await context.params;
  return withOpsRoute(
    request,
    { module: "Deal", action: "read", endpoint: `/api/enterprise-deals/${dealId}` },
    async ({ correlationId }) => {
      try {
        enterpriseDealApiGuard();
        requireAccessToken(request);
        const include = parseInclude(new URL(request.url));
        const deal = await enterpriseDealService.getDeal(dealId, include);
        return successResponse(deal, 200, correlationId);
      } catch (err) {
        const mapped = mapDealRouteError(err);
        if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
          return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> }, {
            correlationId,
            endpoint: `/api/enterprise-deals/${dealId}`,
          });
        }
        return errorResponse(
          mapped.status,
          "DEAL_READ_FAILED",
          mapped.body.error?.message ?? "Read failed",
          undefined,
          { correlationId, module: "Deal", action: "read", endpoint: `/api/enterprise-deals/${dealId}` },
        );
      }
    },
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const { dealId } = await context.params;
  return withOpsRoute(
    request,
    { module: "Deal", action: "update", endpoint: `/api/enterprise-deals/${dealId}` },
    async ({ correlationId }) => {
      try {
        enterpriseDealApiGuard();
        const actor = requireAccessToken(request);
        const body = await request.json();
        let before: Record<string, unknown> = {};
        try {
          const existing = (await enterpriseDealService.getDeal(dealId, [])) as Record<
            string,
            unknown
          >;
          before = dealGovernanceSnapshot(existing);
        } catch {
          before = {};
        }
        const updated = await enterpriseDealService.updateDeal(dealId, {
          rowVersion: assertRowVersion(body.rowVersion),
          actorUserId: actor.userId,
          fileNumber: body.fileNumber,
          productId: body.productId,
          productCode: body.productCode,
          productLabel: body.productLabel,
          transactionType: body.transactionType,
          lifecyclePhase: body.lifecyclePhase,
          subStage: body.subStage,
          operationalStatus: body.operationalStatus
            ? assertOperationalStatus(body.operationalStatus)
            : undefined,
          primaryContactId: body.primaryContactId,
          primaryContactName: body.primaryContactName,
          primaryContactMobile: body.primaryContactMobile,
          primaryContactEmail: body.primaryContactEmail,
          companyId: body.companyId,
          relationshipManagerUserId: body.relationshipManagerUserId,
          relationshipManagerName: body.relationshipManagerName,
          primaryOwnerUserId: body.primaryOwnerUserId,
          priority: body.priority ? assertPriority(body.priority) : undefined,
          isUrgent: body.isUrgent,
          isDelayed: body.isDelayed,
          requestedAmount: body.requestedAmount,
          approvedAmount: body.approvedAmount,
          fulfilledAmount: body.fulfilledAmount,
          currencyCode: body.currencyCode,
          snapshot: body.snapshot,
          lendingExtension: body.lendingExtension,
          commercialTerms: body.commercialTerms,
          invoicePartyType: body.invoicePartyType ?? body.commissionPayeeType,
          invoicePartySpecify: body.invoicePartySpecify ?? body.commissionPayeeSpecify,
          invoicePartyContactId:
            body.invoicePartyContactId ?? body.commissionPayeeContactId,
          invoicePartyId: body.invoicePartyId ?? body.commissionAccountingPayeeId,
          lenderId: body.lenderId,
          lenderProgramId: body.lenderProgramId,
          reason: body.reason,
        });
        const after = dealGovernanceSnapshot(updated as Record<string, unknown>);
        recordFieldAuditsFromDiff({
          entityType: "EnterpriseDeal",
          entityId: dealId,
          changedBy: actor.userId,
          reason: body.reason ? String(body.reason) : null,
          correlationId,
          before,
          after,
          fields: GOVERNANCE_IMPORTANT_FIELDS,
        });
        recordBusinessAudit({
          actorUserId: actor.userId,
          module: "Deal",
          action: "Deal Updated",
          entityId: dealId,
          previousValue: null,
          newValue: "updated",
          result: "Success",
          correlationId,
        });
        return successResponse(updated, 200, correlationId);
      } catch (err) {
        const mapped = mapDealRouteError(err);
        if (
          mapped.status === 401 ||
          mapped.status === 404 ||
          mapped.status === 409 ||
          mapped.status === 503
        ) {
          return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> }, {
            correlationId,
            endpoint: `/api/enterprise-deals/${dealId}`,
          });
        }
        return errorResponse(
          mapped.status,
          mapped.body.error?.code ?? "DEAL_UPDATE_FAILED",
          mapped.body.error?.message ?? "Update failed",
          undefined,
          {
            correlationId,
            module: "Deal",
            action: "update",
            endpoint: `/api/enterprise-deals/${dealId}`,
          },
        );
      }
    },
  );
}

export async function DELETE(request: Request, context: Ctx) {
  const { dealId } = await context.params;
  return withOpsRoute(
    request,
    { module: "Deal", action: "soft_delete", endpoint: `/api/enterprise-deals/${dealId}` },
    async ({ correlationId }) => {
      try {
        enterpriseDealApiGuard();
        const actor = requireAccessToken(request);
        let reason: string | null = null;
        try {
          const body = await request.json();
          reason = body?.reason ? String(body.reason) : null;
        } catch {
          reason = null;
        }
        const updated = await enterpriseDealService.softDeleteDeal(
          dealId,
          actor.userId,
          await resolveActorDisplayName(actor.userId),
          reason,
        );
        recordEntityChange({
          entityType: "EnterpriseDeal",
          entityId: dealId,
          action: "Deleted",
          actorUserId: actor.userId,
          summary: "Enterprise Deal soft-deleted",
          previousValue: "active",
          newValue: "deleted",
          reason,
          correlationId,
        });
        recordBusinessAudit({
          actorUserId: actor.userId,
          module: "Deal",
          action: "Deal Deleted",
          entityId: dealId,
          previousValue: "active",
          newValue: "deleted",
          result: "Success",
          correlationId,
        });
        return successResponse(updated, 200, correlationId);
      } catch (err) {
        const mapped = mapDealRouteError(err);
        if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
          return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> }, {
            correlationId,
            endpoint: `/api/enterprise-deals/${dealId}`,
          });
        }
        return errorResponse(
          mapped.status,
          mapped.body.error?.code ?? "DEAL_DELETE_FAILED",
          mapped.body.error?.message ?? "Soft delete failed",
          undefined,
          {
            correlationId,
            module: "Deal",
            action: "soft_delete",
            endpoint: `/api/enterprise-deals/${dealId}`,
          },
        );
      }
    },
  );
}
