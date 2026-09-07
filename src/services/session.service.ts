import {
  clearSession,
  getSession,
  getStoredUser,
  isAuthenticated,
  persistSession,
  setStoredUser,
} from "@/lib/auth";
import { isUnauthorizedError } from "@/lib/error-handler";
import { authService } from "@/services/auth.service";
import type { AuthSession, User } from "@/types/auth";

export const sessionService = {
  getSession,
  getUser: getStoredUser,
  isAuthenticated,
  persist: persistSession,
  clear: clearSession,
  updateUser(user: User): void {
    setStoredUser(user);
  },

  async validateSession(): Promise<AuthSession | null> {
    const session = getSession();
    if (!session) return null;

    try {
      const user = await authService.getMe();
      setStoredUser(user);
      return { ...session, user };
    } catch (err) {
      if (!isUnauthorizedError(err)) {
        return session;
      }
      // Access-token 401 is not proof the user is logged out. Refresh first.
      // Network / compile failures must not wipe a still-valid refresh token.
      const latest = getSession() ?? session;
      try {
        const tokens = await authService.refreshToken(latest.refreshToken);
        persistSession({
          user: latest.user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
        const user = await authService.getMe();
        setStoredUser(user);
        return {
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
      } catch (refreshErr) {
        if (isUnauthorizedError(refreshErr)) {
          clearSession();
          return null;
        }
        return latest;
      }
    }
  },
};
