/**
 * CO-SPRINT-100 / CO-ORG-VISIBILITY-002 — Portfolio scope for CHANAKYA Radar.
 * Default = Entire Organization for SUPER_ADMIN/ADMIN; My Team for managers.
 */

import type { LoanFile } from "@/types/catalyst-one";
import {
  canUseRadarScope,
  type ChanakyaRadarScopeId,
} from "@/constants/chanakya-radar";
import { DEMO_CURRENT_RM } from "@/constants/customer-360";
import type { Role } from "@/constants/roles";
import {
  actorCanSeeCase,
  hasOrgWideCaseVisibility,
  type CaseVisibilitySubject,
} from "@/lib/enterprise-case-visibility";
import {
  readAssignedUserIdsFromExtension,
  readHierarchyVisibilityUserIdsFromExtension,
  coalesceAssignedUsers,
} from "@/lib/assigned-users";

export function resolveRadarActorName(user?: {
  firstName?: string | null;
  lastName?: string | null;
} | null): string {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  // Never alias a real signed-in identity to the demo RM name.
  if (name) return name;
  return DEMO_CURRENT_RM;
}

export function loanFileToVisibilitySubject(file: LoanFile): CaseVisibilitySubject {
  const ext = (file as { lendingExtension?: unknown }).lendingExtension;
  const assigned = coalesceAssignedUsers({
    lendingExtension: ext,
    primaryOwnerUserId: (file as { primaryOwnerUserId?: string }).primaryOwnerUserId,
    relationshipManagerUserId: (file as { relationshipManagerUserId?: string })
      .relationshipManagerUserId,
    relationshipManagerName: file.relationshipManager,
  });
  return {
    primaryOwnerUserId: (file as { primaryOwnerUserId?: string }).primaryOwnerUserId,
    relationshipManagerUserId: (file as { relationshipManagerUserId?: string })
      .relationshipManagerUserId,
    relationshipManagerName: file.relationshipManager,
    assignedUserIds:
      (file as { assignedUserIds?: string[] }).assignedUserIds ??
      readAssignedUserIdsFromExtension(ext) ??
      assigned.map((u) => u.id),
    assignedUserNames: assigned.map((u) => u.name),
    hierarchyVisibilityUserIds:
      (file as { hierarchyVisibilityUserIds?: string[] }).hierarchyVisibilityUserIds ??
      readHierarchyVisibilityUserIdsFromExtension(ext),
  };
}

/**
 * Derive "team" RM names under the actor — legacy name fallback only.
 * Prefer user-id downline via enterprise-case-visibility.
 */
export function resolveTeamRmNames(
  files: LoanFile[],
  actorRm: string,
  role?: Role | string | null,
): Set<string> {
  const team = new Set<string>([actorRm]);
  if (hasOrgWideCaseVisibility(role)) {
    for (const f of files) {
      const rm = f.relationshipManager?.trim();
      if (rm) team.add(rm);
    }
  }
  return team;
}

export function filterFilesByRadarScope(
  files: LoanFile[],
  scope: ChanakyaRadarScopeId,
  options: {
    actorRm: string;
    role?: Role | string | null;
    actorUserId?: string | null;
    downlineUserIds?: string[] | null;
  },
): LoanFile[] {
  const effective: ChanakyaRadarScopeId = canUseRadarScope(scope, options.role)
    ? scope
    : "my_portfolio";

  if (effective === "entire_organization" && hasOrgWideCaseVisibility(options.role)) {
    return files.filter((f) => !f.archived);
  }

  const actor = {
    userId: options.actorUserId,
    role: options.role,
    displayName: options.actorRm,
  };

  const portfolioScope: ChanakyaRadarScopeId =
    effective === "my_portfolio" ? "my_portfolio" : "my_team";

  return files.filter((f) => {
    if (f.archived) return false;
    return actorCanSeeCase(actor, loanFileToVisibilitySubject(f), {
      scope: portfolioScope,
      downlineUserIds: options.downlineUserIds ?? (options.actorUserId ? [options.actorUserId] : []),
    });
  });
}

export function defaultRadarScope(role?: Role | string | null): ChanakyaRadarScopeId {
  // SUPER_ADMIN / ADMIN default to org-wide — visibility must not depend on ownership.
  if (hasOrgWideCaseVisibility(role)) return "entire_organization";
  if (canUseRadarScope("my_team", role)) return "my_team";
  return "my_portfolio";
}
