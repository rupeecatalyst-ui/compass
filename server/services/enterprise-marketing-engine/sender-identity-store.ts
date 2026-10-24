/**
 * CO-MARKETING-REDESIGN-013 — Sender identities.
 * Prisma when ENTERPRISE_PERSISTENCE_MODE=prisma; in-memory otherwise (engineering verifiers).
 * Simulated default is seeded only when an organisation has zero identities.
 * Writes serialise per organisation via pg_advisory_xact_lock (no schema change).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type { MarketingSenderIdentity } from "@/types/enterprise-marketing-email-delivery";
import {
  ENTERPRISE_MARKETING_EMAIL_MODE,
  MARKETING_EMAIL_PROVIDER_ENV_KEYS,
} from "@/constants/enterprise-marketing-engine/email-delivery";
import {
  MARKETING_DELIVERABILITY_FRESHNESS_MS,
  MARKETING_SENDER_SIMULATED_NOT_VERIFIED,
  type MarketingSenderApprovalStatus,
} from "@/constants/enterprise-marketing-engine/sender-deliverability";

const identities = new Map<string, MarketingSenderIdentity>();
const SENDER_IDENTITY_LOCK_KEY = "enterprise-marketing-sender-identity";
const testOrgLocks = new Map<string, Promise<unknown>>();

type SenderRow = {
  id: string;
  organizationId: string;
  displayName: string;
  fromAddress: string;
  replyTo: string | null;
  channel: string;
  active: boolean;
  isDefault: boolean;
  simulated: boolean;
  approvalStatus: string;
  verificationStatus: string;
  permittedCampaignCategoriesJson: Prisma.JsonValue;
  createdByUserId: string | null;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  lastValidationAt: Date | null;
  validationFreshUntil: Date | null;
  providerType: string;
  providerProfileId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Narrow Prisma delegate — tests inject an in-memory stand-in, never production DB. */
export type SenderIdentityPrismaDelegate = {
  findMany(args: {
    where: { organizationId: string };
    orderBy?: { displayName: "asc" };
  }): Promise<SenderRow[]>;
  findFirst(args: {
    where: {
      id?: string;
      organizationId: string;
      fromAddress?: string;
      active?: boolean;
      NOT?: { id: string };
    };
  }): Promise<SenderRow | null>;
  create(args: { data: SenderRow }): Promise<SenderRow>;
  update(args: { where: { id: string }; data: Omit<SenderRow, "id"> }): Promise<SenderRow>;
  updateMany(args: {
    where: { organizationId: string; id: { not: string }; isDefault?: boolean };
    data: { isDefault: boolean; updatedAt: Date };
  }): Promise<{ count: number }>;
};

let testDelegate: SenderIdentityPrismaDelegate | null = null;
let testForcePrisma = false;
let testPinnedMemory = false;

export function configureSenderIdentityStoreForTests(options: {
  prismaDelegate?: SenderIdentityPrismaDelegate | null;
  forcePrisma?: boolean;
  pinMemory?: boolean;
}): void {
  testDelegate = options.prismaDelegate ?? null;
  testForcePrisma = options.forcePrisma === true;
  testPinnedMemory = options.pinMemory === true;
}

