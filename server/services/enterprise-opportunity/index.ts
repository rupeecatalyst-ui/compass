/**
 * CO-ARCH-003 / ADR-018 Wave 1 — Opportunity Registry service.
 * Create Opportunity never creates a Deal (BI-1 / BI-3).
 * Draft create: identity only, no product uniqueness.
 * Uniqueness (Contact + Product) at Requirement Captured / Active / On Hold.
 */
import type { OpportunityLifecycleStatus, Prisma } from "@prisma/client";
import {
  DEFAULT_START_LOAN_JOURNEY_PRODUCT,
  formatProductDisplayLabel,
  resolveProductUniquenessKey,
} from "@/constants/opportunity-active-uniqueness";
import {
  assertLifecycleTransitionAllowed,
  hasRequirementCaptureFields,
  isDraftLifecycle,
  OPPORTUNITY_LIFECYCLE,
} from "@/constants/opportunity-lifecycle";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  enterpriseOpportunityRepository,
  type CreateEnterpriseOpportunityInput,
  type UpdateEnterpriseOpportunityInput,
} from "@server/repositories/enterprise-opportunity";
import { serializeOpportunity } from "@server/services/enterprise-opportunity/opportunity-serialize";
import {
  assertNonEmpty,
  assertOpportunityLifecycle,
  assertPriority,
  assertProductFamily,
  OpportunityActiveDuplicateError,
  OpportunityValidationError,
  parseOptionalAmount,
} from "@server/services/enterprise-opportunity/opportunity-validation";

const DEFAULT_REQUIREMENT_STAGE = "raw_lead";
const DRAFT_REQUIREMENT_STAGE = "draft";

