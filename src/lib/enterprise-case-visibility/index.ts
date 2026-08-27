/**
 * CO-ORG-VISIBILITY-002 — Canonical enterprise case visibility (client-safe).
 *
 * Effective visibility = Role ∪ Hierarchy ∪ Explicit assignment.
 * Do not invent per-page permission forks — call these helpers.
 */

import type { Role } from "@/constants/roles";
import { ROLES } from "@/constants/roles";
import type { ChanakyaRadarScopeId } from "@/constants/chanakya-radar";

export type CaseVisibilityActor = {
  userId?: string | null;
  role?: Role | string | null;
  displayName?: string | null;
};

export type CaseVisibilitySubject = {
  primaryOwnerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  relationshipManagerName?: string | null;
  assignedUserIds?: string[] | null;
  assignedUserNames?: string[] | null;
  hierarchyVisibilityUserIds?: string[] | null;
};

export type CaseVisibilityOptions = {
  /**
   * Actor + transitive reportees (BFS via reportingManagerId).
   * When provided, must include the actor id.
   */
  downlineUserIds?: string[] | null;
  /**
   * Radar / registry UI scope. `entire_organization` only expands for org-wide roles.
   */
  scope?: ChanakyaRadarScopeId | "my_deals" | "my_team" | "all" | "my" | null;
};

/** SUPER_ADMIN and ADMIN may see the full organization book. */
export function hasOrgWideCaseVisibility(role?: Role | string | null): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

export function collectCaseAssigneeUserIds(subject: CaseVisibilitySubject): string[] {
  const ids = new Set<string>();
  const push = (v?: string | null) => {
    const id = v?.trim();
    if (id) ids.add(id);
  };
  push(subject.primaryOwnerUserId);
  push(subject.relationshipManagerUserId);
  for (const id of subject.assignedUserIds ?? []) push(id);
  return [...ids];
}

function namesMatch(a?: string | null, b?: string | null): boolean {
  const left = a?.trim().toLowerCase() || "";
  const right = b?.trim().toLowerCase() || "";
  if (!left || !right) return false;
  return left === right;
}

/**
 * Core visibility predicate — Role ∪ Hierarchy ∪ Explicit assignment.
 * Never grants org-wide access to ordinary employees.
 */
export function actorCanSeeCase(
  actor: CaseVisibilityActor,
  subject: CaseVisibilitySubject,
  options?: CaseVisibilityOptions,
): boolean {
  const scope = options?.scope ?? "my_team";
  const orgWide =
    scope === "entire_organization" || scope === "all";

  if (orgWide && hasOrgWideCaseVisibility(actor.role)) {
    return true;
  }

  const actorId = actor.userId?.trim() || "";
  if (actorId) {
    const assigned = new Set(
      (subject.assignedUserIds ?? []).map((id) => id.trim()).filter(Boolean),
    );
    if (assigned.has(actorId)) return true;
    if (subject.primaryOwnerUserId?.trim() === actorId) return true;
    if (subject.relationshipManagerUserId?.trim() === actorId) return true;

    const hierarchy = new Set(
      (subject.hierarchyVisibilityUserIds ?? [])
        .map((id) => id.trim())
        .filter(Boolean),
    );
    if (hierarchy.has(actorId)) return true;

    const downline = new Set(
      (options?.downlineUserIds ?? [])
        .map((id) => id.trim())
        .filter(Boolean),
    );
    if (downline.size === 0 && actorId) downline.add(actorId);

    for (const ownerId of collectCaseAssigneeUserIds(subject)) {
      if (downline.has(ownerId)) return true;
    }
  }

  // Legacy name fallback when IDs are missing on older projections.
  const display = actor.displayName?.trim() || "";
  if (display) {
    if (namesMatch(display, subject.relationshipManagerName)) return true;
    for (const name of subject.assignedUserNames ?? []) {
      if (namesMatch(display, name)) return true;
    }
  }

  return false;
}

export function filterSubjectsByCaseVisibility<T>(
  items: T[],
  project: (item: T) => CaseVisibilitySubject,
  actor: CaseVisibilityActor,
  options?: CaseVisibilityOptions,
): T[] {
  return items.filter((item) => actorCanSeeCase(actor, project(item), options));
}