function nowIso() {
  return new Date().toISOString();
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function persistenceFailed(err: unknown): never {
  const message = err instanceof Error ? err.message : "Sender identity persistence failed";
  throw Object.assign(new Error(message), {
    statusCode: 503,
    code: "SENDER_IDENTITY_PERSISTENCE_FAILED",
    cause: err,
  });
}

function isBusinessError(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  const status = (err as { statusCode?: number } | null)?.statusCode;
  return (
    status === 400 ||
    status === 404 ||
    status === 409 ||
    code === "DUPLICATE_SENDER_FROM_ADDRESS" ||
    code === "NOT_FOUND" ||
    code === MARKETING_SENDER_SIMULATED_NOT_VERIFIED
  );
}

function isSenderPrimaryKeyConflict(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  if (code !== "P2002") return false;
  const target = (err as { meta?: { target?: unknown } }).meta?.target;
  if (!Array.isArray(target) || target.length === 0) return true;
  return target.some((part) => part === "id" || part === "enterprise_marketing_sender_identities_pkey");
}

function usePrismaPersistence(): boolean {
  if (testPinnedMemory) return false;
  if (testDelegate) return true;
  return testForcePrisma || isEnterprisePersistencePrisma();
}

function credentialConfigured(providerType: MarketingSenderIdentity["providerMapping"]["providerType"]): boolean {
  if (providerType === "dry_run") return ENTERPRISE_MARKETING_EMAIL_MODE === "dry_run";
  const key = MARKETING_EMAIL_PROVIDER_ENV_KEYS[providerType as keyof typeof MARKETING_EMAIL_PROVIDER_ENV_KEYS];
  if (!key) return false;
  return Boolean(process.env[key]?.trim());
}

function defaultSenderId(organizationId: string) {
  return `mkt-sender-${organizationId}-default`;
}

function buildDefaultIdentity(organizationId: string): MarketingSenderIdentity {
  const id = defaultSenderId(organizationId);
  const ts = nowIso();
  return {
    id,
    organizationId,
    displayName: "Rupee Catalyst Campaigns",
    fromAddress: "campaigns@campaign.example.rupeecatalyst.com",
    replyTo: "champion@example.com",
    channel: "EMAIL",
    active: true,
    isDefault: true,
    simulated: true,
    approvalStatus: "DRAFT",
    verificationStatus: "PENDING",
    permittedCampaignCategories: ["Unspecified"],
    createdByUserId: null,
    approvedByUserId: null,
    approvedAt: null,
    lastValidationAt: ts,
    validationFreshUntil: new Date(Date.now() + MARKETING_DELIVERABILITY_FRESHNESS_MS).toISOString(),
    providerMapping: {
      providerType: "dry_run",
      providerProfileId: "dry-run-default",
      credentialConfigured: credentialConfigured("dry_run"),
    },
    createdAt: ts,
    updatedAt: ts,
  };
}

function mapRow(row: SenderRow): MarketingSenderIdentity {
  const categories = Array.isArray(row.permittedCampaignCategoriesJson)
    ? (row.permittedCampaignCategoriesJson as string[])
    : ["Unspecified"];
  const providerType = row.providerType as MarketingSenderIdentity["providerMapping"]["providerType"];
  return {
    id: row.id,
    organizationId: row.organizationId,
    displayName: row.displayName,
    fromAddress: row.fromAddress,
    replyTo: row.replyTo,
    channel: row.channel as MarketingSenderIdentity["channel"],
    active: row.active,
    isDefault: row.isDefault,
    simulated: row.simulated,
    approvalStatus: row.approvalStatus as MarketingSenderApprovalStatus,
    verificationStatus: row.verificationStatus as MarketingSenderIdentity["verificationStatus"],
    permittedCampaignCategories: categories,
    createdByUserId: row.createdByUserId,
    approvedByUserId: row.approvedByUserId,
    approvedAt: toIso(row.approvedAt),
    lastValidationAt: toIso(row.lastValidationAt),
    validationFreshUntil: toIso(row.validationFreshUntil),
    providerMapping: {
      providerType,
      providerProfileId: row.providerProfileId,
      credentialConfigured: credentialConfigured(providerType),
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRow(identity: MarketingSenderIdentity): SenderRow {
  return {
    id: identity.id,
    organizationId: identity.organizationId,
    displayName: identity.displayName,
    fromAddress: identity.fromAddress,
    replyTo: identity.replyTo,
    channel: identity.channel,
    active: identity.active,
    isDefault: identity.isDefault,
    simulated: identity.simulated,
    approvalStatus: identity.approvalStatus,
    verificationStatus: identity.verificationStatus,
    permittedCampaignCategoriesJson: identity.permittedCampaignCategories as unknown as Prisma.JsonValue,
    createdByUserId: identity.createdByUserId,
    approvedByUserId: identity.approvedByUserId,
    approvedAt: identity.approvedAt ? new Date(identity.approvedAt) : null,
    lastValidationAt: identity.lastValidationAt ? new Date(identity.lastValidationAt) : null,
    validationFreshUntil: identity.validationFreshUntil ? new Date(identity.validationFreshUntil) : null,
    providerType: identity.providerMapping.providerType,
    providerProfileId: identity.providerMapping.providerProfileId,
    createdAt: new Date(identity.createdAt),
    updatedAt: new Date(identity.updatedAt),
  };
}

function listMemory(organizationId: string): MarketingSenderIdentity[] {
  return [...identities.values()]
    .filter((i) => i.organizationId === organizationId)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function seedMemoryIfEmpty(organizationId: string) {
  if (listMemory(organizationId).length > 0) return;
  const next = buildDefaultIdentity(organizationId);
  identities.set(next.id, next);
}

async function withTestOrgLock<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
  const previous = testOrgLocks.get(organizationId) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  testOrgLocks.set(
    organizationId,
    previous.then(() => held).catch(() => undefined),
  );
  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
  }
}

async function withOrgSenderLock<T>(
  organizationId: string,
  fn: (table: SenderIdentityPrismaDelegate) => Promise<T>,
): Promise<T> {
  if (testDelegate) {
    try {
      return await withTestOrgLock(organizationId, () => fn(testDelegate as SenderIdentityPrismaDelegate));
    } catch (err) {
      if (isBusinessError(err)) throw err;
      if ((err as { code?: string } | null)?.code === "SENDER_IDENTITY_PERSISTENCE_FAILED") throw err;
      persistenceFailed(err);
    }
  }
  if (!isEnterprisePersistencePrisma()) {
    persistenceFailed(new Error("Sender identity Prisma delegate is unavailable"));
  }
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}), hashtext(${SENDER_IDENTITY_LOCK_KEY}))`;
      const table = tx.enterpriseMarketingSenderIdentity as unknown as SenderIdentityPrismaDelegate;
      return await fn(table);
    });
  } catch (err) {
    if (isBusinessError(err)) throw err;
    persistenceFailed(err);
  }
}

async function seedIfOrganizationEmpty(table: SenderIdentityPrismaDelegate, organizationId: string) {
  const existing = await table.findFirst({ where: { organizationId } });
  if (existing) return;
  try {
    await table.create({ data: toRow(buildDefaultIdentity(organizationId)) });
  } catch (err) {
    if (isSenderPrimaryKeyConflict(err)) {
      const raced = await table.findFirst({ where: { organizationId } });
      if (raced) return;
    }
    persistenceFailed(err);
  }
}

async function findActiveFromAddress(
  table: SenderIdentityPrismaDelegate,
  organizationId: string,
  fromAddress: string,
  excludeId?: string,
): Promise<SenderRow | null> {
  return table.findFirst({
    where: {
      organizationId,
      fromAddress,
      active: true,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
}

type UpsertInput = {
  organizationId: string;
  id?: string;
  displayName: string;
  fromAddress: string;
  replyTo?: string | null;
  channel?: MarketingSenderIdentity["channel"];
  active?: boolean;
  isDefault?: boolean;
  simulated?: boolean;
  approvalStatus?: MarketingSenderApprovalStatus;
  verificationStatus?: MarketingSenderIdentity["verificationStatus"];
  permittedCampaignCategories?: string[];
  providerType?: MarketingSenderIdentity["providerMapping"]["providerType"];
  providerProfileId?: string | null;
  createdByUserId?: string | null;
};

function composeNext(
  input: UpsertInput,
  existing: MarketingSenderIdentity | undefined,
): MarketingSenderIdentity {
  const ts = nowIso();
  const providerType = input.providerType ?? existing?.providerMapping.providerType ?? "dry_run";
  const simulated = input.simulated ?? existing?.simulated ?? true;
  const verificationStatus = input.verificationStatus ?? existing?.verificationStatus ?? "PENDING";
  if (simulated && verificationStatus === "VERIFIED") {
    throw Object.assign(new Error("Simulated sender identities cannot be marked verified"), {
      statusCode: 400,
      code: MARKETING_SENDER_SIMULATED_NOT_VERIFIED,
    });
  }
  if (existing && existing.organizationId !== input.organizationId) {
    throw Object.assign(new Error("Sender identity not found"), { statusCode: 404, code: "NOT_FOUND" });
  }
  const id =
    input.id ??
    existing?.id ??
    `mkt-sender-${input.organizationId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    organizationId: input.organizationId,
    displayName: input.displayName.trim(),
    fromAddress: input.fromAddress.trim().toLowerCase(),
    replyTo: input.replyTo?.trim() ?? existing?.replyTo ?? null,
    channel: input.channel ?? existing?.channel ?? "EMAIL",
    active: input.active ?? existing?.active ?? true,
    isDefault: input.isDefault ?? existing?.isDefault ?? false,
    simulated,
    approvalStatus: input.approvalStatus ?? existing?.approvalStatus ?? "DRAFT",
    verificationStatus,
    permittedCampaignCategories:
      input.permittedCampaignCategories ?? existing?.permittedCampaignCategories ?? ["Unspecified"],
    createdByUserId: existing?.createdByUserId ?? input.createdByUserId ?? null,
    approvedByUserId: existing?.approvedByUserId ?? null,
    approvedAt: existing?.approvedAt ?? null,
    lastValidationAt: ts,
    validationFreshUntil: new Date(Date.now() + MARKETING_DELIVERABILITY_FRESHNESS_MS).toISOString(),
    providerMapping: {
      providerType,
      providerProfileId: input.providerProfileId ?? existing?.providerMapping.providerProfileId ?? null,
      credentialConfigured: credentialConfigured(providerType),
    },
    createdAt: existing?.createdAt ?? ts,
    updatedAt: ts,
  };
}

