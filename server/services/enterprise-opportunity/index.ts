/**
 * CO-ARCH-003 / ADR-018 / CO-OPP-002 — Opportunity Registry service.
 * Create Opportunity never creates a Deal (BI-1 / BI-3).
 * Dialogue create: identity only, no product uniqueness (replaces retired Draft).
 * Uniqueness (Contact + Product) from Requirement Captured onward.
 */
import type { OpportunityLifecycleStatus, Prisma } from "@prisma/client";
import {
  DEFAULT_START_LOAN_JOURNEY_PRODUCT,
  formatProductDisplayLabel,
  resolveProductUniquenessKey,
} from "@/constants/opportunity-active-uniqueness";
import {
  assertOpportunityPrimaryBorrowerKind,
  OPPORTUNITY_PRIMARY_BORROWER_KIND,
} from "@/constants/opportunity-primary-borrower";
import {
  assertLifecycleTransitionAllowed,
  hasRequirementCaptureFields,
  isDialogueLifecycle,
  isUniquenessLifecycle,
  OPPORTUNITY_LIFECYCLE,
} from "@/constants/opportunity-lifecycle";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { prisma } from "@server/lib/prisma";
import {
  enterpriseOpportunityRepository,
  type CreateEnterpriseOpportunityInput,
  type UpdateEnterpriseOpportunityInput,
} from "@server/repositories/enterprise-opportunity";
import { resolveCommercialRevenueSharePercent } from "@/lib/enterprise-commercial-participation";
import { isWealthPartnerBusinessSource } from "@/constants/opportunity-business-source";
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
const DIALOGUE_REQUIREMENT_STAGE = "dialogue";

