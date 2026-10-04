/**
 * Rupee Catalyst employee assignment — Deal inheritance / override persistence.
 * Does not write Opportunity rows from Deal overrides. Does not run production backfill.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { enterpriseDealRepository } from "@server/repositories/enterprise-deal";
import { userAdminService } from "@server/services/user-admin.service";
import { canManageRegistryAssignments } from "@/lib/assigned-users";
import { RC_EMPLOYEE_TIMELINE_EVENT } from "@/constants/enterprise-deal/rc-employee-assignment";
import type { RcEmployeeAssignmentAction } from "@/constants/enterprise-deal/rc-employee-assignment";
import {
  buildInheritedDealAssignment,
  buildOverrideDealAssignment,
  formatRcEmployeeAssignmentSummary,
  overlayDealRcEmployeeDisplay,
  resolveCreateDealRcEmployee,
  resolveRcEmployee,
  shouldPropagateOpportunityAssignmentToDeal,
  type RcEmployeeSubject,
} from "@/lib/enterprise-deal/rc-employee-assignment";
import { DealForbiddenError, DealValidationError } from "@server/services/enterprise-deal/deal-validation";

export type RcEmployeeOpportunityRow = RcEmployeeSubject & {
  id: string;
};

export type RcEmployeeDealRow = RcEmployeeSubject & {
  id: string;
  opportunityId: string | null;
  dealNumber?: string | null;
  rowVersion: number;
  lendingExtension?: unknown;
};

export type RcEmployeeAssignmentAudit = {
  previousUserId: string | null;
  previousName: string | null;
  newUserId: string | null;
  newName: string | null;
  source: "inherited" | "override";
  changedByUserId: string;
  reason?: string | null;
};

export function assertCanManageRcEmployeeAssignment(actorRole?: string | null) {
  if (!canManageRegistryAssignments(actorRole)) {
    throw new DealForbiddenError();
  }
}

async function lookupUserLabel(userId: string | null | undefined): Promise<{
  id: string;
  name: string;
} | null> {
  const id = userId?.trim() || "";
  if (!id) return null;
  const user = await prisma.user.findFirst({
    where: { id, isActive: true },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!user) return null;
  const name = `${user.firstName} ${user.lastName}`.trim();
  return { id: user.id, name: name || user.id };
}

async function hierarchyFor(userId: string | null): Promise<string[]> {
  if (!userId?.trim()) return [];
  return userAdminService.resolveHierarchyAncestors([userId]);
}

function assignmentData(assignment: {
  relationshipManagerUserId: string | null;
  relationshipManagerName: string | null;
  primaryOwnerUserId: string | null;
  assignmentMode: string;
  lendingExtension: Record<string, unknown>;
}): Prisma.EnterpriseDealUncheckedUpdateManyInput {
  return {
    relationshipManagerUserId: assignment.relationshipManagerUserId,
    relationshipManagerName: assignment.relationshipManagerName,
    primaryOwnerUserId: assignment.primaryOwnerUserId,
    assignmentMode: assignment.assignmentMode,
    lendingExtension: assignment.lendingExtension as Prisma.InputJsonValue,
  };
}

export async function appendRcEmployeeTimeline(input: {
  organizationId: string;
  dealId: string;
  opportunityId: string | null;
  actorUserId: string;
  audit: RcEmployeeAssignmentAudit;
}) {
  await enterpriseDealRepository.appendTimelineEvent({
    organizationId: input.organizationId,
    dealId: input.dealId,
    eventType: RC_EMPLOYEE_TIMELINE_EVENT,
    summary: formatRcEmployeeAssignmentSummary({
      previousName: input.audit.previousName,
      previousUserId: input.audit.previousUserId,
      nextName: input.audit.newName,
      nextUserId: input.audit.newUserId,
      source: input.audit.source,
    }),
    actorUserId: input.actorUserId,
    opportunityId: input.opportunityId,
    payload: {
      previousUserId: input.audit.previousUserId,
      previousName: input.audit.previousName,
      newUserId: input.audit.newUserId,
      newName: input.audit.newName,
      source: input.audit.source,
      changedByUserId: input.audit.changedByUserId,
      reason: input.audit.reason ?? null,
      at: new Date().toISOString(),
    },
  });
}

export async function resolveNamedCreateDealRcEmployee(input: {
  opportunity: RcEmployeeSubject;
  incoming?: RcEmployeeSubject | null;
  actorUserId?: string | null;
}) {
  const resolved = resolveCreateDealRcEmployee(input);
  if (!resolved.userId || resolved.name?.trim()) return resolved;
  const named = await lookupUserLabel(resolved.userId);
  return { ...resolved, name: named?.name || resolved.name };
}

export async function stampCreateDealRcEmployee(input: {
  opportunity: RcEmployeeSubject;
  incoming?: RcEmployeeSubject | null;
  actorUserId: string;
  existingDealExtension?: unknown;
}): Promise<{
  relationshipManagerUserId: string | null;
  relationshipManagerName: string | null;
  primaryOwnerUserId: string | null;
  assignmentMode: "inherited" | "override";
  lendingExtension: Record<string, unknown> | null;
}> {
  const resolved = await resolveNamedCreateDealRcEmployee(input);
  if (!resolved.userId) {
    return {
      relationshipManagerUserId: null,
      relationshipManagerName: resolved.name,
      primaryOwnerUserId: input.actorUserId,
      assignmentMode: "inherited",
      lendingExtension: input.incoming?.lendingExtension
        ? (input.incoming.lendingExtension as Record<string, unknown>)
        : null,
    };
  }
  const hierarchy = await hierarchyFor(resolved.userId);
  if (resolved.source === "override") {
    return buildOverrideDealAssignment({
      existingExtension: input.existingDealExtension ?? input.incoming?.lendingExtension,
      userId: resolved.userId,
      name: resolved.name || resolved.userId,
      hierarchyVisibilityUserIds: hierarchy,
    });
  }
  return buildInheritedDealAssignment({
    opportunity: {
      ...input.opportunity,
      relationshipManagerUserId: resolved.userId,
      relationshipManagerName: resolved.name,
      primaryOwnerUserId: resolved.userId,
    },
    existingDealExtension: input.existingDealExtension ?? input.incoming?.lendingExtension,
    hierarchyVisibilityUserIds: hierarchy,
  });
}

export async function applyInheritedRcEmployeeToDeal(input: {
  organizationId: string;
  deal: RcEmployeeDealRow;
  opportunity: RcEmployeeOpportunityRow;
  actorUserId: string;
  reason?: string | null;
}): Promise<{ updated: boolean }> {
  if (!shouldPropagateOpportunityAssignmentToDeal(input.deal)) {
    return { updated: false };
  }
  const previous = overlayDealRcEmployeeDisplay({
    deal: input.deal,
    opportunity: input.opportunity,
  });
  const hierarchy = await hierarchyFor(resolveRcEmployee(input.opportunity).userId);
  const next = buildInheritedDealAssignment({
    opportunity: input.opportunity,
    existingDealExtension: input.deal.lendingExtension,
    hierarchyVisibilityUserIds: hierarchy,
  });
  const persisted = resolveRcEmployee(input.deal);
  if (
    persisted.userId === next.relationshipManagerUserId &&
    (persisted.name || "") === (next.relationshipManagerName || "") &&
    input.deal.assignmentMode === "inherited"
  ) {
    return { updated: false };
  }

  await enterpriseDealRepository.updateDealOptimistic(
    input.organizationId,
    input.deal.id,
    input.deal.rowVersion,
    {
      ...assignmentData(next),
      updatedBy: input.actorUserId,
    },
  );

  await appendRcEmployeeTimeline({
    organizationId: input.organizationId,
    dealId: input.deal.id,
    opportunityId: input.deal.opportunityId,
    actorUserId: input.actorUserId,
    audit: {
      previousUserId: previous.userId,
      previousName: previous.name,
      newUserId: next.relationshipManagerUserId,
      newName: next.relationshipManagerName,
      source: "inherited",
      changedByUserId: input.actorUserId,
      reason: input.reason ?? "opportunity_assignment_changed",
    },
  });

  return { updated: true };
}

export async function propagateOpportunityRcEmployeeToInheritedDeals(input: {
  organizationId: string;
  opportunity: RcEmployeeOpportunityRow;
  actorUserId: string;
}): Promise<{ updated: number; skippedOverride: number }> {
  const deals = await enterpriseDealRepository.listByOpportunity(
    input.organizationId,
    input.opportunity.id,
  );
  let updated = 0;
  let skippedOverride = 0;
  for (const deal of deals) {
    if (!shouldPropagateOpportunityAssignmentToDeal(deal)) {
      skippedOverride += 1;
      continue;
    }
    const result = await applyInheritedRcEmployeeToDeal({
      organizationId: input.organizationId,
      deal,
      opportunity: input.opportunity,
      actorUserId: input.actorUserId,
      reason: "opportunity_assignment_changed",
    });
    if (result.updated) updated += 1;
  }
  return { updated, skippedOverride };
}

export async function applyDealRcEmployeeAssignmentAction(input: {
  organizationId: string;
  deal: RcEmployeeDealRow;
  opportunity: RcEmployeeOpportunityRow | null;
  actorUserId: string;
  actorRole?: string | null;
  action: RcEmployeeAssignmentAction;
  userId?: string | null;
  reason?: string | null;
}): Promise<{
  data: Prisma.EnterpriseDealUncheckedUpdateManyInput;
  audit: RcEmployeeAssignmentAudit;
}> {
  assertCanManageRcEmployeeAssignment(input.actorRole);
  const previous = overlayDealRcEmployeeDisplay({
    deal: input.deal,
    opportunity: input.opportunity,
  });

  if (input.action === "restore_inheritance") {
    if (!input.opportunity) {
      throw new DealValidationError("Cannot restore inheritance without a parent Opportunity");
    }
    const hierarchy = await hierarchyFor(resolveRcEmployee(input.opportunity).userId);
    const next = buildInheritedDealAssignment({
      opportunity: input.opportunity,
      existingDealExtension: input.deal.lendingExtension,
      hierarchyVisibilityUserIds: hierarchy,
    });
    return {
      data: assignmentData(next),
      audit: {
        previousUserId: previous.userId,
        previousName: previous.name,
        newUserId: next.relationshipManagerUserId,
        newName: next.relationshipManagerName,
        source: "inherited",
        changedByUserId: input.actorUserId,
        reason: input.reason ?? "restore_inheritance",
      },
    };
  }

  const named = await lookupUserLabel(input.userId);
  if (!named) {
    throw new DealValidationError("userId must reference an active Rupee Catalyst employee");
  }
  const opportunityEmployee = input.opportunity
    ? resolveRcEmployee(input.opportunity)
    : { userId: null, name: null, assignedUsers: [] };
  if (opportunityEmployee.userId && named.id === opportunityEmployee.userId) {
    const hierarchy = await hierarchyFor(named.id);
    const next = buildInheritedDealAssignment({
      opportunity: {
        ...input.opportunity,
        relationshipManagerUserId: named.id,
        relationshipManagerName: named.name,
        primaryOwnerUserId: named.id,
      },
      existingDealExtension: input.deal.lendingExtension,
      hierarchyVisibilityUserIds: hierarchy,
    });
    return {
      data: assignmentData(next),
      audit: {
        previousUserId: previous.userId,
        previousName: previous.name,
        newUserId: next.relationshipManagerUserId,
        newName: next.relationshipManagerName,
        source: "inherited",
        changedByUserId: input.actorUserId,
        reason: input.reason ?? "aligned_with_opportunity",
      },
    };
  }

  const hierarchy = await hierarchyFor(named.id);
  const next = buildOverrideDealAssignment({
    existingExtension: input.deal.lendingExtension,
    userId: named.id,
    name: named.name,
    hierarchyVisibilityUserIds: hierarchy,
  });
  return {
    data: assignmentData(next),
    audit: {
      previousUserId: previous.userId,
      previousName: previous.name,
      newUserId: next.relationshipManagerUserId,
      newName: next.relationshipManagerName,
      source: "override",
      changedByUserId: input.actorUserId,
      reason: input.reason ?? "deal_override",
    },
  };
}

export function classifyDealRcEmployeePatchSource(input: {
  opportunity: RcEmployeeSubject | null;
  nextUserId: string | null;
}): "inherited" | "override" {
  const opportunityId = input.opportunity
    ? resolveRcEmployee(input.opportunity).userId
    : null;
  if (input.nextUserId && opportunityId && input.nextUserId === opportunityId) {
    return "inherited";
  }
  if (!input.nextUserId && !opportunityId) return "inherited";
  return "override";
}