function duplicateFromAddressError(): never {
  throw Object.assign(new Error("A sender identity with this from address already exists"), {
    statusCode: 409,
    code: "DUPLICATE_SENDER_FROM_ADDRESS",
  });
}

export const marketingSenderIdentityStore = {
  async list(organizationId: string): Promise<MarketingSenderIdentity[]> {
    if (usePrismaPersistence()) {
      return withOrgSenderLock(organizationId, async (table) => {
        await seedIfOrganizationEmpty(table, organizationId);
        const rows = await table.findMany({
          where: { organizationId },
          orderBy: { displayName: "asc" },
        });
        return rows.map(mapRow);
      });
    }
    seedMemoryIfEmpty(organizationId);
    return listMemory(organizationId);
  },

  async get(id: string, organizationId: string): Promise<MarketingSenderIdentity | null> {
    if (usePrismaPersistence()) {
      return withOrgSenderLock(organizationId, async (table) => {
        const row = await table.findFirst({ where: { id, organizationId } });
        return row ? mapRow(row) : null;
      });
    }
    const item = identities.get(id);
    if (!item || item.organizationId !== organizationId) return null;
    return item;
  },

  async getDefaultActive(organizationId: string): Promise<MarketingSenderIdentity | null> {
    const listed = await this.list(organizationId);
    return listed.find((i) => i.isDefault && i.active) ?? listed.find((i) => i.active) ?? null;
  },

  async resolveByFromAddress(organizationId: string, fromAddress: string): Promise<MarketingSenderIdentity | null> {
    const listed = await this.list(organizationId);
    const normalized = fromAddress.trim().toLowerCase();
    return listed.find((i) => i.fromAddress.trim().toLowerCase() === normalized && i.active) ?? null;
  },

  async upsert(input: UpsertInput): Promise<MarketingSenderIdentity> {
    if (usePrismaPersistence()) {
      return withOrgSenderLock(input.organizationId, async (table) => {
        const prior = input.id
          ? await table.findFirst({ where: { id: input.id, organizationId: input.organizationId } })
          : null;
        const next = composeNext(input, prior ? mapRow(prior) : undefined);
        const duplicate = await findActiveFromAddress(table, input.organizationId, next.fromAddress, next.id);
        if (duplicate) duplicateFromAddressError();
        const row = toRow(next);
        const { id, ...data } = row;
        if (next.isDefault) {
          await table.updateMany({
            where: { organizationId: input.organizationId, id: { not: next.id } },
            data: { isDefault: false, updatedAt: new Date(next.updatedAt) },
          });
        }
        if (prior) await table.update({ where: { id }, data });
        else await table.create({ data: row });
        const saved = await table.findFirst({ where: { id, organizationId: input.organizationId } });
        if (!saved) persistenceFailed(new Error("Sender identity write did not persist"));
        return mapRow(saved);
      });
    }

    const existing = input.id ? identities.get(input.id) : undefined;
    if (existing && existing.organizationId !== input.organizationId) {
      throw Object.assign(new Error("Sender identity not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const next = composeNext(input, existing?.organizationId === input.organizationId ? existing : undefined);
    const duplicate = listMemory(input.organizationId).find(
      (row) => row.active && row.fromAddress === next.fromAddress && row.id !== next.id,
    );
    if (duplicate) duplicateFromAddressError();
    if (next.isDefault) {
      for (const row of identities.values()) {
        if (row.organizationId === input.organizationId && row.id !== next.id && row.isDefault) {
          identities.set(row.id, { ...row, isDefault: false, updatedAt: next.updatedAt });
        }
      }
    }
    identities.set(next.id, next);
    return next;
  },

  async approve(input: {
    organizationId: string;
    id: string;
    actorUserId?: string | null;
  }): Promise<MarketingSenderIdentity> {
    const applyApprove = (row: MarketingSenderIdentity): MarketingSenderIdentity => {
      if (row.simulated) {
        throw Object.assign(new Error("Simulated fixture senders cannot be approved for production-capable execution"), {
          statusCode: 400,
          code: MARKETING_SENDER_SIMULATED_NOT_VERIFIED,
        });
      }
      const ts = nowIso();
      return {
        ...row,
        approvalStatus: "APPROVED",
        approvedByUserId: input.actorUserId ?? null,
        approvedAt: ts,
        updatedAt: ts,
      };
    };

    if (usePrismaPersistence()) {
      return withOrgSenderLock(input.organizationId, async (table) => {
        const prior = await table.findFirst({ where: { id: input.id, organizationId: input.organizationId } });
        if (!prior) {
          throw Object.assign(new Error("Sender identity not found"), { statusCode: 404, code: "NOT_FOUND" });
        }
        const next = applyApprove(mapRow(prior));
        const persistRow = toRow(next);
        const { id, ...data } = persistRow;
        await table.update({ where: { id }, data });
        const saved = await table.findFirst({ where: { id, organizationId: input.organizationId } });
        if (!saved) persistenceFailed(new Error("Sender identity approval did not persist"));
        return mapRow(saved);
      });
    }

    const row = identities.get(input.id);
    if (!row || row.organizationId !== input.organizationId) {
      throw Object.assign(new Error("Sender identity not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const next = applyApprove(row);
    identities.set(row.id, next);
    return next;
  },

  toPublicDto(identity: MarketingSenderIdentity) {
    return {
      id: identity.id,
      organizationId: identity.organizationId,
      displayName: identity.displayName,
      fromAddress: identity.fromAddress,
      replyTo: identity.replyTo,
      channel: identity.channel,
      active: identity.active,
      isDefault: identity.isDefault,
      simulated: identity.simulated,
      approvalStatus: identity.approvalStatus,
      verificationStatus: identity.verificationStatus,
      permittedCampaignCategories: identity.permittedCampaignCategories,
      createdByUserId: identity.createdByUserId,
      approvedByUserId: identity.approvedByUserId,
      approvedAt: identity.approvedAt,
      lastValidationAt: identity.lastValidationAt,
      validationFreshUntil: identity.validationFreshUntil,
      providerMapping: {
        providerType: identity.providerMapping.providerType,
        providerProfileId: identity.providerMapping.providerProfileId,
        credentialConfigured: identity.providerMapping.credentialConfigured,
      },
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
    };
  },

  reset(): void {
    identities.clear();
  },
};
