import type { Role } from "@prisma/client";
import { prisma, isDatabaseAvailable } from "../lib/prisma";
import { comparePassword, generateToken, hashPassword } from "../utils/password";
import { serverEnv } from "../config/env";
import {
  getRefreshExpiryDate,
  getResetExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./token.service";

/**
 * Shared authentication service (ADR-014).
 * Consumed by Next.js Route Handlers and the legacy Express API.
 *
 * CO-STAB-001 — Demo auth has no hardcoded password. When DATABASE_URL is unset,
 * DEMO_AUTH_ENABLED=true and DEMO_AUTH_PASSWORD must be set (certification via env).
 */

function resolveDemoUser() {
  if (!serverEnv.DEMO_AUTH_ENABLED) {
    throw Object.assign(
      new Error(
        "Authentication is not configured. Set DATABASE_URL or enable demo auth via DEMO_AUTH_ENABLED and DEMO_AUTH_PASSWORD.",
      ),
      { statusCode: 503, code: "AUTH_NOT_CONFIGURED" },
    );
  }
  const password = (serverEnv.DEMO_AUTH_PASSWORD ?? "").trim();
  if (!password) {
    throw Object.assign(
      new Error(
        "DEMO_AUTH_PASSWORD is required when DEMO_AUTH_ENABLED=true and DATABASE_URL is unset.",
      ),
      { statusCode: 503, code: "AUTH_NOT_CONFIGURED" },
    );
  }
  if (serverEnv.NODE_ENV === "production" && !serverEnv.DATABASE_URL) {
    throw Object.assign(
      new Error(
        "Demo auth is not permitted in production without DATABASE_URL. Configure PostgreSQL authentication.",
      ),
      { statusCode: 503, code: "AUTH_NOT_CONFIGURED" },
    );
  }
  return {
    id: "demo-user-id",
    email: (serverEnv.DEMO_AUTH_EMAIL ?? "admin@compass.com").trim().toLowerCase(),
    password,
    firstName: "Business",
    lastName: "Certification Admin",
    role: "SUPER_ADMIN" as Role,
    avatarUrl: null as string | null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

let demoPasswordHash: string | null = null;
let demoPasswordCachedFor: string | null = null;

async function getDemoPasswordHash(password: string): Promise<string> {
  if (!demoPasswordHash || demoPasswordCachedFor !== password) {
    demoPasswordHash = await hashPassword(password);
    demoPasswordCachedFor = password;
  }
  return demoPasswordHash;
}

function formatUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  employeeId?: string | null;
  mobile?: string | null;
  department?: string | null;
  mustChangePassword?: boolean;
  reportingManagerId?: string | null;
  eumUserId?: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isActive: user.isActive,
    employeeId: user.employeeId ?? null,
    mobile: user.mobile ?? null,
    department: user.department ?? null,
    mustChangePassword: Boolean(user.mustChangePassword),
    reportingManagerId: user.reportingManagerId ?? null,
    eumUserId: user.eumUserId ?? null,
    createdAt: new Date(user.createdAt).toISOString(),
    updatedAt: new Date(user.updatedAt).toISOString(),
  };
}

async function createSession(user: {
  id: string;
  email: string;
  role: Role;
}) {
  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  if (isDatabaseAvailable()) {
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshExpiryDate(),
      },
    });
  }

  return { accessToken, refreshToken };
}