function truthyOverride(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function truthyFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

/** CO-OPP-002 — identity-only create (Dialogue). Accepts legacy createAsDraft flag. */
function wantDialogueCreate(body: Record<string, unknown>): boolean {
  if (truthyFlag(body.createAsDialogue) || truthyFlag(body.createAsDraft)) return true;
  const lifecycle = assertOpportunityLifecycle(body.lifecycleStatus);
  return (
    lifecycle === OPPORTUNITY_LIFECYCLE.DIALOGUE ||
    lifecycle === OPPORTUNITY_LIFECYCLE.DRAFT
  );
}

async function assertNoActiveDuplicate(args: {
  organizationId: string;
  primaryBorrowerKind?: "individual" | "company";
  primaryContactId?: string | null;
  companyId?: string | null;
  productUniquenessKey: string;
  productLabel: string | null;
  productCode: string | null;
  excludeOpportunityId?: string;
  allowOverride: boolean;
  overrideReason?: unknown;
}) {
  const borrowerKind = args.primaryBorrowerKind ?? "individual";
  const existing =
    borrowerKind === OPPORTUNITY_PRIMARY_BORROWER_KIND.COMPANY && args.companyId
      ? await enterpriseOpportunityRepository.findActiveForCompanyProduct(
          args.organizationId,
          args.companyId,
          args.productUniquenessKey,
        )
      : args.primaryContactId
        ? await enterpriseOpportunityRepository.findActiveForContactProduct(
            args.organizationId,
            args.primaryContactId,
            args.productUniquenessKey,
          )
        : null;
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
   * Find planning-active Opportunity for Company + Product (CO-DOM-001A).
   */
  async findActiveForCompanyProduct(query: {
    companyId: string;
    productId?: string | null;
    productCode?: string | null;
    productLabel?: string | null;
  }) {
    const organizationId = await this.orgId();
    const companyId = assertNonEmpty(query.companyId, "companyId");
    const productUniquenessKey = resolveProductUniquenessKey({
      productId: query.productId,
      productCode: query.productCode,
      productLabel: query.productLabel,
    });
    if (!productUniquenessKey) return null;

    const row = await enterpriseOpportunityRepository.findActiveForCompanyProduct(
      organizationId,
      companyId,
      productUniquenessKey,
    );
    return row ? serializeOpportunity(row) : null;
  }

  /**
   * Canonical Opportunity create.
   * - Legacy / explicit product create: uniqueness enforced (UX unchanged).
   * - CO-OPP-002 Dialogue (`createAsDialogue` / legacy `createAsDraft`): identity only,
   *   no product fabrication. Open Dialogue (or legacy Draft) for the same Contact/Company
   *   is reused (P1 idempotent Start) unless allowActiveDuplicateOverride is set.
   * - Never deletes / merges existing Opportunities.
   */
  async createOpportunity(body: Record<string, unknown>, actorUserId: string) {
    const organizationId = await this.orgId();
    const primaryBorrowerKind = assertOpportunityPrimaryBorrowerKind(body.primaryBorrowerKind);
    const isCompanyBorrower =
      primaryBorrowerKind === OPPORTUNITY_PRIMARY_BORROWER_KIND.COMPANY;
    const companyId =
      body.companyId !== undefined && body.companyId !== null
        ? String(body.companyId).trim() || null
        : null;
    const primaryContactId =
      body.primaryContactId !== undefined && body.primaryContactId !== null
        ? String(body.primaryContactId).trim() || null
        : null;

    if (isCompanyBorrower) {
      if (!companyId) {
        throw new OpportunityValidationError(
          "companyId is required when primary borrower is a Company.",
        );
      }
    } else if (!primaryContactId) {
      throw new OpportunityValidationError("primaryContactId is required for Individual borrower.");
    }

    const asDialogue = wantDialogueCreate(body);
    const allowOverride = truthyOverride(body.allowActiveDuplicateOverride);

    // P1 — Dialogue Start must be idempotent: reuse open Dialogue/legacy Draft; never mint a second.
    if (asDialogue && !allowOverride) {
      const lockKey = isCompanyBorrower
        ? `eopp-dialogue:company:${organizationId}:${companyId}`
        : `eopp-dialogue:contact:${organizationId}:${primaryContactId}`;
      await prisma.$executeRaw`SELECT pg_advisory_lock(872014, hashtext(${lockKey}))`;
      try {
        const openDialogue = isCompanyBorrower
          ? await enterpriseOpportunityRepository.findOpenDraftForCompany(
              organizationId,
              companyId!,
            )
          : await enterpriseOpportunityRepository.findOpenDraftForContact(
              organizationId,
              primaryContactId!,
            );
        if (openDialogue) {
          return serializeOpportunity(openDialogue);
        }
        return await this.createOpportunityUnlocked(body, actorUserId, {
          organizationId,
          primaryBorrowerKind,
          isCompanyBorrower,
          companyId,
          primaryContactId,
          asDialogue,
          allowOverride,
        });
      } finally {
        await prisma.$executeRaw`SELECT pg_advisory_unlock(872014, hashtext(${lockKey}))`;
      }
    }

    return this.createOpportunityUnlocked(body, actorUserId, {
      organizationId,
      primaryBorrowerKind,
      isCompanyBorrower,
      companyId,
      primaryContactId,
      asDialogue,
      allowOverride,
    });
  }

  /** Internal create after optional dialogue-idempotency lock. */
  private async createOpportunityUnlocked(
    body: Record<string, unknown>,
    actorUserId: string,
    ctx: {
      organizationId: string;
      primaryBorrowerKind: ReturnType<typeof assertOpportunityPrimaryBorrowerKind>;
      isCompanyBorrower: boolean;
      companyId: string | null;
      primaryContactId: string | null;
      asDialogue: boolean;
      allowOverride: boolean;
    },
  ) {
    const {
      organizationId,
      primaryBorrowerKind,
      isCompanyBorrower,
      companyId,
      primaryContactId,
      asDialogue,
      allowOverride,
    } = ctx;

    const productFamily = assertProductFamily(
      body.productFamily ?? DEFAULT_START_LOAN_JOURNEY_PRODUCT.productFamily,
    );
    const requirementStage =
      typeof body.requirementStage === "string" && body.requirementStage.trim()
        ? body.requirementStage.trim()
        : asDialogue
          ? DIALOGUE_REQUIREMENT_STAGE
          : DEFAULT_REQUIREMENT_STAGE;

    if (body.grossStage !== undefined || body.lenderId !== undefined || body.lender !== undefined) {
      throw new OpportunityValidationError(
        "Opportunity must not accept lender pipeline fields (grossStage / lenderId). Create a Deal after lender assignment.",
      );
    }

    let productId = body.productId ? String(body.productId) : null;
    let productCode = body.productCode ? String(body.productCode) : null;
    let productLabel = body.productLabel ? String(body.productLabel) : null;

    if (asDialogue) {
      // CO-OPP-002 / CAD-2026-001 — Dialogue is identity only; never fabricate product/amount.
      productId = productId?.trim() || null;
      productCode = productCode?.trim() || null;
      productLabel = productLabel?.trim() || null;
      if (productId || productCode || productLabel) {
        throw new OpportunityValidationError(
          "Dialogue Opportunity must not include product. Capture Product on Lead Information (Requirement Capture).",
        );
      }
      if (body.requestedAmount !== undefined && body.requestedAmount !== null && body.requestedAmount !== "") {
        throw new OpportunityValidationError(
          "Dialogue Opportunity must not include requestedAmount. Capture amount on Lead Information.",
        );
      }
    } else if (
      productFamily === "lending" &&
      !productId &&
      !productCode?.trim() &&
      !productLabel?.trim()
    ) {
      productCode = DEFAULT_START_LOAN_JOURNEY_PRODUCT.productCode;
      productLabel = DEFAULT_START_LOAN_JOURNEY_PRODUCT.productLabel;
    }

    const productUniquenessKey = asDialogue
      ? null
      : resolveProductUniquenessKey({ productId, productCode, productLabel });

    if (!asDialogue && !productUniquenessKey) {
      throw new OpportunityValidationError(
        "Product is required to create an Opportunity (Contact + Product uniqueness).",
      );
    }

    if (!asDialogue && productUniquenessKey) {
      await assertNoActiveDuplicate({
        organizationId,
        primaryBorrowerKind,
        primaryContactId,
        companyId,
        productUniquenessKey,
        productLabel,
        productCode,
        allowOverride,
        overrideReason: body.overrideReason,
      });
    }

    const input: CreateEnterpriseOpportunityInput = {
      organizationId,
      productFamily,
      requirementStage,
      primaryBorrowerKind,
      primaryContactId,
      actorUserId,
      lifecycleStatus: asDialogue
        ? (OPPORTUNITY_LIFECYCLE.DIALOGUE as OpportunityLifecycleStatus)
        : ((assertOpportunityLifecycle(body.lifecycleStatus) ??
            OPPORTUNITY_LIFECYCLE.IN_PROGRESS) as OpportunityLifecycleStatus),
      legacyLoanFileId: body.legacyLoanFileId ? String(body.legacyLoanFileId) : null,
      productId,
      productCode,
      productLabel,
      productUniquenessKey,
      transactionType: asDialogue
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
      companyId,
      companyName: body.companyName ? String(body.companyName) : null,
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
      requestedAmount: asDialogue
        ? null
        : body.requestedAmount !== undefined && body.requestedAmount !== null
          ? Number(body.requestedAmount)
          : null,
      currencyCode: body.currencyCode ? String(body.currencyCode) : "INR",
      snapshot: (body.snapshot as Prisma.InputJsonValue) ?? null,
      lendingExtension: (body.lendingExtension as Prisma.InputJsonValue) ?? null,
      sourceCode: body.sourceCode ? String(body.sourceCode).trim() : null,
      sourceContactId: body.sourceContactId ? String(body.sourceContactId).trim() : null,
      sourceContactName: body.sourceContactName
        ? String(body.sourceContactName).trim()
        : null,
      sourceWealthPartnerId: body.sourceWealthPartnerId
        ? String(body.sourceWealthPartnerId).trim()
        : null,
      participationRole: body.participationRole
        ? String(body.participationRole).trim()
        : null,
      sourceCampaignLabel: body.sourceCampaignLabel
        ? String(body.sourceCampaignLabel).trim()
        : null,
      commercialRevenueSharePercent: await resolveOpportunityCommercialShare({
        organizationId,
        sourceCode: body.sourceCode ? String(body.sourceCode).trim() : null,
        sourceWealthPartnerId: body.sourceWealthPartnerId
          ? String(body.sourceWealthPartnerId).trim()
          : null,
        participationRole: body.participationRole
          ? String(body.participationRole).trim()
          : null,
      }),
    };

    try {
      const created = await enterpriseOpportunityRepository.createOpportunity(input);
      // CO-NOTIFICATION-001 — fan-out (actor excluded; manager/admins + partner ownership)
      try {
        const { enterpriseNotificationService } = await import(
          "@server/services/enterprise-notification/enterprise-notification.service"
        );
        const { eneEventTitle } = await import(
          "@/constants/enterprise-notification-engine"
        );
        const customerName =
          (created as { primaryContactName?: string | null }).primaryContactName ||
          "Customer";
        const product =
          (created as { productLabel?: string | null }).productLabel ||
          (created as { productCode?: string | null }).productCode ||
          "Product";
        const reqAmt = (created as { requiredAmount?: number | null }).requiredAmount;
        const amount =
          reqAmt != null && Number.isFinite(Number(reqAmt))
            ? `₹${Number(reqAmt).toLocaleString("en-IN")}`
            : null;
        const actor = actorUserId
          ? await prisma.user.findUnique({
              where: { id: actorUserId },
              select: { firstName: true, lastName: true },
            })
          : null;
        const actorName = actor
          ? [actor.firstName, actor.lastName].filter(Boolean).join(" ")
          : null;
        const partnerId =
          (created as { sourceWealthPartnerId?: string | null }).sourceWealthPartnerId ||
          (body.sourceWealthPartnerId
            ? String(body.sourceWealthPartnerId).trim()
            : null);
        await enterpriseNotificationService.fanOutBestEffort({
          organizationId,
          eventType: "OPPORTUNITY_CREATED",
          sourceEventId: created.id,
          sourceSystem: "opportunity",
          title: eneEventTitle("OPPORTUNITY_CREATED"),
          body: [customerName, product, amount].filter(Boolean).join(" · "),
          description: actorName ? `Created by ${actorName}` : null,
          actorUserId,
          actorName,
          opportunityId: created.id,
          contactId: created.primaryContactId ?? null,
          customerName,
          productLabel: product,
          amountLabel: amount,
          href: `/opportunities?opportunityId=${encodeURIComponent(created.id)}`,
          sourceWealthPartnerId: partnerId,
          actorIsPartner: Boolean(
            body.createdViaPartnerGateway === true ||
              body.partnerActor === true,
          ),
        });
      } catch {
        /* fail-open */
      }
      return serializeOpportunity(created);
    } catch (err) {
      if (!asDialogue && productUniquenessKey) {
        const again =
          primaryBorrowerKind === OPPORTUNITY_PRIMARY_BORROWER_KIND.COMPANY && companyId
            ? await enterpriseOpportunityRepository.findActiveForCompanyProduct(
                organizationId,
                companyId,
                productUniquenessKey,
              )
            : primaryContactId
              ? await enterpriseOpportunityRepository.findActiveForContactProduct(
                  organizationId,
                  primaryContactId,
                  productUniquenessKey,
                )
              : null;
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
   * P1 — Latest open Draft for Contact (Start Loan Journey reuse probe).
   */
  async findOpenDraftForContact(query: { primaryContactId: string }) {
    const organizationId = await this.orgId();
    const primaryContactId = assertNonEmpty(query.primaryContactId, "primaryContactId");
    const row = await enterpriseOpportunityRepository.findOpenDraftForContact(
      organizationId,
      primaryContactId,
    );
    return row ? serializeOpportunity(row) : null;
  }

  /**
   * P1 — Latest open Draft for Company.
   */
  async findOpenDraftForCompany(query: { companyId: string }) {
    const organizationId = await this.orgId();
    const companyId = assertNonEmpty(query.companyId, "companyId");
    const row = await enterpriseOpportunityRepository.findOpenDraftForCompany(
      organizationId,
      companyId,
    );
    return row ? serializeOpportunity(row) : null;
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

    // Auto-promote Dialogue (or legacy Draft) → Requirement Captured when gate fields are present.
    if (isDialogueLifecycle(existing.lifecycleStatus) && captureReady) {
      if (
        !body.lifecycleStatus ||
        assertOpportunityLifecycle(body.lifecycleStatus) ===
          OPPORTUNITY_LIFECYCLE.REQUIREMENT_CAPTURED ||
        assertOpportunityLifecycle(body.lifecycleStatus) ===
          OPPORTUNITY_LIFECYCLE.IN_PROGRESS ||
        assertOpportunityLifecycle(body.lifecycleStatus) === OPPORTUNITY_LIFECYCLE.ACTIVE
      ) {
        const requested = assertOpportunityLifecycle(body.lifecycleStatus);
        nextLifecycle =
          requested === OPPORTUNITY_LIFECYCLE.IN_PROGRESS ||
          requested === OPPORTUNITY_LIFECYCLE.ACTIVE
            ? OPPORTUNITY_LIFECYCLE.IN_PROGRESS
            : OPPORTUNITY_LIFECYCLE.REQUIREMENT_CAPTURED;
      }
    }

    // After Requirement Captured, enrichment / processing → In Progress (unless explicit hold/cancel).
    if (
      (nextLifecycle === OPPORTUNITY_LIFECYCLE.REQUIREMENT_CAPTURED ||
        existing.lifecycleStatus === OPPORTUNITY_LIFECYCLE.REQUIREMENT_CAPTURED) &&
      captureReady &&
      body.markInProgress === true
    ) {
      nextLifecycle = OPPORTUNITY_LIFECYCLE.IN_PROGRESS;
    }

    if (
      (nextLifecycle === OPPORTUNITY_LIFECYCLE.IN_PROGRESS ||
        nextLifecycle === OPPORTUNITY_LIFECYCLE.ACTIVE) &&
      !captureReady
    ) {
      throw new OpportunityValidationError(
        "In Progress Opportunity requires Product and Required Amount (Requirement Captured).",
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

    // Uniqueness from Requirement Captured onward — not Dialogue.
    const willEnterUniqueness = isUniquenessLifecycle(nextLifecycle);

    if (willEnterUniqueness && nextKey) {
      await assertNoActiveDuplicate({
        organizationId,
        primaryBorrowerKind: existing.primaryBorrowerKind,
        primaryContactId: existing.primaryContactId,
        companyId: existing.companyId,
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
      isDialogueLifecycle(existing.lifecycleStatus) &&
      !isDialogueLifecycle(nextLifecycle)
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
    if (body.sourceCode !== undefined) {
      patch.sourceCode = body.sourceCode ? String(body.sourceCode).trim() : null;
    }
    if (body.sourceContactId !== undefined) {
      patch.sourceContactId = body.sourceContactId
        ? String(body.sourceContactId).trim()
        : null;
    }
    if (body.sourceContactName !== undefined) {
      patch.sourceContactName = body.sourceContactName
        ? String(body.sourceContactName).trim()
        : null;
    }
    if (body.sourceWealthPartnerId !== undefined) {
      patch.sourceWealthPartnerId = body.sourceWealthPartnerId
        ? String(body.sourceWealthPartnerId).trim()
        : null;
    }
    if (body.participationRole !== undefined) {
      patch.participationRole = body.participationRole
        ? String(body.participationRole).trim()
        : null;
    }
    if (body.sourceCampaignLabel !== undefined) {
      patch.sourceCampaignLabel = body.sourceCampaignLabel
        ? String(body.sourceCampaignLabel).trim()
        : null;
    }

    const nextSourceCode =
      patch.sourceCode !== undefined ? patch.sourceCode : existing.sourceCode;
    const nextWpId =
      patch.sourceWealthPartnerId !== undefined
        ? patch.sourceWealthPartnerId
        : existing.sourceWealthPartnerId;
    const nextRole =
      patch.participationRole !== undefined
        ? patch.participationRole
        : existing.participationRole;
    if (
      body.sourceCode !== undefined ||
      body.sourceWealthPartnerId !== undefined ||
      body.participationRole !== undefined ||
      body.commercialRevenueSharePercent !== undefined
    ) {
      patch.commercialRevenueSharePercent =
        body.commercialRevenueSharePercent !== undefined
          ? body.commercialRevenueSharePercent == null
            ? null
            : Number(body.commercialRevenueSharePercent)
          : await resolveOpportunityCommercialShare({
              organizationId,
              sourceCode: nextSourceCode,
              sourceWealthPartnerId: nextWpId,
              participationRole: nextRole,
            });
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
          const again =
            existing.primaryBorrowerKind === "company" && existing.companyId
              ? await enterpriseOpportunityRepository.findActiveForCompanyProduct(
                  organizationId,
                  existing.companyId,
                  nextKey,
                )
              : existing.primaryContactId
                ? await enterpriseOpportunityRepository.findActiveForContactProduct(
                    organizationId,
                    existing.primaryContactId,
                    nextKey,
                  )
                : null;
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
    companyId?: string;
    requirementStage?: string;
    sourceCode?: string;
    sourceBucket?: "direct" | "channel_partner" | "referral" | "other";
    opportunityIds?: string[];
    freshLoginToday?: boolean;
    /** CO-C1-DASH-001 — filter by Opportunity createdAt (not updatedAt) */
    createdFrom?: Date | string;
    createdTo?: Date | string;
    orderBy?: "updatedAt" | "createdAt";
    limit?: number;
    offset?: number;
  }) {
    const organizationId = await this.orgId();
    let opportunityIds = query.opportunityIds;
    if (query.freshLoginToday) {
      opportunityIds = await this.resolveFreshLoginOpportunityIds(organizationId);
    }
    const result = await enterpriseOpportunityRepository.search(organizationId, {
      ...query,
      opportunityIds,
    });
    return {
      ...result,
      items: result.items.map(serializeOpportunity),
    };
  }

  /**
   * CO-UX-006 — Distinct Opportunities that reached Login (via Deal stage) today.
   * Counts Opportunities — never lender/deal rows.
   */
  async resolveFreshLoginOpportunityIds(organizationId?: string): Promise<string[]> {
    const orgId = organizationId ?? (await this.orgId());
    const { FRESH_LOGIN_DEAL_STAGES } = await import(
      "@/constants/opportunity-business-source"
    );
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const deals = await prisma.enterpriseDeal.findMany({
      where: {
        organizationId: orgId,
        isDeleted: false,
        opportunityId: { not: null },
        grossStage: { in: [...FRESH_LOGIN_DEAL_STAGES] },
        stageEnteredAt: { gte: start, lte: end },
      },
      select: { opportunityId: true },
      distinct: ["opportunityId"],
    });
    return deals
      .map((d) => d.opportunityId)
      .filter((id): id is string => Boolean(id));
  }

  async getFreshLoginKpis() {
    const { resolveFreshLoginKpiBucket } = await import(
      "@/constants/opportunity-business-source"
    );
    const organizationId = await this.orgId();
    const opportunityIds = await this.resolveFreshLoginOpportunityIds(organizationId);
    if (opportunityIds.length === 0) {
      return {
        asOf: new Date().toISOString(),
        definition:
          "Fresh Login = Opportunity reaching Login stage today (distinct Opportunities; Deal login stages).",
        counts: {
          direct: 0,
          channel_partner: 0,
          referral: 0,
          other: 0,
          total: 0,
        },
        opportunityIds: [] as string[],
      };
    }

    const rows = await prisma.enterpriseOpportunity.findMany({
      where: {
        organizationId,
        isDeleted: false,
        id: { in: opportunityIds },
      },
      select: { id: true, sourceCode: true },
    });

    const counts = {
      direct: 0,
      channel_partner: 0,
      referral: 0,
      other: 0,
      total: rows.length,
    };
    for (const row of rows) {
      const bucket = resolveFreshLoginKpiBucket(row.sourceCode);
      counts[bucket] += 1;
    }

    return {
      asOf: new Date().toISOString(),
      definition:
        "Fresh Login = Opportunity reaching Login stage today (distinct Opportunities; Deal login stages).",
      counts,
      opportunityIds: rows.map((r) => r.id),
    };
  }

  /**
   * Today's New Opportunities — created today (includes Dialogue).
   * Grouped by Business Source. Independent from Fresh Logins and Deal counts.
   */
  async getTodayNewOpportunityKpis() {
    const { resolveFreshLoginKpiBucket } = await import(
      "@/constants/opportunity-business-source"
    );
    const { DASHBOARD_TODAY_NEW_OPPORTUNITIES_DEFINITION } = await import(
      "@/constants/opportunity-creation-business-rules"
    );
    const organizationId = await this.orgId();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const rows = await prisma.enterpriseOpportunity.findMany({
      where: {
        organizationId,
        isDeleted: false,
        createdAt: { gte: start, lte: end },
      },
      select: { id: true, sourceCode: true },
    });

    const counts = {
      direct: 0,
      channel_partner: 0,
      referral: 0,
      other: 0,
      total: rows.length,
    };
    for (const row of rows) {
      const bucket = resolveFreshLoginKpiBucket(row.sourceCode);
      counts[bucket] += 1;
    }

    return {
      asOf: new Date().toISOString(),
      definition: DASHBOARD_TODAY_NEW_OPPORTUNITIES_DEFINITION,
      counts,
      opportunityIds: rows.map((r) => r.id),
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

  /** After first Deal created — Opportunity → Converted to Deal. */
  async markConvertedToDeal(opportunityId: string, actorUserId: string) {
    const organizationId = await this.orgId();
    const row = await enterpriseOpportunityRepository.markConvertedToDeal(
      organizationId,
      opportunityId,
      actorUserId,
    );
    return serializeOpportunity(row);
  }

  /**
   * CO-OPP-002 — Sync Opportunity lifecycle from child Deal stages.
   * Does not migrate historical terminal Opportunities.
   */
  async syncLifecycleFromDeals(opportunityId: string, actorUserId: string) {
    const organizationId = await this.orgId();
    const existing = await enterpriseOpportunityRepository.requireOpportunity(
      organizationId,
      opportunityId,
    );
    const current = (existing.lifecycleStatus || "").toLowerCase();
    if (["completed", "won", "lost", "cancelled", "archived"].includes(current)) {
      return serializeOpportunity(existing);
    }

    const { enterpriseDealRepository } = await import(
      "@server/repositories/enterprise-deal"
    );
    const deals = await enterpriseDealRepository.listByOpportunity(
      organizationId,
      opportunityId,
    );
    if (deals.length === 0) {
      return serializeOpportunity(existing);
    }

    const stages = deals.map((d) => (d.grossStage || "").toLowerCase());
    const anyDisbursed = stages.some(
      (s) =>
        s === "disbursed" ||
        s === "won" ||
        s === "partially_disbursed" ||
        s.includes("disburs"),
    );
    const allLost =
      deals.length > 0 &&
      stages.every((s) => s === "lost" || s === "cancelled" || s === "rejected");

    if (anyDisbursed) {
      const row = await enterpriseOpportunityRepository.applyLifecycleStatus(
        organizationId,
        opportunityId,
        "completed",
        actorUserId,
        { closedAt: new Date(), fulfilmentStatus: "fulfilled" },
      );
      return serializeOpportunity(row);
    }

    if (allLost) {
      const row = await enterpriseOpportunityRepository.applyLifecycleStatus(
        organizationId,
        opportunityId,
        "lost",
        actorUserId,
        { closedAt: new Date(), fulfilmentStatus: "abandoned" },
      );
      return serializeOpportunity(row);
    }

    if (current !== "converted_to_deal") {
      const row = await enterpriseOpportunityRepository.markConvertedToDeal(
        organizationId,
        opportunityId,
        actorUserId,
      );
      return serializeOpportunity(row);
    }

    return serializeOpportunity(existing);
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

async function resolveOpportunityCommercialShare(input: {
  organizationId: string;
  sourceCode: string | null | undefined;
  sourceWealthPartnerId: string | null | undefined;
  participationRole: string | null | undefined;
}): Promise<number | null> {
  if (!isWealthPartnerBusinessSource(input.sourceCode)) return null;
  if (!input.sourceWealthPartnerId?.trim() || !input.participationRole?.trim()) {
    return null;
  }
  const partner = await prisma.enterpriseWealthPartner.findFirst({
    where: {
      id: input.sourceWealthPartnerId.trim(),
      organizationId: input.organizationId,
      isDeleted: false,
    },
    select: {
      commercialReferralSharePercent: true,
      commercialSoleExecutorSharePercent: true,
      commercialJointExecutorSharePercent: true,
      commercialStatus: true,
      commercialEffectiveFrom: true,
    },
  });
  return resolveCommercialRevenueSharePercent(partner, input.participationRole);
}

export const enterpriseOpportunityService = new EnterpriseOpportunityService();
