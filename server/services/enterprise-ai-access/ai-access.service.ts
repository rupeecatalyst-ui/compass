/**
 * CO-AI-ACCESS-001 — Persisted user AI capability service.
 */
import "server-only";

import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { recordBusinessAudit } from "@/lib/ops/record";
import {
  mergeAiCapabilityPatch,
  parseUserAiCapabilitiesJson,
  serializeUserAiCapabilities,
} from "@/lib/enterprise-ai-access/resolve";
import type {
  UpdateUserAiCapabilitiesInput,
  UserAiCapabilities,
  UserAiCapabilitiesDto,
} from "@/types/enterprise-ai-access";

function requireDb() {
  if (!isDatabaseAvailable()) {
    throw Object.assign(new Error("Database required for AI access control"), {
      statusCode: 503,
      code: "SERVICE_UNAVAILABLE",
    });
  }
}

export const enterpriseAiAccessService = {
  async getForUser(userId: string): Promise<UserAiCapabilitiesDto | null> {
    requireDb();
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, aiCapabilitiesJson: true, updatedAt: true },
    });
    if (!row) return null;
    return {
      userId: row.id,
      capabilities: parseUserAiCapabilitiesJson(row.aiCapabilitiesJson),
      actionsAvailableInV1: false,
      updatedAt: row.updatedAt.toISOString(),
    };
  },

  async getCapabilitiesForUser(userId: string): Promise<UserAiCapabilities | null> {
    const dto = await this.getForUser(userId);
    return dto?.capabilities ?? null;
  },

  async updateForUser(input: {
    userId: string;
    patch: UpdateUserAiCapabilitiesInput;
    actorUserId: string;
  }): Promise<UserAiCapabilitiesDto> {
    requireDb();
    const existing = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, aiCapabilitiesJson: true, updatedAt: true },
    });
    if (!existing) {
      throw Object.assign(new Error("User not found"), { statusCode: 404, code: "NOT_FOUND" });
    }

    const current = parseUserAiCapabilitiesJson(existing.aiCapabilitiesJson);
    const next = mergeAiCapabilityPatch(current, {
      ...input.patch,
      AI_ACTIONS: false,
    });
    const serialized = serializeUserAiCapabilities(next);

    const row = await prisma.user.update({
      where: { id: input.userId },
      data: { aiCapabilitiesJson: serialized },
      select: { id: true, aiCapabilitiesJson: true, updatedAt: true },
    });

    recordBusinessAudit({
      actorUserId: input.actorUserId,
      module: "System",
      action: "ai_access.permissions_updated",
      entityId: input.userId,
      previousValue: current,
      newValue: serialized,
      result: "Success",
    });

    return {
      userId: row.id,
      capabilities: parseUserAiCapabilitiesJson(row.aiCapabilitiesJson),
      actionsAvailableInV1: false,
      updatedAt: row.updatedAt.toISOString(),
    };
  },
};
