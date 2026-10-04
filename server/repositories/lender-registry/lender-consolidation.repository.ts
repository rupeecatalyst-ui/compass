import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";

export type LenderDependencyCounts = {
  programmes: number;
  deals: number;
  linkedOpportunities: number;
  contacts: number;
  ecmEmployees: number;
  documents: number;
  policies: number;
  portalInvites: number;
  portalSubmissions: number;
  dialogueThreads: number;
  productPriorities: number;
  recommendationCategories: number;
  recommendationOverrides: number;
  transactionDocuments: number;
  businessNotes: number;
  counterpartyAssignments: number;
};

export type LenderMergePreview = {
  source: { id: string; code: string; label: string; counts: LenderDependencyCounts };
  target: { id: string; code: string; label: string; counts: LenderDependencyCounts };
  conflicts: Array<{ kind: string; count: number; message: string }>;
};

export async function inspectLenderDependencies(organizationId: string, lenderId: string): Promise<LenderDependencyCounts> {
  const [
    programmes, deals, opportunities, contacts, ecmEmployees, documents, policies,
    portalInvites, portalSubmissions, dialogueThreads, productPriorities,
    recommendationCategories, recommendationOverrides, transactionDocuments,
    businessNotes, counterpartyAssignments,
  ] = await Promise.all([
    prisma.enterpriseLenderProgram.count({ where: { organizationId, lenderId } }),
    prisma.enterpriseDeal.count({ where: { organizationId, lenderId, isDeleted: false } }),
    prisma.enterpriseDeal.findMany({ where: { organizationId, lenderId, isDeleted: false, opportunityId: { not: null } }, select: { opportunityId: true }, distinct: ["opportunityId"] }),
    prisma.enterpriseLenderContact.count({ where: { organizationId, lenderId } }),
    prisma.ecmContact.count({ where: { organizationId, roleProfiles: { path: ["lender_employee", "institution"], equals: lenderId } } }),
    prisma.enterpriseLenderDocument.count({ where: { organizationId, lenderId } }),
    prisma.enterpriseCreditRiskPolicy.count({ where: { organizationId, lenderId } }),
    prisma.lenderProgramPortalInvite.count({ where: { organizationId, lenderId } }),
    prisma.lenderProgramSubmission.count({ where: { organizationId, lenderId } }),
    prisma.lenderProgramDialogueThread.count({ where: { organizationId, lenderId } }),
    prisma.enterpriseProductLenderPriority.count({ where: { organizationId, lenderId } }),
    prisma.hlRecommendationLenderCategoryAssignment.count({ where: { organizationId, lenderId } }),
    prisma.hlRecommendationOverride.count({ where: { organizationId, lenderId } }),
    prisma.enterpriseTransactionDocument.count({ where: { organizationId, lenderId } }),
    prisma.enterpriseBusinessNote.count({ where: { organizationId, lenderId, isDeleted: false } }),
    prisma.enterpriseDealCounterpartyAssignment.count({ where: { organizationId, counterpartyRegistryId: lenderId, isDeleted: false } }),
  ]);
  return {
    programmes,
    deals,
    linkedOpportunities: opportunities.length,
    contacts,
    ecmEmployees,
    documents,
    policies,
    portalInvites,
    portalSubmissions,
    dialogueThreads,
    productPriorities,
    recommendationCategories,
    recommendationOverrides,
    transactionDocuments,
    businessNotes,
    counterpartyAssignments,
  };
}

export async function previewLenderMerge(
  organizationId: string,
  sourceId: string,
  targetId: string,
): Promise<LenderMergePreview> {
  if (sourceId === targetId) throw new Error("Source and target lenders must be different.");
  const [source, target] = await Promise.all([
    prisma.enterpriseLender.findFirst({ where: { id: sourceId, organizationId, isDeleted: false } }),
    prisma.enterpriseLender.findFirst({ where: { id: targetId, organizationId, isDeleted: false } }),
  ]);
  if (!source || !target) throw new Error("Both lenders must belong to the authorized organization.");
  const [sourceCounts, targetCounts, sourcePriorities, targetPriorities, dealCollisions] = await Promise.all([
    inspectLenderDependencies(organizationId, sourceId),
    inspectLenderDependencies(organizationId, targetId),
    prisma.enterpriseProductLenderPriority.findMany({ where: { organizationId, lenderId: sourceId }, select: { productFamily: true } }),
    prisma.enterpriseProductLenderPriority.findMany({ where: { organizationId, lenderId: targetId }, select: { productFamily: true } }),
    prisma.enterpriseDeal.findMany({
      where: {
        organizationId,
        lenderId: sourceId,
        isDeleted: false,
        opportunityId: { not: null },
        opportunity: { deals: { some: { organizationId, lenderId: targetId, isDeleted: false } } },
      },
      select: { id: true },
    }),
  ]);
  const targetFamilies = new Set(targetPriorities.map((row) => row.productFamily));
  const priorityCollisions = sourcePriorities.filter((row) => targetFamilies.has(row.productFamily)).length;
  const conflicts: LenderMergePreview["conflicts"] = [];
  if (dealCollisions.length) conflicts.push({ kind: "deal_opportunity", count: dealCollisions.length, message: "Both lenders have an active Deal for the same Opportunity." });
  if (priorityCollisions) conflicts.push({ kind: "product_priority", count: priorityCollisions, message: "Both lenders have a priority row for the same product family." });
  return {
    source: { id: source.id, code: source.code, label: source.label, counts: sourceCounts },
    target: { id: target.id, code: target.code, label: target.label, counts: targetCounts },
    conflicts,
  };
}

