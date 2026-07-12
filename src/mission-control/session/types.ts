/**
 * Session Manager — interfaces only. No backend.
 * TODO(SPR-007.2): bind to auth session & device trust.
 */

export interface MissionControlSession {
  sessionId: string;
  userId: string;
  device: MissionControlDevice;
  browser: string;
  ipAddress: string;
  lastActivity: string;
  timeoutMs: number;
  concurrentSessionsAllowed: number;
  revoked: boolean;
}

export interface MissionControlDevice {
  deviceId: string;
  label: string;
  trusted: boolean;
  platform: string;
}

export interface MissionControlSessionManager {
  getCurrentSession(): Promise<MissionControlSession | null>;
  touchActivity(sessionId: string): Promise<void>;
  forceLogout(sessionId: string, reason: string): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
  listConcurrentSessions(userId: string): Promise<MissionControlSession[]>;
}

export function createMissionControlSessionManagerStub(): MissionControlSessionManager {
  return {
    async getCurrentSession() {
      return null;
    },
    async touchActivity() {
      /* no-op */
    },
    async forceLogout() {
      /* no-op */
    },
    async revokeSession() {
      /* no-op */
    },
    async listConcurrentSessions() {
      return [];
    },
  };
}
