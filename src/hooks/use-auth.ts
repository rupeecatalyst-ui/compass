"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { getErrorMessage } from "@/lib/error-handler";
import { authService } from "@/services/auth.service";
import { sessionService } from "@/services/session.service";
import type { AuthSession, LoginCredentials, User } from "@/types/auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const router = useRouter();
  const authCheckRef = useRef(0);
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const initialize = useCallback(async () => {
    const checkId = ++authCheckRef.current;

    setState((prev) => {
      if (prev.isAuthenticated && prev.user) {
        return { ...prev, isLoading: false };
      }
      return { ...prev, isLoading: true };
    });

    const session = await sessionService.validateSession();

    // Discard stale result if login/logout ran while this check was in flight
    if (checkId !== authCheckRef.current) return;

    setState({
      user: session?.user ?? null,
      isLoading: false,
      isAuthenticated: Boolean(session),
    });
  }, []);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      authCheckRef.current += 1;
      const session: AuthSession = await authService.login(credentials);
      sessionService.persist(session);
      setState({
        user: session.user,
        isLoading: false,
        isAuthenticated: true,
      });
      router.push(ROUTES.DASHBOARD);
      return session;
    },
    [router],
  );

  const logout = useCallback(async () => {
    authCheckRef.current += 1;
    try {
      await authService.logout();
    } catch {
      // Clear local session even if API fails
    } finally {
      sessionService.clear();
      setState({ user: null, isLoading: false, isAuthenticated: false });
      router.push(ROUTES.LOGIN);
    }
  }, [router]);

  return {
    ...state,
    login,
    logout,
    refresh: initialize,
    errorMessage: getErrorMessage,
  };
}
