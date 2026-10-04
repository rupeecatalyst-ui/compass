/**
 * CO-MARKETING-REDESIGN-002 — Prisma client surface for durable Marketing models.
 * Avoids importing generated client fields that do not exist until migrate + generate.
 */

export type PrismaWriteCount = { count: number };

export type MarketingPrismaDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  findFirst: (args: Record<string, unknown>) => Promise<unknown | null>;
  findUnique?: (args: Record<string, unknown>) => Promise<unknown | null>;
  create: (args: Record<string, unknown>) => Promise<unknown>;
  update: (args: Record<string, unknown>) => Promise<unknown>;
  updateMany: (args: Record<string, unknown>) => Promise<PrismaWriteCount>;
  upsert: (args: Record<string, unknown>) => Promise<unknown>;
};

export type MarketingDurabilityPrismaSurface = {
  $transaction: <T>(fn: (tx: MarketingDurabilityPrismaSurface) => Promise<T>) => Promise<T>;
  enterpriseMarketingSheetBinding: MarketingPrismaDelegate;
  enterpriseMarketingAudienceDefinition: MarketingPrismaDelegate;
  enterpriseMarketingAudienceSnapshot: MarketingPrismaDelegate;
  enterpriseMarketingSnapshotRecipient: MarketingPrismaDelegate;
  enterpriseMarketingDeliveryBatch: MarketingPrismaDelegate;
  enterpriseMarketingRecipientLedger: MarketingPrismaDelegate;
  enterpriseMarketingExecutionLease: MarketingPrismaDelegate;
  enterpriseMarketingSuppression: MarketingPrismaDelegate;
  enterpriseMarketingEngagementEvent: MarketingPrismaDelegate;
  enterpriseMarketingTestSend: MarketingPrismaDelegate;
  enterpriseMarketingQualification: MarketingPrismaDelegate;
  enterpriseMarketingAuditEvent: MarketingPrismaDelegate;
};

const REQUIRED_DELEGATES: Array<keyof Omit<MarketingDurabilityPrismaSurface, "$transaction">> = [
  "enterpriseMarketingSheetBinding",
  "enterpriseMarketingAudienceDefinition",
  "enterpriseMarketingAudienceSnapshot",
  "enterpriseMarketingSnapshotRecipient",
  "enterpriseMarketingDeliveryBatch",
  "enterpriseMarketingRecipientLedger",
  "enterpriseMarketingExecutionLease",
  "enterpriseMarketingSuppression",
  "enterpriseMarketingEngagementEvent",
  "enterpriseMarketingTestSend",
  "enterpriseMarketingQualification",
  "enterpriseMarketingAuditEvent",
];

export function asMarketingDurabilityPrisma(client: object | null | undefined): MarketingDurabilityPrismaSurface | null {
  if (!client || typeof client !== "object") return null;
  const record = client as Record<string, unknown>;
  if (typeof record.$transaction !== "function") return null;
  for (const key of REQUIRED_DELEGATES) {
    const delegate = record[key];
    if (!delegate || typeof delegate !== "object") return null;
    const methods = delegate as Record<string, unknown>;
    if (typeof methods.findFirst !== "function") return null;
    if (typeof methods.create !== "function") return null;
    if (typeof methods.updateMany !== "function") return null;
  }
  return client as MarketingDurabilityPrismaSurface;
}

export function isPrismaUniqueConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "P2002";
}
