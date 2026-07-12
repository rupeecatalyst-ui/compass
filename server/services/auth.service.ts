import type { Role } from "@prisma/client";
import { prisma, isDatabaseAvailable } from "../lib/prisma";
import { comparePassword, generateToken, hashPassword } from "../utils/password";
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
 */
/** Business Certification Admin — used when DATABASE_URL is unset (Vercel demo auth) */
const DEMO_USER = {
  id: "demo-user-id",
  email: "admin@compass.com",
  password: "Admin@123",
  firstName: "Business",
  lastName: "Certification Admin",
  role: "SUPER_ADMIN" as Role,
  avatarUrl: null as string | null,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

let demoPasswordHash: string | null = null;

async function getDemoPasswordHash(): Promise<string> {
  if (!demoPasswordHash) {
    demoPasswordHash = await hashPassword(DEMO_USER.password);
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
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isActive: user.isActive,
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
    if (!isDatabaseAvailable()) {
      if (email !== DEMO_USER.email) {
        throw Object.assign(new Error("Invalid email or password"), { statusCode: 401, code: "INVALID_CREDENTIALS" });
      }
      const hash = await getDemoPasswordHash();
      const valid = await comparePassword(password, hash);
      if (!valid) {
        throw Object.assign(new Error("Invalid email or password"), { statusCode: 401, code: "INVALID_CREDENTIALS" });
      }
      const tokens = await createSession(DEMO_USER);
      return { user: formatUser({ ...DEMO_USER, createdAt: new Date(), updatedAt: new Date() }), ...tokens };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw Object.assign(new Error("Invalid email or password"), { statusCode: 401, code: "INVALID_CREDENTIALS" });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error("Invalid email or password"), { statusCode: 401, code: "INVALID_CREDENTIALS" });
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
        throw Object.assign(new Error("Invalid refresh token"), { statusCode: 401, code: "INVALID_TOKEN" });
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
    if (!isDatabaseAvailable() && userId === DEMO_USER.id) {
      return formatUser({ ...DEMO_USER, createdAt: new Date(), updatedAt: new Date() });
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

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = generateToken();
      await prisma.passwordResetToken.create({
        data: { token, userId: user.id, expiresAt: getResetExpiryDate() },
      });
      // In production: send email with reset link
      console.log(`[DEV] Password reset token for ${email}: ${token}`);
    }

    return { message: "If an account exists, a reset link has been sent." };
  },

  async resetPassword(token: string, password: string) {
    if (!isDatabaseAvailable()) {
      throw Object.assign(new Error("Database not configured"), { statusCode: 503, code: "SERVICE_UNAVAILABLE" });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw Object.assign(new Error("Invalid or expired reset token"), { statusCode: 400, code: "INVALID_TOKEN" });
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } }),
    ]);

    return { message: "Password has been reset successfully." };
  },
};
