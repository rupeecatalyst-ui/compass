/**
 * Security Gateway — placeholder guards. Does not change Catalyst One auth.
 * TODO(SPR-007.2): wire MFA, device trust, maintenance, emergency lock.
 */

export interface MissionControlSecurityContext {
  authenticated: boolean;
  mfaSatisfied: boolean;
  roles: string[];
  permissions: string[];
  sessionValid: boolean;
  deviceTrusted: boolean;
  maintenanceMode: boolean;
  emergencyLock: boolean;
}

export interface MissionControlSecurityCheckResult {
  allowed: boolean;
  reason?: string;
  failedCheck?: keyof MissionControlSecurityContext | "unknown";
}

export interface MissionControlSecurityGateway {
  evaluate(context: Partial<MissionControlSecurityContext>): MissionControlSecurityCheckResult;
  requireAuthenticated(context: Partial<MissionControlSecurityContext>): MissionControlSecurityCheckResult;
  requirePermission(
    context: Partial<MissionControlSecurityContext>,
    permission: string,
  ): MissionControlSecurityCheckResult;
}

export function createMissionControlSecurityGateway(): MissionControlSecurityGateway {
  return {
    evaluate(context) {
      if (context.emergencyLock) {
        return { allowed: false, reason: "Emergency lock active", failedCheck: "emergencyLock" };
      }
      if (context.maintenanceMode) {
        return { allowed: false, reason: "Maintenance mode", failedCheck: "maintenanceMode" };
      }
      if (context.authenticated === false) {
        return { allowed: false, reason: "Not authenticated", failedCheck: "authenticated" };
      }
      if (context.sessionValid === false) {
        return { allowed: false, reason: "Session invalid", failedCheck: "sessionValid" };
      }
      return { allowed: true };
    },
    requireAuthenticated(context) {
      if (!context.authenticated) {
        return { allowed: false, reason: "Authentication required", failedCheck: "authenticated" };
      }
      return { allowed: true };
    },
    requirePermission(context, permission) {
      const perms = context.permissions ?? [];
      if (!perms.includes(permission)) {
        return { allowed: false, reason: `Missing permission ${permission}`, failedCheck: "permissions" };
      }
      return { allowed: true };
    },
  };
}
