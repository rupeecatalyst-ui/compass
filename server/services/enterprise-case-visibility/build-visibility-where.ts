/**
 * Server-side Prisma visibility fragments for Opportunity / Deal search.
 * Reuses User Admin downline BFS — no hardcoded employee identities.
 */
import "server-only";

import type { Prisma } from "@prisma/client";
import { userAdminService } from "@server/services/user-admin.service";
import { hasOrgWideCaseVisibility } from "@/lib/enterprise-case-visibility";
import { COMPASS_WEBSITE_SOURCE_CODE } from "@/constants/enterprise-opportunity/company-borrower-create";
import { HIERARCHY_VISIBILITY_EXTENSION_KEY } from "@/types/assigned-users";
import { ASSIGNED_USER_IDS_EXTENSION_KEY } from "@/types/assigned-users";

export { hasOrgWideCaseVisibility };

/**
 * Resolve actor + transitive reportees for hierarchy visibility.
 */
export async function resolveVisibilityDownlineUserIds(
  actorUserId: string,
): Promise<string[]> {
  return userAdminService.resolveDownlineUserIds(actorUserId);
}

/**
 * Prisma OR clauses: RM / primary owner in downline, stamped hierarchy,
 * or explicit assignedUserIds containing the actor.
 */
export async function buildDealVisibilityOrFilters(
  actorUserId: string,
): Promise<Prisma.EnterpriseDealWhereInput[]> {
  const actor = actorUserId.trim();
  if (!actor) return [];
  const downlineIds = await resolveVisibilityDownlineUserIds(actor);
  return [
    { relationshipManagerUserId: { in: downlineIds } },
    { primaryOwnerUserId: { in: downlineIds } },
    {
      lendingExtension: {
        path: [HIERARCHY_VISIBILITY_EXTENSION_KEY],
        array_contains: actor,
      },
    },
    {
      lendingExtension: {
        path: [ASSIGNED_USER_IDS_EXTENSION_KEY],
        array_contains: actor,
      },
    },
  ];
}

export async function buildOpportunityVisibilityOrFilters(
  actorUserId: string,
): Promise<Prisma.EnterpriseOpportunityWhereInput[]> {
  const actor = actorUserId.trim();
  if (!actor) return [];
  const downlineIds = await resolveVisibilityDownlineUserIds(actor);
  return [
    { relationshipManagerUserId: { in: downlineIds } },
    { primaryOwnerUserId: { in: downlineIds } },
    { sourceCode: COMPASS_WEBSITE_SOURCE_CODE },
    {
      lendingExtension: {
        path: [HIERARCHY_VISIBILITY_EXTENSION_KEY],
        array_contains: actor,
      },
    },
    {
      lendingExtension: {
        path: [ASSIGNED_USER_IDS_EXTENSION_KEY],
        array_contains: actor,
      },
    },
  ];
}

/**
 * Org-wide roles keep scope=all. Everyone else is forced onto visibility-scoped reads.
 */
/**
 * Org-wide roles keep requested org/team scopes. Everyone else is forced onto visibility-scoped reads.
 */
export function resolveEffectiveDealSearchScope(
  requested: "my" | "team" | "all" | string | undefined,
  role?: string | null,
): "my" | "team" | "all" {
  if (hasOrgWideCaseVisibility(role)) {
    if (requested === "my") return "my";
    if (requested === "team") return "team";
    return "all";
  }
  // Non-org-wide: "team" and "my" both use the same Role∪Hierarchy∪Assignment filter.
  return requested === "all" || !requested ? "my" : requested === "team" ? "team" : "my";
}
