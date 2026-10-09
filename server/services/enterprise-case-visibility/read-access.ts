import { ROLES } from "@/constants/roles";
import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { buildDealVisibilityOrFilters, buildOpportunityVisibilityOrFilters, hasOrgWideCaseVisibility } from "./build-visibility-where";

function denied(status: number, code: string): never {
  throw { status, body: { success: false, error: { code, message: status === 404 ? "Record not found" : "Employee access could not be established" } } };
}

/** Single Rupee Catalyst scope; role and active state come from the User registry. */
export async function resolveCaseReadAccess(userId: string) {
  if (!userId?.trim()) denied(401, "UNAUTHENTICATED");
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } });
  if (!actor?.isActive || !Object.values(ROLES).includes(actor.role)) denied(403, "EMPLOYEE_ACCESS_DENIED");
  const organizationId = await resolvePilotOrganizationId();
  const orgWide = hasOrgWideCaseVisibility(actor.role);
  const dealWhere: Prisma.EnterpriseDealWhereInput = { organizationId, isDeleted: false,
    ...(orgWide ? {} : { OR: await buildDealVisibilityOrFilters(actor.id) }) };
  const opportunityWhere: Prisma.EnterpriseOpportunityWhereInput = { organizationId, isDeleted: false,
    ...(orgWide ? {} : { OR: await buildOpportunityVisibilityOrFilters(actor.id) }) };
  return { organizationId, actor, dealWhere, opportunityWhere };
}
export type CaseReadAccess = Awaited<ReturnType<typeof resolveCaseReadAccess>>;

export async function assertDealReadAccess(access: CaseReadAccess, dealId: string) {
  if (!dealId?.trim()) denied(404, "DEAL_NOT_FOUND");
  const row = await prisma.enterpriseDeal.findFirst({ where: { AND: [access.dealWhere, { id: dealId }] }, select: { id: true } });
  if (!row) denied(404, "DEAL_NOT_FOUND");
}
export async function assertOpportunityReadAccess(access: CaseReadAccess, opportunityId: string) {
  if (!opportunityId?.trim()) denied(404, "OPPORTUNITY_NOT_FOUND");
  const row = await prisma.enterpriseOpportunity.findFirst({ where: { AND: [access.opportunityWhere, { id: opportunityId }] }, select: { id: true } });
  if (!row) denied(404, "OPPORTUNITY_NOT_FOUND");
}
