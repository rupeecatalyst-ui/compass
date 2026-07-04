import {
  clearSession,
  getSession,
  getStoredUser,
  isAuthenticated,
  persistSession,
  setStoredUser,
} from "@/lib/auth";
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
    } catch {
      clearSession();
      return null;
    }
  },
};
