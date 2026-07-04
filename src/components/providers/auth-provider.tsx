"use client";

import { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { LoginCredentials, User } from "@/types/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<unknown>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  const value = useMemo(
    () => ({
      user: auth.user,
      isLoading: auth.isLoading,
      isAuthenticated: auth.isAuthenticated,
      login: auth.login,
      logout: auth.logout,
      refresh: auth.refresh,
    }),
    [auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