export const authService = {
  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isDatabaseAvailable()) {
      const demoUser = resolveDemoUser();
      if (normalizedEmail !== demoUser.email) {
        throw Object.assign(new Error("Invalid email or password"), {
          statusCode: 401,
          code: "INVALID_CREDENTIALS",
        });
      }
      const hash = await getDemoPasswordHash(demoUser.password);
      const valid = await comparePassword(password, hash);
      if (!valid) {
        throw Object.assign(new Error("Invalid email or password"), {
          statusCode: 401,
          code: "INVALID_CREDENTIALS",
        });
      }
      const tokens = await createSession(demoUser);
      return {
        user: formatUser({ ...demoUser, createdAt: new Date(), updatedAt: new Date() }),
        ...tokens,
      };
    }

    // CO-BUG-117 — emails are stored lowercase at provision; normalize lookup.
    // Also heal legacy mixed-case rows via case-insensitive match (Postgres unique is case-sensitive).
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      const legacy = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      });
      if (legacy && legacy.email !== normalizedEmail) {
        try {
          user = await prisma.user.update({
            where: { id: legacy.id },
            data: { email: normalizedEmail },
          });
        } catch {
          user = legacy;
        }
      } else {
        user = legacy;
      }
    }
    if (!user || !user.isActive) {
      throw Object.assign(new Error("Invalid email or password"), {
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
      });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error("Invalid email or password"), {
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
      });
    }

    const tokens = await createSession(user);
    return { user: formatUser(user), ...tokens };
  },

  async logout(refreshToken?: string) {
    if (isDatabaseAvailable() && refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
  },

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);

    if (isDatabaseAvailable()) {
      const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
      if (!stored || stored.expiresAt < new Date()) {
        throw Object.assign(new Error("Invalid refresh token"), {
          statusCode: 401,
          code: "INVALID_TOKEN",
        });
      }
      await prisma.refreshToken.delete({ where: { token: refreshToken } });
    }

    const tokens = await createSession({
      id: payload.userId,
      email: payload.email,
      role: payload.role as Role,
    });

    return tokens;
  },

  async getMe(userId: string) {
    if (!isDatabaseAvailable() && userId === "demo-user-id") {
      const demoUser = resolveDemoUser();
      return formatUser({ ...demoUser, createdAt: new Date(), updatedAt: new Date() });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw Object.assign(new Error("User not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    return formatUser(user);
  },

  async forgotPassword(email: string) {
    if (!isDatabaseAvailable()) {
      return { message: "If an account exists, a reset link has been sent." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      const legacy = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      });
      if (legacy && legacy.isActive) {
        // Align stored email with login SSOT (lowercase) when safe.
        if (legacy.email !== normalizedEmail) {
          try {
            await prisma.user.update({
              where: { id: legacy.id },
              data: { email: normalizedEmail },
            });
          } catch {
            /* unique conflict — proceed with token on legacy id */
          }
        }
        const token = generateToken();
        await prisma.passwordResetToken.create({
          data: { token, userId: legacy.id, expiresAt: getResetExpiryDate() },
        });
        if (serverEnv.NODE_ENV !== "production") {
          console.log(
            `[AUTH] Password reset token generated for ${normalizedEmail} (token omitted from logs)`,
          );
        }
      }
    } else if (user.isActive) {
      const token = generateToken();
      await prisma.passwordResetToken.create({
        data: { token, userId: user.id, expiresAt: getResetExpiryDate() },
      });
      // CO-STAB-001 — never log reset tokens (production or otherwise).
      if (serverEnv.NODE_ENV !== "production") {
        console.log(
          `[AUTH] Password reset token generated for ${normalizedEmail} (token omitted from logs)`,
        );
      }
    }

    return { message: "If an account exists, a reset link has been sent." };
  },

  async resetPassword(token: string, password: string) {
    if (!isDatabaseAvailable()) {
      throw Object.assign(new Error("Database not configured"), {
        statusCode: 503,
        code: "SERVICE_UNAVAILABLE",
      });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw Object.assign(new Error("Invalid or expired reset token"), {
        statusCode: 400,
        code: "INVALID_TOKEN",
      });
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    return { message: "Password has been reset successfully." };
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!isDatabaseAvailable()) {
      throw Object.assign(new Error("Database not configured"), {
        statusCode: 503,
        code: "SERVICE_UNAVAILABLE",
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw Object.assign(new Error("User not found"), { statusCode: 404, code: "NOT_FOUND" });
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error("Current password is incorrect"), {
        statusCode: 400,
        code: "INVALID_PASSWORD",
      });
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    return { user: formatUser(updated), message: "Password updated successfully." };
  },
};