export async function executeLenderMerge(input: {
  organizationId: string;
  sourceId: string;
  targetId: string;
  actorUserId: string;
  actorName?: string;
  reason: string;
}) {
  const preview = await previewLenderMerge(input.organizationId, input.sourceId, input.targetId);
  if (preview.conflicts.length) {
    throw new Error(`Merge blocked by ${preview.conflicts.length} unresolved collision type(s).`);
  }
  const moved = await prisma.$transaction(async (tx) => {
    const ecmRows = await tx.ecmContact.findMany({
      where: { organizationId: input.organizationId, roleProfiles: { path: ["lender_employee", "institution"], equals: input.sourceId } },
      select: { id: true, roleProfiles: true },
    });
    for (const contact of ecmRows) {
      const profiles = (contact.roleProfiles ?? {}) as Record<string, Record<string, unknown>>;
      const employee = { ...(profiles.lender_employee ?? {}), institution: input.targetId, institutionLabel: preview.target.label, lenderName: preview.target.label };
      await tx.ecmContact.update({ where: { id: contact.id }, data: { roleProfiles: { ...profiles, lender_employee: employee } as Prisma.InputJsonValue } });
    }
    const operations = {
      programmes: await tx.enterpriseLenderProgram.updateMany({ where: { organizationId: input.organizationId, lenderId: input.sourceId }, data: { lenderId: input.targetId, modifiedBy: input.actorUserId } }),
      deals: await tx.enterpriseDeal.updateMany({ where: { organizationId: input.organizationId, lenderId: input.sourceId }, data: { lenderId: input.targetId } }),
      contacts: await tx.enterpriseLenderContact.updateMany({ where: { organizationId: input.organizationId, lenderId: input.sourceId }, data: { lenderId: input.targetId, modifiedBy: input.actorUserId } }),
      documents: await tx.enterpriseLenderDocument.updateMany({ where: { organizationId: input.organizationId, lenderId: input.sourceId }, data: { lenderId: input.targetId, modifiedBy: input.actorUserId } }),
      policies: await tx.enterpriseCreditRiskPolicy.updateMany({ where: { organizationId: input.organizationId, lenderId: input.sourceId }, data: { lenderId: input.targetId, modifiedBy: input.actorUserId } }),
      portalInvites: await tx.lenderProgramPortalInvite.updateMany({ where: { organizationId: input.organizationId, lenderId: input.sourceId }, data: { lenderId: input.targetId } }),
      portalSubmissions: await tx.lenderProgramSubmission.updateMany({ where: { organizationId: input.organizationId, lenderId: input.sourceId }, data: { lenderId: input.targetId } }),
      dialogueThreads: await tx.lenderProgramDialogueThread.updateMany({ where: { organizationId: input.organizationId, lenderId: input.sourceId }, data: { lenderId: input.targetId } }),
      productPriorities: await tx.enterpriseProductLenderPriority.updateMany({ where: { organizationId: input.organizationId, lenderId: input.sourceId }, data: { lenderId: input.targetId, modifiedBy: input.actorUserId } }),
      recommendationCategories: await tx.hlRecommendationLenderCategoryAssignment.updateMany({ where: { organizationId: input.organizationId, lenderId: input.sourceId }, data: { lenderId: input.targetId } }),
      recommendationOverrides: await tx.hlRecommendationOverride.updateMany({ where: { organizationId: input.organizationId, lenderId: input.sourceId }, data: { lenderId: input.targetId } }),
      transactionDocuments: await tx.enterpriseTransactionDocument.updateMany({ where: { organizationId: input.organizationId, lenderId: input.sourceId }, data: { lenderId: input.targetId } }),
      businessNotes: await tx.enterpriseBusinessNote.updateMany({ where: { organizationId: input.organizationId, lenderId: input.sourceId }, data: { lenderId: input.targetId, lenderName: preview.target.label } }),
      counterpartyAssignments: await tx.enterpriseDealCounterpartyAssignment.updateMany({ where: { organizationId: input.organizationId, counterpartyRegistryId: input.sourceId }, data: { counterpartyRegistryId: input.targetId, updatedBy: input.actorUserId } }),
      ecmEmployees: { count: ecmRows.length },
    };
    await tx.enterpriseDeal.updateMany({ where: { organizationId: input.organizationId, primaryCounterpartyId: input.sourceId }, data: { primaryCounterpartyId: input.targetId, primaryCounterpartyName: preview.target.label } });
    await tx.enterpriseLender.update({
      where: { id: input.sourceId },
      data: { lifecycleStatus: "retired", operationalStatus: "inactive", status: "archived", enabled: false, modifiedBy: input.actorUserId, versionNumber: { increment: 1 } },
    });
    await tx.enterpriseRegistryAuditEntry.create({
      data: {
        organizationId: input.organizationId,
        registryModule: "lender",
        entityId: input.sourceId,
        entityCode: preview.source.code,
        action: "updated",
        previousValue: preview as unknown as Prisma.InputJsonValue,
        newValue: { mergedIntoLenderId: input.targetId, moved: Object.fromEntries(Object.entries(operations).map(([key, value]) => [key, value.count])) } as Prisma.InputJsonValue,
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        reason: input.reason,
      },
    });
    return Object.fromEntries(Object.entries(operations).map(([key, value]) => [key, value.count]));
  });
  return { preview, moved, sourceRetired: true };
}
