/**
 * CO-ARCH-002-W2 — Enterprise Deal API service (business operations; no UI).
 */
import type { Prisma } from "@prisma/client";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  enterpriseDealRepository,
  type CreateEnterpriseDealInput,
} from "@server/repositories/enterprise-deal";
import {
  serializeActivity,
  serializeCounterparty,
  serializeDeal,
  serializeDocumentLink,
  serializeSnapshot,
  serializeTask,
  serializeTimelineEvent,
} from "@server/services/enterprise-deal/deal-serialize";
import {
  DealConflictError,
  DealNotFoundError,
  DealValidationError,
  assertCounterpartyType,
  assertDocumentStatus,
  assertLifecycleStatus,
  assertNonEmpty,
  assertOperationalStatus,
  assertPriority,
  assertProductFamily,
  assertRowVersion,
  validateStageTransition,
} from "@server/services/enterprise-deal/deal-validation";
import {
  assertInvoicePartyForDealStage,
  isValidInvoicePartyType,
} from "@server/services/enterprise-deal/deal-invoice-party";
import { prisma } from "@server/lib/prisma";
import type {
  CreateActivityInput,
  CreateCounterpartyInput,
  CreateDocumentLinkInput,
  CreateTaskInput,
  DealIncludeOption,
  EnterpriseDealSearchQuery,
  PipelineUpdateInput,
  TransitionDealInput,
  UpdateActivityInput,
  UpdateCounterpartyInput,
  UpdateDocumentLinkInput,
  UpdateEnterpriseDealInput,
  UpdateTaskInput,
} from "@/types/enterprise-deal";

function parseDate(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new DealValidationError("Invalid date value");
  return d;
}

export class EnterpriseDealService {
  private async orgId() {
    return resolvePilotOrganizationId();
  }

  async createDeal(
    body: Record<string, unknown>,
    actorUserId: string,
  ) {
    const organizationId = await this.orgId();
    const opportunityId = assertNonEmpty(body.opportunityId, "opportunityId");
    const lenderId = assertNonEmpty(body.lenderId, "lenderId");
    const productFamily = assertProductFamily(body.productFamily);
    const grossStage = assertNonEmpty(body.grossStage, "grossStage");

    const input: CreateEnterpriseDealInput = {
      organizationId,
      opportunityId,
      lenderId,
      lenderProgramId: body.lenderProgramId ? String(body.lenderProgramId) : null,
      productFamily,
      grossStage,
      actorUserId,
      legacyLoanFileId: body.legacyLoanFileId ? String(body.legacyLoanFileId) : null,
      fileNumber: body.fileNumber ? String(body.fileNumber) : null,
      productId: body.productId ? String(body.productId) : null,
      productCode: body.productCode ? String(body.productCode) : null,
      productLabel: body.productLabel ? String(body.productLabel) : null,
      transactionType: body.transactionType ? String(body.transactionType) : null,
      lifecyclePhase: body.lifecyclePhase ? String(body.lifecyclePhase) : null,
      subStage: body.subStage ? String(body.subStage) : null,
      primaryContactId: body.primaryContactId ? String(body.primaryContactId) : null,
      primaryContactName: body.primaryContactName ? String(body.primaryContactName) : null,
      primaryContactMobile: body.primaryContactMobile
        ? String(body.primaryContactMobile)
        : null,
      primaryContactEmail: body.primaryContactEmail
        ? String(body.primaryContactEmail)
        : null,
      companyId: body.companyId ? String(body.companyId) : null,
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
      requestedAmount:
        body.requestedAmount !== undefined && body.requestedAmount !== null
          ? Number(body.requestedAmount)
          : null,
      currencyCode: body.currencyCode ? String(body.currencyCode) : "INR",
      snapshot: (body.snapshot as Prisma.InputJsonValue) ?? null,
      lendingExtension: (body.lendingExtension as Prisma.InputJsonValue) ?? null,
      commercialTerms: (body.commercialTerms as Prisma.InputJsonValue) ?? null,
      primaryCounterpartyName: body.primaryCounterpartyName
        ? String(body.primaryCounterpartyName)
        : null,
      invoicePartyType: body.invoicePartyType
        ? String(body.invoicePartyType)
        : body.commissionPayeeType
          ? String(body.commissionPayeeType)
          : body.commercialPayee
            ? String(body.commercialPayee)
            : null,
      invoicePartySpecify: body.invoicePartySpecify
        ? String(body.invoicePartySpecify)
        : body.commissionPayeeSpecify
          ? String(body.commissionPayeeSpecify)
          : body.commercialPayeeSpecify
            ? String(body.commercialPayeeSpecify)
            : null,
      invoicePartyContactId: body.invoicePartyContactId
        ? String(body.invoicePartyContactId)
        : body.commissionPayeeContactId
          ? String(body.commissionPayeeContactId)
          : null,
      invoicePartyId: body.invoicePartyId
        ? String(body.invoicePartyId)
        : body.commissionAccountingPayeeId
          ? String(body.commissionAccountingPayeeId)
          : null,
    };

    if (input.invoicePartyType && !isValidInvoicePartyType(input.invoicePartyType)) {
      throw new DealValidationError(
        `invoicePartyType must be a valid Invoice Party type`,
      );
    }
    if (input.invoicePartyId) {
      const payee = await prisma.enterpriseInvoiceParty.findFirst({
        where: {
          id: input.invoicePartyId,
          organizationId,
          isDeleted: false,
          enabled: true,
        },
      });
      if (!payee) {
        throw new DealValidationError(
          "invoicePartyId must reference an active Invoice Party Master record",
        );
      }
      // Denormalize type / contact from Master when not explicitly supplied
      if (!input.invoicePartyType) input.invoicePartyType = payee.partyType;
      if (!input.invoicePartySpecify) input.invoicePartySpecify = payee.displayName;
      if (!input.invoicePartyContactId && payee.contactId) {
        input.invoicePartyContactId = payee.contactId;
      }
    }
    if (input.invoicePartyContactId) {
      const contact = await prisma.ecmContact.findFirst({
        where: {
          id: input.invoicePartyContactId,
          organizationId,
          isDeleted: false,
        },
      });
      if (!contact) {
        throw new DealValidationError(
          "invoicePartyContactId must reference a valid Enterprise Contact",
        );
      }
    }
    if (input.invoicePartyType === "customer" && !input.invoicePartyContactId) {
      input.invoicePartyContactId = input.primaryContactId ?? null;
    }

    // Never accept client-supplied id as authority
    const deal = await enterpriseDealRepository.createDeal(input);
    return serializeDeal(deal);
  }

