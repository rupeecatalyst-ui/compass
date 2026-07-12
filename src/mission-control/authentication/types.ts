/**
 * Authentication / Authorization placeholders for Mission Control.
 * Does not alter Catalyst One authentication.
 */

export interface MissionControlAuthPrincipal {
  userId: string;
  displayName: string;
  email?: string;
  roles: string[];
}

export interface MissionControlAuthenticationPort {
  getPrincipal(): Promise<MissionControlAuthPrincipal | null>;
  /** Future MFA challenge — not implemented */
  challengeMfa?(): Promise<{ challenged: boolean }>;
}

export interface MissionControlAuthorizationPort {
  hasRole(role: string): Promise<boolean>;
  hasPermission(permission: string): Promise<boolean>;
}

export function createMissionControlAuthStubs(): {
  authentication: MissionControlAuthenticationPort;
  authorization: MissionControlAuthorizationPort;
} {
  return {
    authentication: {
      async getPrincipal() {
        return null;
      },
      async challengeMfa() {
        return { challenged: false };
      },
    },
    authorization: {
      async hasRole() {
        return false;
      },
      async hasPermission() {
        return false;
      },
    },
  };
}
