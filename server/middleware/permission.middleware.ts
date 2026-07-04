import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";

const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  MANAGER: 60,
  ANALYST: 40,
  VIEWER: 20,
};

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    if (allowedRoles.length === 0) return next();

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const minRequired = Math.min(...allowedRoles.map((r) => ROLE_HIERARCHY[r] ?? 0));

    if (userLevel < minRequired && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      });
    }

    next();
  };
}

export function requireMinimumRole(minRole: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      });
    }

    next();
  };
}
