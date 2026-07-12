import {
  ECM_FIXED_WORKSPACE_TABS,
  getEnabledEcmRoleMaster,
  getEcmRoleDefinition,
  type EcmWorkspaceTabId,
} from "@/constants/enterprise-contact-master";
import type { EcmContactRole } from "@/types/enterprise-contact-master";

export interface EcmWorkspaceTab {
  id: EcmWorkspaceTabId;
  label: string;
  kind: "fixed" | "role";
  roleCode?: EcmContactRole;
}

/** Build dynamic Contact Workspace tabs from Role Master + assigned roles. */
export function buildEcmWorkspaceTabs(assignedRoles: EcmContactRole[]): EcmWorkspaceTab[] {
  const before = ECM_FIXED_WORKSPACE_TABS.filter((t) => t.placement === "before_roles").map(
    (t) =>
      ({
        id: t.id,
        label: t.label,
        kind: "fixed" as const,
      }) satisfies EcmWorkspaceTab,
  );

  const roleTabs: EcmWorkspaceTab[] = [];
  const master = getEnabledEcmRoleMaster();
  for (const role of assignedRoles) {
    const def = getEcmRoleDefinition(role) ?? master.find((m) => m.code === role);
    if (!def) continue;
    if (roleTabs.some((t) => t.id === def.workspaceTabId)) continue;
    roleTabs.push({
      id: def.workspaceTabId,
      label: def.workspaceTabLabel,
      kind: "role",
      roleCode: def.code,
    });
  }

  const after = ECM_FIXED_WORKSPACE_TABS.filter((t) => t.placement === "after_roles")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(
      (t) =>
        ({
          id: t.id,
          label: t.label,
          kind: "fixed" as const,
        }) satisfies EcmWorkspaceTab,
    );

  return [...before, ...roleTabs, ...after];
}
