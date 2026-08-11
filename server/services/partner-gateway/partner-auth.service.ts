/**
 * CO-WP-102 — Partner authentication service (Enterprise Identity → Partner UUID).
 * CO-WP-PERF-005 — reuse login user for binding; attach entitlements via the same
 * authoritative resolver; parallel refresh-token write + entitlement resolve.
 */
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { comparePassword } from "@server/utils/password";
import { serverEnv } from "@server/config/env";
import { getRefreshExpiryDate } from "@server/services/token.service";
import {
  signPartnerAccessToken,
  signPartnerRefreshToken,
  verifyPartnerRefreshToken,
} from "./partner-token.service";
import {
  PartnerGatewayError,
  resolvePartnerBindingForUser,
  toPartnerSessionDto,
  type PartnerBindingUser,
} from "./partner-binding.service";
import { partnerEntitlementsService } from "@server/services/partner-entitlements";
import type {
  PartnerAuthTokensDto,
  PartnerHealthDto,
  PartnerSessionDto,
} from "@/types/enterprise-partner-gateway";

async function attachPartnerEntitlements(
  session: PartnerSessionDto,
  binding: {
    partner: { id: string; organizationId: string };
  },
): Promise<void> {
  try {
    const effective = await partnerEntitlementsService.resolveForPartner({
      wealthPartnerId: binding.partner.id,
      organizationId: binding.partner.organizationId,
    });
    session.entitlements = {
      executionMode: effective.executionMode,
      source: effective.source,
      permissions: effective.permissions,
      modules: effective.modules,
      templateCode: effective.templateCode,
    };
  } catch {
    /* entitlements optional on session until migration applied */
  }
}

async function issuePartnerSession(
  userId: string,
  opts?: { preloadedUser?: PartnerBindingUser },
): Promise<PartnerAuthTokensDto> {
  const binding = await resolvePartnerBindingForUser(userId, {
    preloadedUser: opts?.preloadedUser,
  });
  const claims = {
    userId: binding.user.id,
    email: binding.user.email,
    role: binding.user.role,
    partnerId: binding.partner.id,
    organizationId: binding.partner.organizationId,
    contactId: binding.contactId,
  };
  const accessToken = signPartnerAccessToken(claims);
  const refreshToken = signPartnerRefreshToken(claims);
  const session = toPartnerSessionDto(binding);

  const persistRefresh = isDatabaseAvailable()
    ? prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: binding.user.id,
          expiresAt: getRefreshExpiryDate(),
        },
      })
    : Promise.resolve(null);

  await Promise.all([persistRefresh, attachPartnerEntitlements(session, binding)]);

  return {
    accessToken,
    refreshToken,
    expiresIn: serverEnv.JWT_EXPIRES_IN,
    session,
  };
}

export const partnerAuthService = {
  async health(): Promise<PartnerHealthDto> {
    const persistence = isDatabaseAvailable() ? "prisma" : "unavailable";
    return {
      status: persistence === "prisma" ? "ok" : "degraded",
      service: "partner_gateway",
      timestamp: new Date().toISOString(),
      persistence,
    };
  },

  async login(email: string, password: string): Promise<PartnerAuthTokensDto> {
    if (!isDatabaseAvailable()) {
      throw new PartnerGatewayError(
        "Enterprise services are currently unavailable.",
        "ENTERPRISE_UNAVAILABLE",
        503,
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new PartnerGatewayError("Email and password are required", "VALIDATION", 400);
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.isActive) {
      throw new PartnerGatewayError("Invalid email or password", "INVALID_CREDENTIALS", 401);
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new PartnerGatewayError("Invalid email or password", "INVALID_CREDENTIALS", 401);
    }

    return issuePartnerSession(user.id, {
      preloadedUser: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
      },
    });
  },

  async refresh(refreshToken: string): Promise<PartnerAuthTokensDto> {
    if (!refreshToken?.trim()) {
      throw new PartnerGatewayError("Refresh token required", "VALIDATION", 400);
    }

    let payload;
    try {
      payload = verifyPartnerRefreshToken(refreshToken);
    } catch {
      throw new PartnerGatewayError("Invalid or expired refresh token", "INVALID_TOKEN", 401);
    }

    if (isDatabaseAvailable()) {
      const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
      if (!stored || stored.expiresAt < new Date() || stored.userId !== payload.userId) {
        throw new PartnerGatewayError("Invalid or expired refresh token", "INVALID_TOKEN", 401);
      }
      await prisma.refreshToken.delete({ where: { token: refreshToken } }).catch(() => undefined);
    }

    return issuePartnerSession(payload.userId);
  },

  async logout(refreshToken: string | undefined, userId: string) {
    if (refreshToken && isDatabaseAvailable()) {
      await prisma.refreshToken
        .deleteMany({ where: { token: refreshToken, userId } })
        .catch(() => undefined);
    }
    return { ok: true as const };
  },

  async me(userId: string, partnerId: string) {
    const binding = await resolvePartnerBindingForUser(userId);
    if (binding.partner.id !== partnerId) {
      throw new PartnerGatewayError("Access denied", "FORBIDDEN", 403);
    }
    const session = toPartnerSessionDto(binding);
    await attachPartnerEntitlements(session, binding);
    return session;
  },
};

export { PartnerGatewayError };