  async getDeal(dealId: string, include: DealIncludeOption[] = []) {
    const organizationId = await this.orgId();
    const deal = await enterpriseDealRepository.requireDeal(organizationId, dealId);
    const base = serializeDeal(deal);
    let opportunityNumber: string | null = null;
    if (deal.opportunityId) {
      const opportunity = await prisma.enterpriseOpportunity.findFirst({
        where: {
          id: deal.opportunityId,
          organizationId,
          isDeleted: false,
        },
        select: { opportunityNumber: true },
      });
      opportunityNumber = opportunity?.opportunityNumber ?? null;
    }
    const withOpp = { ...base, opportunityNumber };
    if (include.length === 0) return withOpp;

    const extras: Record<string, unknown> = {};
    if (include.includes("counterparties")) {
      extras.counterparties = (
        await enterpriseDealRepository.listCounterparties(organizationId, dealId)
      ).map(serializeCounterparty);
    }
    if (include.includes("documents")) {
      extras.documents = (
        await enterpriseDealRepository.listDocuments(organizationId, dealId)
      ).map(serializeDocumentLink);
    }
    if (include.includes("tasks")) {
      extras.tasks = (
        await enterpriseDealRepository.listTasks(organizationId, dealId)
      ).map(serializeTask);
    }
    if (include.includes("activities")) {
      extras.activities = (
        await enterpriseDealRepository.listActivities(organizationId, dealId)
      ).map(serializeActivity);
    }
    if (include.includes("timeline")) {
      extras.timeline = (
        await enterpriseDealRepository.listTimeline(organizationId, dealId)
      ).map(serializeTimelineEvent);
    }
    if (include.includes("snapshots")) {
      extras.snapshots = (
        await enterpriseDealRepository.listSnapshots(organizationId, dealId)
      ).map(serializeSnapshot);
    }
    return { ...withOpp, ...extras };
  }

