"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { ROUTES } from "@/constants/routes";
import { clearSession } from "@/lib/auth";
import type { Role } from "@/constants/roles";
import { canAccessRoute } from "@/lib/permissions";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuthContext();
  const router = useRouter();

  const isAuthorized =
    isAuthenticated && (!user || canAccessRoute(user, allowedRoles));

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Clear stale middleware cookie so /login is not bounced back to the app
      clearSession();
      router.replace(ROUTES.LOGIN);
      return;
    }

    if (user && !canAccessRoute(user, allowedRoles)) {
      router.replace(ROUTES.CONTACTS);
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  // Keep dashboard visible when session is already authenticated; only block while
  // the initial session check runs and the user is not yet signed in.
  if ((isLoading && !isAuthenticated) || !isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