function truthyOverride(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function truthyFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function wantDraftCreate(body: Record<string, unknown>): boolean {
  if (truthyFlag(body.createAsDraft)) return true;
  const lifecycle = assertOpportunityLifecycle(body.lifecycleStatus);
  return lifecycle === OPPORTUNITY_LIFECYCLE.DRAFT;
}

async function assertNoActiveDuplicate(args: {
  organizationId: string;
  primaryContactId: string;
  productUniquenessKey: string;
  productLabel: string | null;
  productCode: string | null;
  excludeOpportunityId?: string;
  allowOverride: boolean;
  overrideReason?: unknown;
}) {
  const existing = await enterpriseOpportunityRepository.findActiveForContactProduct(
    args.organizationId,
    args.primaryContactId,
    args.productUniquenessKey,
  );
  if (!existing) return;
  if (args.excludeOpportunityId && existing.id === args.excludeOpportunityId) return;

  const label = formatProductDisplayLabel({
    productId: existing.productId,
    productCode: existing.productCode,
    productLabel: existing.productLabel ?? args.productLabel,
  });

  if (!args.allowOverride) {
    throw new OpportunityActiveDuplicateError({
      message: `An active ${label} Opportunity already exists for this customer (${existing.opportunityNumber}).`,
      existingOpportunityId: existing.id,
      existingOpportunityNumber: existing.opportunityNumber,
      productLabel: label,
      existing: serializeOpportunity(existing) as unknown as Record<string, unknown>,
    });
  }

  const reason =
    typeof args.overrideReason === "string" ? args.overrideReason.trim() : "";
  if (reason.length < 8) {
    throw new OpportunityValidationError(
      "overrideReason is required (min 8 characters) when creating a duplicate active Opportunity.",
    );
  }
}

export class EnterpriseOpportunityService {
  private async orgId() {
    return resolvePilotOrganizationId();
  }

  /**
   * Find planning-active Opportunity for Contact + Product.
   * Used by Start Loan Journey before create (legacy path).
   */
  async findActiveForContactProduct(query: {
    primaryContactId: string;
    productId?: string | null;
    productCode?: string | null;
    productLabel?: string | null;
  }) {
    const organizationId = await this.orgId();
    const primaryContactId = assertNonEmpty(query.primaryContactId, "primaryContactId");
    const productUniquenessKey = resolveProductUniquenessKey({
      productId: query.productId,
      productCode: query.productCode,
      productLabel: query.productLabel,
    });
    if (!productUniquenessKey) return null;

    const row = await enterpriseOpportunityRepository.findActiveForContactProduct(
      organizationId,
      primaryContactId,
      productUniquenessKey,
    );
    return row ? serializeOpportunity(row) : null;
  }

  /**
   * Canonical Opportunity create.
   * - Legacy / explicit product create: uniqueness enforced (UX unchanged).
   * - ADR-018 Draft (`createAsDraft` / `lifecycleStatus: draft`): identity only,
   *   no product fabrication, no uniqueness check.
   */
  async createOpportunity(body: Record<string, unknown>, actorUserId: string) {
    const organizationId = await this.orgId();
    const primaryContactId = assertNonEmpty(body.primaryContactId, "primaryContactId");
    const asDraft = wantDraftCreate(body);

    const productFamily = assertProductFamily(
      body.productFamily ?? DEFAULT_START_LOAN_JOURNEY_PRODUCT.productFamily,
    );
    const requirementStage =
      typeof body.requirementStage === "string" && body.requirementStage.trim()
        ? body.requirementStage.trim()
        : asDraft
          ? DRAFT_REQUIREMENT_STAGE
          : DEFAULT_REQUIREMENT_STAGE;

    if (body.grossStage !== undefined || body.lenderId !== undefined || body.lender !== undefined) {
      throw new OpportunityValidationError(
        "Opportunity must not accept lender pipeline fields (grossStage / lenderId). Create a Deal after lender assignment.",
      );
    }

    let productId = body.productId ? String(body.productId) : null;
    let productCode = body.productCode ? String(body.productCode) : null;
    let productLabel = body.productLabel ? String(body.productLabel) : null;

    if (asDraft) {
      // ADR-018 / CAD-2026-001 — Draft is identity only; never fabricate product/amount.
      productId = productId?.trim() || null;
      productCode = productCode?.trim() || null;
      productLabel = productLabel?.trim() || null;
      if (productId || productCode || productLabel) {
        throw new OpportunityValidationError(
          "Draft Opportunity must not include product. Capture Product on Lead Information (Requirement Capture).",
        );
      }
      if (body.requestedAmount !== undefined && body.requestedAmount !== null && body.requestedAmount !== "") {
        throw new OpportunityValidationError(
          "Draft Opportunity must not include requestedAmount. Capture amount on Lead Information.",
        );
      }
    } else if (
      productFamily === "lending" &&
      !productId &&
      !productCode?.trim() &&
      !productLabel?.trim()
    ) {
      // Legacy Start Loan Journey path — UX unchanged until Wave 3.
      productCode = DEFAULT_START_LOAN_JOURNEY_PRODUCT.productCode;
      productLabel = DEFAULT_START_LOAN_JOURNEY_PRODUCT.productLabel;
    }

    const productUniquenessKey = asDraft
      ? null
      : resolveProductUniquenessKey({ productId, productCode, productLabel });

    if (!asDraft && !productUniquenessKey) {
      throw new OpportunityValidationError(
        "Product is required to create an Opportunity (Contact + Product uniqueness).",
      );
    }

    if (!asDraft && productUniquenessKey) {
      await assertNoActiveDuplicate({
        organizationId,
        primaryContactId,
        productUniquenessKey,
        productLabel,
        productCode,
        allowOverride: truthyOverride(body.allowActiveDuplicateOverride),
        overrideReason: body.overrideReason,
      });
    }

    const input: CreateEnterpriseOpportunityInput = {
      organizationId,
      productFamily,
      requirementStage,
      primaryContactId,
      actorUserId,
      lifecycleStatus: asDraft
        ? (OPPORTUNITY_LIFECYCLE.DRAFT as OpportunityLifecycleStatus)
        : ((assertOpportunityLifecycle(body.lifecycleStatus) ??
            OPPORTUNITY_LIFECYCLE.ACTIVE) as OpportunityLifecycleStatus),
      legacyLoanFileId: body.legacyLoanFileId ? String(body.legacyLoanFileId) : null,
      productId,
      productCode,
      productLabel,
      productUniquenessKey,
      transactionType: asDraft
        ? null
        : body.transactionType
          ? String(body.transactionType)
          : null,
      requirementSubStage: body.requirementSubStage
        ? String(body.requirementSubStage)
        : null,
      primaryContactName: body.primaryContactName ? String(body.primaryContactName) : null,
      primaryContactMobile: body.primaryContactMobile
        ? String(body.primaryContactMobile)
        : null,
      primaryContactEmail: body.primaryContactEmail
        ? String(body.primaryContactEmail)
        : null,
      companyId: body.companyId ? String(body.companyId) : null,
      employmentTypeCode: body.employmentTypeCode
        ? String(body.employmentTypeCode)
        : null,
      cityLabel: body.cityLabel ? String(body.cityLabel) : null,
      stateLabel: body.stateLabel ? String(body.stateLabel) : null,
      relationshipManagerUserId: body.relationshipManagerUserId
        ? String(body.relationshipManagerUserId)
        : null,
      relationshipManagerName: body.relationshipManagerName
        ? String(body.relationshipManagerName)
        : null,
      primaryOwnerUserId: body.primaryOwnerUserId
        ? String(body.primaryOwnerUserId)
        : actorUserId,
      priority: assertPriority(body.priority) ?? "medium",
      requestedAmount: asDraft
        ? null
        : body.requestedAmount !== undefined && body.requestedAmount !== null
          ? Number(body.requestedAmount)
          : null,
      currencyCode: body.currencyCode ? String(body.currencyCode) : "INR",
      snapshot: (body.snapshot as Prisma.InputJsonValue) ?? null,
      lendingExtension: (body.lendingExtension as Prisma.InputJsonValue) ?? null,
    };

    try {
      const created = await enterpriseOpportunityRepository.createOpportunity(input);
      return serializeOpportunity(created);
    } catch (err) {
      if (!asDraft && productUniquenessKey) {
        const again = await enterpriseOpportunityRepository.findActiveForContactProduct(
          organizationId,
          primaryContactId,
          productUniquenessKey,
        );
        const message = err instanceof Error ? err.message : String(err);
        if (again && /eopp_active_contact_product_uidx|unique/i.test(message)) {
          const label = formatProductDisplayLabel({
            productLabel: again.productLabel ?? productLabel,
            productCode: again.productCode ?? productCode,
          });
          throw new OpportunityActiveDuplicateError({
            message: `An active ${label} Opportunity already exists for this customer (${again.opportunityNumber}).`,
            existingOpportunityId: again.id,
            existingOpportunityNumber: again.opportunityNumber,
            productLabel: label,
            existing: serializeOpportunity(again) as unknown as Record<string, unknown>,
          });
        }
      }
      throw err;
    }
  }

  /**
   * ADR-018 Wave 1 — update Opportunity business fields (CAD provenance).
   * When Product + Required Amount are both present on a Draft, promotes to
   * Requirement Captured and enforces Contact+Product uniqueness.
   */
  async updateOpportunity(
    opportunityId: string,
    body: Record<string, unknown>,
    actorUserId: string,
  ) {
    const organizationId = await this.orgId();
    const existing = await enterpriseOpportunityRepository.requireOpportunity(
      organizationId,
      opportunityId,
    );

    if (body.grossStage !== undefined || body.lenderId !== undefined || body.lender !== undefined) {
      throw new OpportunityValidationError(
        "Opportunity must not accept lender pipeline fields (grossStage / lenderId).",
      );
    }

    const nextProductId =
      body.productId !== undefined
        ? body.productId
          ? String(body.productId)
          : null
        : existing.productId;
    const nextProductCode =
      body.productCode !== undefined
        ? body.productCode
          ? String(body.productCode)
          : null
        : existing.productCode;
    const nextProductLabel =
      body.productLabel !== undefined
        ? body.productLabel
          ? String(body.productLabel)
          : null
        : existing.productLabel;

    const parsedAmount = parseOptionalAmount(body.requestedAmount);
    const nextAmount =
      parsedAmount === undefined
        ? existing.requestedAmount != null
          ? Number(existing.requestedAmount.toString())
          : null
        : parsedAmount;

    const nextKey = resolveProductUniquenessKey({
      productId: nextProductId,
      productCode: nextProductCode,
      productLabel: nextProductLabel,
    });

    const captureReady = hasRequirementCaptureFields({
      productId: nextProductId,
      productCode: nextProductCode,
      productLabel: nextProductLabel,
      productUniquenessKey: nextKey,
      requestedAmount: nextAmount,
    });

    let nextLifecycle =
      assertOpportunityLifecycle(body.lifecycleStatus) ?? existing.lifecycleStatus;

    // Auto-promote Draft → Requirement Captured when gate fields are present.
    if (isDraftLifecycle(existing.lifecycleStatus) && captureReady) {
      if (
        !body.lifecycleStatus ||
        assertOpportunityLifecycle(body.lifecycleStatus) ===
          OPPORTUNITY_LIFECYCLE.REQUIREMENT_CAPTURED ||
        assertOpportunityLifecycle(body.lifecycleStatus) === OPPORTUNITY_LIFECYCLE.ACTIVE
      ) {
        nextLifecycle =
          assertOpportunityLifecycle(body.lifecycleStatus) === OPPORTUNITY_LIFECYCLE.ACTIVE
            ? OPPORTUNITY_LIFECYCLE.ACTIVE
            : OPPORTUNITY_LIFECYCLE.REQUIREMENT_CAPTURED;
      }
    }

    // Promoting to Active requires Requirement Capture fields.
    if (
      nextLifecycle === OPPORTUNITY_LIFECYCLE.ACTIVE &&
      !captureReady
    ) {
      throw new OpportunityValidationError(
        "Active Opportunity requires Product and Required Amount (Requirement Captured).",
      );
    }

    if (
      nextLifecycle === OPPORTUNITY_LIFECYCLE.REQUIREMENT_CAPTURED &&
      !captureReady
    ) {
      throw new OpportunityValidationError(
        "Requirement Captured requires Product and Required Amount.",
      );
    }

    const transition = assertLifecycleTransitionAllowed(
      existing.lifecycleStatus,
      nextLifecycle,
    );
    if (!transition.ok) {
      throw new OpportunityValidationError(transition.message);
    }

    // Uniqueness at Requirement Capture / Active / On Hold — not Draft.
    const willEnterUniqueness =
      nextLifecycle === OPPORTUNITY_LIFECYCLE.REQUIREMENT_CAPTURED ||
      nextLifecycle === OPPORTUNITY_LIFECYCLE.ACTIVE ||
      nextLifecycle === OPPORTUNITY_LIFECYCLE.ON_HOLD;

    if (willEnterUniqueness && nextKey) {
      await assertNoActiveDuplicate({
        organizationId,
        primaryContactId: existing.primaryContactId,
        productUniquenessKey: nextKey,
        productLabel: nextProductLabel,
        productCode: nextProductCode,
        excludeOpportunityId: existing.id,
        allowOverride: truthyOverride(body.allowActiveDuplicateOverride),
        overrideReason: body.overrideReason,
      });
    }

    const patch: UpdateEnterpriseOpportunityInput = {
      updatedBy: actorUserId,
      expectedRowVersion:
        body.rowVersion !== undefined && body.rowVersion !== null
          ? Number(body.rowVersion)
          : undefined,
    };

    if (body.productId !== undefined) patch.productId = nextProductId;
    if (body.productCode !== undefined) patch.productCode = nextProductCode;
    if (body.productLabel !== undefined) patch.productLabel = nextProductLabel;
    if (
      body.productId !== undefined ||
      body.productCode !== undefined ||
      body.productLabel !== undefined ||
      willEnterUniqueness
    ) {
      patch.productUniquenessKey = nextKey;
    }
    if (body.productFamily !== undefined) {
      patch.productFamily = assertProductFamily(body.productFamily);
    }
    if (body.transactionType !== undefined) {
      patch.transactionType = body.transactionType
        ? String(body.transactionType)
        : null;
    }
    if (body.requirementStage !== undefined) {
      patch.requirementStage = assertNonEmpty(body.requirementStage, "requirementStage");
    } else if (
      isDraftLifecycle(existing.lifecycleStatus) &&
      nextLifecycle !== OPPORTUNITY_LIFECYCLE.DRAFT
    ) {
      patch.requirementStage = DEFAULT_REQUIREMENT_STAGE;
    }
    if (body.requirementSubStage !== undefined) {
      patch.requirementSubStage = body.requirementSubStage
        ? String(body.requirementSubStage)
        : null;
    }
    if (nextLifecycle !== existing.lifecycleStatus) {
      patch.lifecycleStatus = nextLifecycle as OpportunityLifecycleStatus;
    }
    if (body.requestedAmount !== undefined) patch.requestedAmount = nextAmount;
    if (body.primaryContactName !== undefined) {
      patch.primaryContactName = body.primaryContactName
        ? String(body.primaryContactName)
        : null;
    }
    if (body.primaryContactMobile !== undefined) {
      patch.primaryContactMobile = body.primaryContactMobile
        ? String(body.primaryContactMobile)
        : null;
    }
    if (body.primaryContactEmail !== undefined) {
      patch.primaryContactEmail = body.primaryContactEmail
        ? String(body.primaryContactEmail)
        : null;
    }
    if (body.companyId !== undefined) {
      patch.companyId = body.companyId ? String(body.companyId) : null;
    }
    if (body.employmentTypeCode !== undefined) {
      patch.employmentTypeCode = body.employmentTypeCode
        ? String(body.employmentTypeCode)
        : null;
    }
    if (body.cityLabel !== undefined) {
      patch.cityLabel = body.cityLabel ? String(body.cityLabel) : null;
    }
    if (body.stateLabel !== undefined) {
      patch.stateLabel = body.stateLabel ? String(body.stateLabel) : null;
    }
    if (body.relationshipManagerName !== undefined) {
      patch.relationshipManagerName = body.relationshipManagerName
        ? String(body.relationshipManagerName)
        : null;
    }
    if (body.relationshipManagerUserId !== undefined) {
      patch.relationshipManagerUserId = body.relationshipManagerUserId
        ? String(body.relationshipManagerUserId)
        : null;
    }
    if (body.primaryOwnerUserId !== undefined) {
      patch.primaryOwnerUserId = body.primaryOwnerUserId
        ? String(body.primaryOwnerUserId)
        : null;
    }
    if (body.priority !== undefined) {
      patch.priority = assertPriority(body.priority) ?? existing.priority;
    }
    if (body.currencyCode !== undefined) {
      patch.currencyCode = String(body.currencyCode);
    }
    if (body.snapshot !== undefined) {
      patch.snapshot = body.snapshot as Prisma.InputJsonValue | null;
    }
    if (body.lendingExtension !== undefined) {
      patch.lendingExtension = body.lendingExtension as Prisma.InputJsonValue | null;
    }

    try {
      const updated = await enterpriseOpportunityRepository.updateOpportunity(
        organizationId,
        opportunityId,
        patch,
      );
      return serializeOpportunity(updated);
    } catch (err) {
      if (willEnterUniqueness && nextKey) {
        const message = err instanceof Error ? err.message : String(err);
        if (/eopp_active_contact_product_uidx|unique/i.test(message)) {
          const again = await enterpriseOpportunityRepository.findActiveForContactProduct(
            organizationId,
            existing.primaryContactId,
            nextKey,
          );
          if (again && again.id !== existing.id) {
            const label = formatProductDisplayLabel({
              productLabel: again.productLabel ?? nextProductLabel,
              productCode: again.productCode ?? nextProductCode,
            });
            throw new OpportunityActiveDuplicateError({
              message: `An active ${label} Opportunity already exists for this customer (${again.opportunityNumber}).`,
              existingOpportunityId: again.id,
              existingOpportunityNumber: again.opportunityNumber,
              productLabel: label,
              existing: serializeOpportunity(again) as unknown as Record<string, unknown>,
            });
          }
        }
      }
      throw err;
    }
  }

  async getOpportunity(opportunityId: string) {
    const organizationId = await this.orgId();
    const row = await enterpriseOpportunityRepository.requireOpportunity(
      organizationId,
      opportunityId,
    );
    return serializeOpportunity(row);
  }

  async searchOpportunities(query: {
    q?: string;
    primaryContactId?: string;
    requirementStage?: string;
    limit?: number;
    offset?: number;
  }) {
    const organizationId = await this.orgId();
    const result = await enterpriseOpportunityRepository.search(organizationId, query);
    return {
      ...result,
      items: result.items.map(serializeOpportunity),
    };
  }

  async listDealsForOpportunity(opportunityId: string) {
    const organizationId = await this.orgId();
    await enterpriseOpportunityRepository.requireOpportunity(organizationId, opportunityId);
    const { serializeDeal } = await import("@server/services/enterprise-deal/deal-serialize");
    const { enterpriseDealRepository } = await import(
      "@server/repositories/enterprise-deal"
    );
    const deals = await enterpriseDealRepository.listByOpportunity(
      organizationId,
      opportunityId,
    );
    return deals.map(serializeDeal);
  }

  /** After Move to Deal — Opportunity leaves planning-active uniqueness set. */
  async markConvertedToDeal(opportunityId: string, actorUserId: string) {
    const organizationId = await this.orgId();
    const row = await enterpriseOpportunityRepository.markConvertedToDeal(
      organizationId,
      opportunityId,
      actorUserId,
    );
    return serializeOpportunity(row);
  }

  async softDelete(opportunityId: string, actorUserId: string, reason?: string) {
    const organizationId = await this.orgId();
    const row = await enterpriseOpportunityRepository.softDelete(
      organizationId,
      opportunityId,
      actorUserId,
      reason,
    );
    return serializeOpportunity(row);
  }
}

export const enterpriseOpportunityService = new EnterpriseOpportunityService();
