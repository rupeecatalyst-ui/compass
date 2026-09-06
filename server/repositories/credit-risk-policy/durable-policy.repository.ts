import { prisma } from "@server/lib/prisma";
import { randomUUID } from "node:crypto";
import type { DurablePolicyVersionRecord } from "@/types/product-programme-operations";

function mapVersion(row: {
  id: string;
  organizationId: string;
  policyId: string;
  versionNumber: number;
  status: DurablePolicyVersionRecord["status"];
  eligibilityRules: unknown;
  creditRules: unknown;
  payload: unknown;
  sourceRef: string | null;
  effectiveFrom: Date | null;
  reviewAt: Date | null;
  effectiveUntil: Date | null;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  publishedBy: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  policy: { policyCode: string; name: string; lenderId: string | null; productCode: string | null; productVariantCode: string | null };
}): DurablePolicyVersionRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    policyId: row.policyId,
    policyCode: row.policy.policyCode,
    name: row.policy.name,
    lenderId: row.policy.lenderId,
    productCode: row.policy.productCode,
    productVariantCode: row.policy.productVariantCode,
    versionNumber: row.versionNumber,
    status: row.status,
    eligibilityRules: (row.eligibilityRules ?? {}) as Record<string, unknown>,
    creditRules: (row.creditRules ?? {}) as Record<string, unknown>,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    sourceRef: row.sourceRef,
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    reviewAt: row.reviewAt?.toISOString() ?? null,
    effectiveUntil: row.effectiveUntil?.toISOString() ?? null,
    createdBy: row.createdBy,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    publishedBy: row.publishedBy,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const durablePolicyRepository = {
  async createPublishedPolicy(input: {
    organizationId: string;
    actorUserId: string;
    name: string;
    policyCode: string;
    lenderId?: string | null;
    productCode?: string | null;
    eligibilityRules?: Record<string, unknown>;
    creditRules?: Record<string, unknown>;
    sourceRef?: string | null;
  }): Promise<DurablePolicyVersionRecord> {
    const policyId = randomUUID();
    const versionId = randomUUID();
    await prisma.enterpriseCreditRiskPolicy.create({
      data: {
        id: policyId,
        organizationId: input.organizationId,
        policyCode: input.policyCode,
        name: input.name,
        lenderId: input.lenderId ?? null,
        productCode: input.productCode ?? null,
        status: "published",
        currentPublishedVersionId: versionId,
        sourceRef: input.sourceRef ?? null,
        createdBy: input.actorUserId,
        modifiedBy: input.actorUserId,
        versions: {
          create: {
            id: versionId,
            organizationId: input.organizationId,
            versionNumber: 1,
            status: "published",
            eligibilityRules: input.eligibilityRules ?? {},
            creditRules: input.creditRules ?? {},
            payload: {},
            sourceRef: input.sourceRef ?? null,
            createdBy: input.actorUserId,
            approvedBy: input.actorUserId,
            approvedAt: new Date(),
            publishedBy: input.actorUserId,
            publishedAt: new Date(),
          },
        },
        auditEvents: {
          create: {
            organizationId: input.organizationId,
            versionId,
            action: "published",
            actorUserId: input.actorUserId,
            reason: "durable_policy_created",
            newValue: { policyCode: input.policyCode, versionNumber: 1 },
          },
        },
      },
    });
    const version = await prisma.enterpriseCreditRiskPolicyVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { policy: true },
    });
    return mapVersion(version);
  },

  async getVersionById(id: string): Promise<DurablePolicyVersionRecord | null> {
    const row = await prisma.enterpriseCreditRiskPolicyVersion.findUnique({
      where: { id },
      include: { policy: true },
    });
    return row ? mapVersion(row) : null;
  },
};