  async searchDeals(query: EnterpriseDealSearchQuery) {
    const organizationId = await this.orgId();
    const result = await enterpriseDealRepository.searchDeals(organizationId, query);
    return {
      ...result,
      items: result.items.map((row) => ({
        ...serializeDeal(row),
        opportunityNumber: row.opportunity?.opportunityNumber ?? null,
      })),
    };
  }

  async updateDeal(dealId: string, input: UpdateEnterpriseDealInput) {
    const organizationId = await this.orgId();
    assertRowVersion(input.rowVersion);

    const existing = await enterpriseDealRepository.requireDeal(organizationId, dealId);

    const data: Prisma.EnterpriseDealUncheckedUpdateManyInput = {
      updatedBy: input.actorUserId,
    };
    if (input.fileNumber !== undefined) data.fileNumber = input.fileNumber;
    if (input.productId !== undefined) data.productId = input.productId;
    if (input.productCode !== undefined) data.productCode = input.productCode;
    if (input.productLabel !== undefined) data.productLabel = input.productLabel;
    if (input.transactionType !== undefined) data.transactionType = input.transactionType;
    if (input.lifecyclePhase !== undefined) data.lifecyclePhase = input.lifecyclePhase;
    if (input.subStage !== undefined) data.subStage = input.subStage;
    if (input.operationalStatus !== undefined) {
      data.operationalStatus = assertOperationalStatus(input.operationalStatus);
    }
    if (input.primaryContactId !== undefined) data.primaryContactId = input.primaryContactId;
    if (input.primaryContactName !== undefined) {
      data.primaryContactName = input.primaryContactName;
    }
    if (input.primaryContactMobile !== undefined) {
      data.primaryContactMobile = input.primaryContactMobile;
    }
    if (input.primaryContactEmail !== undefined) {
      data.primaryContactEmail = input.primaryContactEmail;
    }
    if (input.companyId !== undefined) data.companyId = input.companyId;
    if (input.relationshipManagerUserId !== undefined) {
      data.relationshipManagerUserId = input.relationshipManagerUserId;
    }
    if (input.relationshipManagerName !== undefined) {
      data.relationshipManagerName = input.relationshipManagerName;
    }
    if (input.primaryOwnerUserId !== undefined) {
      data.primaryOwnerUserId = input.primaryOwnerUserId;
    }
    if (input.priority !== undefined) data.priority = assertPriority(input.priority);
    if (input.isUrgent !== undefined) data.isUrgent = input.isUrgent;
    if (input.isDelayed !== undefined) data.isDelayed = input.isDelayed;
    if (input.requestedAmount !== undefined) data.requestedAmount = input.requestedAmount;
    if (input.approvedAmount !== undefined) data.approvedAmount = input.approvedAmount;
    if (input.fulfilledAmount !== undefined) data.fulfilledAmount = input.fulfilledAmount;
    if (input.currencyCode !== undefined) data.currencyCode = input.currencyCode;
    if (input.snapshot !== undefined) {
      data.snapshot = input.snapshot as Prisma.InputJsonValue;
    }
    if (input.lendingExtension !== undefined) {
      data.lendingExtension = input.lendingExtension as Prisma.InputJsonValue;
    }
    if (input.commercialTerms !== undefined) {
      data.commercialTerms = input.commercialTerms as Prisma.InputJsonValue;
    }
    if (input.invoicePartyType !== undefined) {
      if (
        input.invoicePartyType !== null &&
        input.invoicePartyType !== "" &&
        !isValidInvoicePartyType(input.invoicePartyType)
      ) {
        throw new DealValidationError("invoicePartyType must be a valid Invoice Party type");
      }
      data.invoicePartyType = input.invoicePartyType;
    }
    if (input.invoicePartySpecify !== undefined) {
      data.invoicePartySpecify = input.invoicePartySpecify;
    }
    if (input.invoicePartyContactId !== undefined) {
      if (input.invoicePartyContactId) {
        const contact = await prisma.ecmContact.findFirst({
          where: {
            id: input.invoicePartyContactId,
            organizationId,
            isDeleted: false,
          },
        });
        if (!contact) {
          throw new DealValidationError(
            "invoicePartyContactId must reference a valid Enterprise Contact",
          );
        }
      }
      data.invoicePartyContactId = input.invoicePartyContactId;
    }
    if (input.invoicePartyId !== undefined) {
      if (input.invoicePartyId) {
        const payee = await prisma.enterpriseInvoiceParty.findFirst({
          where: {
            id: input.invoicePartyId,
            organizationId,
            isDeleted: false,
            enabled: true,
          },
        });
        if (!payee) {
          throw new DealValidationError(
            "invoicePartyId must reference an active Invoice Party Master record",
          );
        }
        data.invoicePartyId = payee.id;
        if (input.invoicePartyType === undefined) {
          data.invoicePartyType = payee.partyType;
        }
        if (input.invoicePartySpecify === undefined) {
          data.invoicePartySpecify = payee.displayName;
        }
        if (input.invoicePartyContactId === undefined && payee.contactId) {
          data.invoicePartyContactId = payee.contactId;
        }
      } else {
        data.invoicePartyId = null;
      }
    }

    // CO-ARCH-003 Phase 2B Sprint 2 — controlled lender / program change
    const previousLenderId = existing.lenderId;
    const previousProgramId = existing.lenderProgramId;
    let nextLenderId = previousLenderId;
    let nextProgramId = previousProgramId;

    if (input.lenderId !== undefined) {
      if (!input.lenderId) {
        throw new DealValidationError("lenderId cannot be cleared on an existing Deal (BI-3)");
      }
      const lender = await prisma.enterpriseLender.findFirst({
        where: { id: input.lenderId, organizationId, isDeleted: false },
      });
      if (!lender) {
        throw new DealValidationError("lenderId must reference a valid Lender");
      }
      data.lenderId = lender.id;
      data.primaryCounterpartyType = "lender";
      data.primaryCounterpartyId = lender.id;
      data.primaryCounterpartyName =
        lender.displayName || lender.label || lender.legalName;
      nextLenderId = lender.id;
      // Changing lender invalidates program unless a new program is supplied
      if (input.lenderProgramId === undefined) {
        data.lenderProgramId = null;
        data.primaryCounterpartyProgramId = null;
        nextProgramId = null;
      }
    }

    if (input.lenderProgramId !== undefined) {
      const effectiveLenderId =
        input.lenderId !== undefined ? nextLenderId : existing.lenderId;
      if (input.lenderProgramId) {
        if (!effectiveLenderId) {
          throw new DealValidationError("lenderId is required before assigning a Lender Program");
        }
        const program = await prisma.enterpriseLenderProgram.findFirst({
          where: {
            id: input.lenderProgramId,
            organizationId,
            lenderId: effectiveLenderId,
            isDeleted: false,
          },
        });
        if (!program) {
          throw new DealValidationError(
            "lenderProgramId must belong to the selected Lender",
          );
        }
        data.lenderProgramId = program.id;
        data.primaryCounterpartyProgramId = program.id;
        nextProgramId = program.id;
      } else {
        data.lenderProgramId = null;
        data.primaryCounterpartyProgramId = null;
        nextProgramId = null;
      }
    }

    const updated = await enterpriseDealRepository.updateDealOptimistic(
      organizationId,
      dealId,
      input.rowVersion,
      data,
    );

    const lenderChanged =
      previousLenderId !== nextLenderId || previousProgramId !== nextProgramId;
    await enterpriseDealRepository.appendTimelineEvent({
      organizationId,
      dealId,
      eventType: lenderChanged ? "deal_lender_changed" : "deal_updated",
      summary: lenderChanged
        ? `Deal ${updated.dealNumber} lender/program updated`
        : `Deal ${updated.dealNumber} updated`,
      actorUserId: input.actorUserId,
      payload: {
        reason: input.reason ?? null,
        fields: Object.keys(data),
        previousLenderId,
        newLenderId: nextLenderId,
        previousProgramId,
        newProgramId: nextProgramId,
        at: new Date().toISOString(),
      },
    });

    if (lenderChanged) {
      await enterpriseDealRepository.appendSnapshot({
        organizationId,
        dealId,
        reason: "lender_or_program_change",
        snapshot: {
          previousLenderId,
          newLenderId: nextLenderId,
          previousProgramId,
          newProgramId: nextProgramId,
          actorUserId: input.actorUserId,
          reason: input.reason ?? null,
          at: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        actorUserId: input.actorUserId,
      });
    }

    return serializeDeal(updated);
  }

  async softDeleteDeal(
    dealId: string,
    actorUserId: string,
    actorName?: string | null,
    reason?: string | null,
  ) {
    const organizationId = await this.orgId();
    const updated = await enterpriseDealRepository.softDeleteDeal({
      organizationId,
      dealId,
      actorUserId,
      actorName,
      reason,
    });
    if (!updated) throw new DealNotFoundError();
    return serializeDeal(updated);
  }

  async archiveDeal(dealId: string, actorUserId: string, reason?: string | null) {
    const organizationId = await this.orgId();
    const updated = await enterpriseDealRepository.archiveDeal({
      organizationId,
      dealId,
      actorUserId,
      reason,
    });
    return serializeDeal(updated);
  }

  async restoreDeal(
    dealId: string,
    actorUserId: string,
    actorName?: string | null,
    reason?: string | null,
  ) {
    const organizationId = await this.orgId();
    const updated = await enterpriseDealRepository.restoreDeal({
      organizationId,
      dealId,
      actorUserId,
      actorName,
      reason,
    });
    return serializeDeal(updated);
  }

  async transitionDeal(dealId: string, input: TransitionDealInput) {
    const organizationId = await this.orgId();
    const deal = await enterpriseDealRepository.requireDeal(organizationId, dealId);
    assertRowVersion(input.rowVersion);
    const { toGrossStage } = validateStageTransition({
      fromGrossStage: deal.grossStage,
      toGrossStage: input.toGrossStage,
      fromLifecycleStatus: deal.lifecycleStatus,
      toLifecycleStatus: input.toLifecycleStatus,
      productFamily: deal.productFamily,
      allowSkip: Boolean(input.allowSkip),
    });

    assertInvoicePartyForDealStage({
      toGrossStage,
      invoicePartyId: deal.invoicePartyId,
    });

    const updated = await enterpriseDealRepository.transitionDeal({
      organizationId,
      dealId,
      rowVersion: input.rowVersion,
      actorUserId: input.actorUserId,
      toGrossStage,
      toSubStage: input.toSubStage,
      toLifecycleStatus: input.toLifecycleStatus
        ? assertLifecycleStatus(input.toLifecycleStatus)
        : undefined,
      toOperationalStatus: input.toOperationalStatus
        ? assertOperationalStatus(input.toOperationalStatus)
        : undefined,
      reason: input.reason,
    });
    return serializeDeal(updated);
  }

  async listTimeline(dealId: string, take = 50) {
    const organizationId = await this.orgId();
    await enterpriseDealRepository.requireDeal(organizationId, dealId);
    const rows = await enterpriseDealRepository.listTimeline(organizationId, dealId, take);
    return rows.map(serializeTimelineEvent);
  }

  async listSnapshots(dealId: string) {
    const organizationId = await this.orgId();
    await enterpriseDealRepository.requireDeal(organizationId, dealId);
    const rows = await enterpriseDealRepository.listSnapshots(organizationId, dealId);
    return rows.map(serializeSnapshot);
  }

  async appendSnapshot(
    dealId: string,
    reason: string,
    snapshot: Record<string, unknown>,
    actorUserId: string,
  ) {
    const organizationId = await this.orgId();
    await enterpriseDealRepository.requireDeal(organizationId, dealId);
    const r = assertNonEmpty(reason, "reason");
    if (!snapshot || typeof snapshot !== "object") {
      throw new DealValidationError("snapshot object is required");
    }
    const row = await enterpriseDealRepository.appendSnapshot({
      organizationId,
      dealId,
      reason: r,
      snapshot: snapshot as Prisma.InputJsonValue,
      actorUserId,
    });
    await enterpriseDealRepository.appendTimelineEvent({
      organizationId,
      dealId,
      eventType: "snapshot_appended",
      summary: `Snapshot v${row.versionNumber} appended (${r})`,
      actorUserId,
      payload: { versionNumber: row.versionNumber, reason: r },
    });
    return serializeSnapshot(row);
  }

  /** ARB A3 — placeholder only; does not compute or persist health. */
  async getDealHealth(dealId: string) {
    const organizationId = await this.orgId();
    const deal = await enterpriseDealRepository.requireDeal(organizationId, dealId);
    return {
      dealId: deal.id,
      dealNumber: deal.dealNumber,
      healthScore: deal.healthScore,
      healthBand: deal.healthBand,
      healthComputedAt: deal.healthComputedAt?.toISOString() ?? null,
      healthPayload: deal.healthPayload,
      status: "reserved" as const,
      message:
        "Deal Health storage is reserved (ARB A3). Computation engines are out of Wave 2 scope.",
    };
  }

  /** Placeholder writer — rejected until a certified health engine exists. */
  async updateDealHealthPlaceholder(_dealId: string) {
    throw Object.assign(
      new Error(
        "Deal Health write is not implemented in Wave 2. Reserved columns remain null until a certified engine is authorized.",
      ),
      { status: 501, code: "DEAL_HEALTH_NOT_IMPLEMENTED" },
    );
  }

  // Counterparties
  async listCounterparties(dealId: string) {
    const organizationId = await this.orgId();
    await enterpriseDealRepository.requireDeal(organizationId, dealId);
    return (await enterpriseDealRepository.listCounterparties(organizationId, dealId)).map(
      serializeCounterparty,
    );
  }

  async assignCounterparty(dealId: string, input: CreateCounterpartyInput) {
    const organizationId = await this.orgId();
    const counterpartyType = assertCounterpartyType(input.counterpartyType);
    const counterpartyRegistryId = assertNonEmpty(
      input.counterpartyRegistryId,
      "counterpartyRegistryId",
    );
    const row = await enterpriseDealRepository.createCounterparty({
      organizationId,
      dealId,
      counterpartyType,
      counterpartyRegistryId,
      programId: input.programId,
      isPrimary: input.isPrimary,
      pipelineStage: input.pipelineStage,
      pipelineSubStage: input.pipelineSubStage,
      applicationRef: input.applicationRef,
      extension: input.extension as Prisma.InputJsonValue | undefined,
      actorUserId: input.actorUserId,
    });
    return serializeCounterparty(row);
  }

  async updateCounterparty(
    dealId: string,
    assignmentId: string,
    input: UpdateCounterpartyInput,
  ) {
    const organizationId = await this.orgId();
    const row = await enterpriseDealRepository.updateCounterparty({
      organizationId,
      dealId,
      assignmentId,
      programId: input.programId,
      isPrimary: input.isPrimary,
      pipelineStage: input.pipelineStage,
      pipelineSubStage: input.pipelineSubStage,
      applicationRef: input.applicationRef,
      decision: input.decision,
      decisionAt: parseDate(input.decisionAt ?? undefined) ?? null,
      extension: input.extension as Prisma.InputJsonValue | undefined,
      actorUserId: input.actorUserId,
    });
    return serializeCounterparty(row);
  }

  async removeCounterparty(
    dealId: string,
    assignmentId: string,
    actorUserId: string,
    reason?: string | null,
  ) {
    const organizationId = await this.orgId();
    const row = await enterpriseDealRepository.softDeleteCounterparty({
      organizationId,
      dealId,
      assignmentId,
      actorUserId,
      reason,
    });
    return serializeCounterparty(row);
  }

  async updateCounterpartyPipeline(
    dealId: string,
    assignmentId: string,
    input: PipelineUpdateInput,
  ) {
    const organizationId = await this.orgId();
    const pipelineStage = assertNonEmpty(input.pipelineStage, "pipelineStage");
    const row = await enterpriseDealRepository.updateCounterpartyPipeline({
      organizationId,
      dealId,
      assignmentId,
      pipelineStage,
      pipelineSubStage: input.pipelineSubStage,
      applicationRef: input.applicationRef,
      decision: input.decision,
      decisionAt: parseDate(input.decisionAt ?? undefined) ?? null,
      actorUserId: input.actorUserId,
    });
    return serializeCounterparty(row);
  }

  // Documents
  async listDocuments(dealId: string) {
    const organizationId = await this.orgId();
    await enterpriseDealRepository.requireDeal(organizationId, dealId);
    return (await enterpriseDealRepository.listDocuments(organizationId, dealId)).map(
      serializeDocumentLink,
    );
  }

  async attachDocument(dealId: string, input: CreateDocumentLinkInput) {
    const organizationId = await this.orgId();
    const row = await enterpriseDealRepository.createDocumentLink({
      organizationId,
      dealId,
      documentDefinitionId: input.documentDefinitionId,
      documentTypeId: input.documentTypeId,
      participantId: input.participantId,
      status: input.status ? assertDocumentStatus(input.status) : "required",
      storageKey: input.storageKey,
      extension: input.extension as Prisma.InputJsonValue | undefined,
      actorUserId: input.actorUserId,
    });
    return serializeDocumentLink(row);
  }

  async updateDocument(dealId: string, linkId: string, input: UpdateDocumentLinkInput) {
    const organizationId = await this.orgId();
    const row = await enterpriseDealRepository.updateDocumentLink({
      organizationId,
      dealId,
      linkId,
      status: input.status ? assertDocumentStatus(input.status) : undefined,
      storageKey: input.storageKey,
      uploadedAt: parseDate(input.uploadedAt ?? undefined),
      verifiedAt: parseDate(input.verifiedAt ?? undefined),
      extension: input.extension as Prisma.InputJsonValue | undefined,
      actorUserId: input.actorUserId,
    });
    return serializeDocumentLink(row);
  }

  // Tasks
  async listTasks(dealId: string) {
    const organizationId = await this.orgId();
    await enterpriseDealRepository.requireDeal(organizationId, dealId);
    return (await enterpriseDealRepository.listTasks(organizationId, dealId)).map(serializeTask);
  }

  async addTask(dealId: string, input: CreateTaskInput) {
    const organizationId = await this.orgId();
    const title = assertNonEmpty(input.title, "title");
    const row = await enterpriseDealRepository.createTask({
      organizationId,
      dealId,
      title,
      status: input.status,
      priority: input.priority,
      dueAt: parseDate(input.dueAt ?? undefined),
      assigneeUserId: input.assigneeUserId,
      slaPolicyId: input.slaPolicyId,
      payload: input.payload as Prisma.InputJsonValue | undefined,
      actorUserId: input.actorUserId,
    });
    return serializeTask(row);
  }

  async updateTask(dealId: string, taskId: string, input: UpdateTaskInput) {
    const organizationId = await this.orgId();
    const row = await enterpriseDealRepository.updateTask({
      organizationId,
      dealId,
      taskId,
      title: input.title,
      status: input.status,
      priority: input.priority,
      dueAt: parseDate(input.dueAt ?? undefined),
      assigneeUserId: input.assigneeUserId,
      slaPolicyId: input.slaPolicyId,
      completedAt: parseDate(input.completedAt ?? undefined),
      payload: input.payload as Prisma.InputJsonValue | undefined,
      actorUserId: input.actorUserId,
    });
    return serializeTask(row);
  }

  // Activities
  async listActivities(dealId: string) {
    const organizationId = await this.orgId();
    await enterpriseDealRepository.requireDeal(organizationId, dealId);
    return (await enterpriseDealRepository.listActivities(organizationId, dealId)).map(
      serializeActivity,
    );
  }

  async recordActivity(dealId: string, input: CreateActivityInput) {
    const organizationId = await this.orgId();
    const title = assertNonEmpty(input.title, "title");
    const row = await enterpriseDealRepository.createActivity({
      organizationId,
      dealId,
      title,
      status: input.status,
      activityType: input.activityType,
      dueAt: parseDate(input.dueAt ?? undefined),
      assigneeUserId: input.assigneeUserId,
      payload: input.payload as Prisma.InputJsonValue | undefined,
      actorUserId: input.actorUserId,
    });
    return serializeActivity(row);
  }

  async updateActivity(dealId: string, activityId: string, input: UpdateActivityInput) {
    const organizationId = await this.orgId();
    const row = await enterpriseDealRepository.updateActivity({
      organizationId,
      dealId,
      activityId,
      title: input.title,
      status: input.status,
      activityType: input.activityType,
      dueAt: parseDate(input.dueAt ?? undefined),
      assigneeUserId: input.assigneeUserId,
      completedAt: parseDate(input.completedAt ?? undefined),
      payload: input.payload as Prisma.InputJsonValue | undefined,
      actorUserId: input.actorUserId,
    });
    return serializeActivity(row);
  }
}

export const enterpriseDealService = new EnterpriseDealService();
