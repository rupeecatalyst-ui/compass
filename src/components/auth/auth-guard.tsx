"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { ROUTES } from "@/constants/routes";
import type { Role } from "@/constants/roles";
import { canAccessRoute } from "@/lib/permissions";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN);
      return;
    }

    if (user && !canAccessRoute(user, allowedRoles)) {
      router.replace(ROUTES.DASHBOARD);
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || (user && !canAccessRoute(user, allowedRoles))) {
    return null;
  }

  return <>{children}</>;
}
