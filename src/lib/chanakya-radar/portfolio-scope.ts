/**
 * CO-SPRINT-100 — Portfolio scope for CHANAKYA Radar.
 * Default = own portfolio + reporting hierarchy (My Team).
 */

import type { LoanFile } from "@/types/catalyst-one";
import {
  canUseRadarScope,
  type ChanakyaRadarScopeId,
} from "@/constants/chanakya-radar";
import { DEMO_CURRENT_RM } from "@/constants/customer-360";
import type { Role } from "@/constants/roles";
import { ROLES } from "@/constants/roles";

export function resolveRadarActorName(user?: {
  firstName?: string | null;
  lastName?: string | null;
} | null): string {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  if (name && name.toLowerCase() !== "platform admin") return name;
  return DEMO_CURRENT_RM;
}

/**
 * Derive "team" RM names under the actor.
 * Without a full people graph, team = actor + other RMs present in the book
 * when the user has manager+ privileges; otherwise actor only.
 */
export function resolveTeamRmNames(
  files: LoanFile[],
  actorRm: string,
  role?: Role | string | null,
): Set<string> {
  const team = new Set<string>([actorRm]);
  const elevated =
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.ADMIN ||
    role === ROLES.MANAGER ||
    role === ROLES.ANALYST;

  if (!elevated) return team;

  for (const f of files) {
    const rm = f.relationshipManager?.trim();
    if (rm) team.add(rm);
  }
  return team;
}

export function filterFilesByRadarScope(
  files: LoanFile[],
  scope: ChanakyaRadarScopeId,
  options: { actorRm: string; role?: Role | string | null },
): LoanFile[] {
  const effective: ChanakyaRadarScopeId = canUseRadarScope(scope, options.role)
    ? scope
    : "my_portfolio";

  if (effective === "entire_organization") {
    return files.filter((f) => !f.archived && f.stage !== "won");
  }

  if (effective === "my_portfolio") {
    return files.filter(
      (f) =>
        !f.archived &&
        f.stage !== "won" &&
        (f.relationshipManager?.trim() || "") === options.actorRm,
    );
  }

  // my_team — own + hierarchy (approximated by elevated team set)
  const team = resolveTeamRmNames(files, options.actorRm, options.role);
  return files.filter(
    (f) =>
      !f.archived &&
      f.stage !== "won" &&
      team.has(f.relationshipManager?.trim() || ""),
  );
}

export function defaultRadarScope(role?: Role | string | null): ChanakyaRadarScopeId {
  if (canUseRadarScope("my_team", role)) return "my_team";
  return "my_portfolio";
}
