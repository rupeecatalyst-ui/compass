import { Prisma, type DurablePolicyStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@server/lib/prisma";
import type { CreditRiskAuditEntry, CreditRiskPolicySummary, PolicyRuleReference } from "@/types/credit-risk-engine";

const ruleRefSchema = z.object({
  ruleId: z.string().min(1), ruleCode: z.string().min(1), ruleName: z.string().min(1),
  sectionId: z.enum(["financial", "property", "banking", "bureau", "customer", "geography", "compliance", "custom"]),
  majorVersion: z.number().int().nonnegative(), minorVersion: z.number().int().nonnegative(),
  sortOrder: z.number().int().nonnegative(),
});

export const policyDraftSchema = z.object({
  policyCode: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/),
  policyName: z.string().trim().min(1).max(200),
  description: z.string().max(2000),
  lenderId: z.string().min(1), lenderName: z.string().max(200),
  productId: z.string().min(1), productName: z.string().max(200),
  customerCategoryId: z.string().optional(), customerCategoryName: z.string().optional(),
  priority: z.number().int().min(0).max(1000), approvalAuthority: z.string().max(200),
  effectiveFrom: z.string().optional(), effectiveTo: z.string().optional(),
  ruleRefs: z.array(ruleRefSchema).max(200),
});

export type PolicyDraft = z.infer<typeof policyDraftSchema>;
type PolicyRow = Prisma.EnterpriseCreditRiskPolicyGetPayload<{ include: { versions: true } }>;
export type DurablePolicyAdminRecord = CreditRiskPolicySummary & { ruleRefs: PolicyRuleReference[] };
export type DurablePolicyAdminDetails = DurablePolicyAdminRecord & {
  versions: DurablePolicyAdminRecord[];
  auditEvents: CreditRiskAuditEntry[];
};

export class PolicyAdminError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) { super(message); }
}

const lifecycle: DurablePolicyStatus[] = ["draft", "validated", "testing", "approved", "published"];

export function canTransitionDurablePolicy(from: DurablePolicyStatus, to: DurablePolicyStatus): boolean {
  return lifecycle.indexOf(to) === lifecycle.indexOf(from) + 1;
}

function latest(row: PolicyRow) {
  return row.versions.reduce((best, version) => version.versionNumber > best.versionNumber ? version : best);
}

function mapRecord(row: PolicyRow): DurablePolicyAdminRecord {
  const version = latest(row);
  const payload = version.payload && typeof version.payload === "object" && !Array.isArray(version.payload)
    ? version.payload as Record<string, unknown> : {};
  const refs = Array.isArray(payload.ruleRefs) ? payload.ruleRefs : [];
  const ruleRefs = z.array(ruleRefSchema).safeParse(refs);
  return {
    id: version.id, policyId: row.id, policyCode: row.policyCode, policyName: row.name,
    majorVersion: version.versionNumber, minorVersion: 0,
    status: version.status as CreditRiskPolicySummary["status"],
    description: typeof payload.description === "string" ? payload.description : "",
    priority: typeof payload.priority === "number" ? payload.priority : 50,
    approvalAuthority: typeof payload.approvalAuthority === "string" ? payload.approvalAuthority : "",
    lenderId: row.lenderId ?? "", lenderName: typeof payload.lenderName === "string" ? payload.lenderName : "",
    productId: row.productCode ?? "", productName: typeof payload.productName === "string" ? payload.productName : "",
    customerCategoryId: typeof payload.customerCategoryId === "string" ? payload.customerCategoryId : undefined,
    customerCategoryName: typeof payload.customerCategoryName === "string" ? payload.customerCategoryName : undefined,
    effectiveFrom: version.effectiveFrom?.toISOString(), effectiveTo: version.effectiveUntil?.toISOString(),
    createdBy: version.createdBy, approvedBy: version.approvedBy ?? undefined,
    publishedBy: version.publishedBy ?? undefined, publishedDate: version.publishedAt?.toISOString(),
    lastModified: version.updatedAt.toISOString(),
    ruleRefs: ruleRefs.success ? ruleRefs.data.map((ref, index) => ({ ...ref, id: `${version.id}:${index}`, policyId: row.id })) : [],
  };
}

async function validateMasters(organizationId: string, draft: PolicyDraft) {
  const [lender, product] = await Promise.all([
    prisma.enterpriseLender.findFirst({ where: { id: draft.lenderId, organizationId, isDeleted: false, enabled: true }, select: { displayName: true, label: true } }),
    prisma.enterpriseProduct.findFirst({ where: { code: draft.productId, organizationId, isDeleted: false, enabled: true }, select: { label: true } }),
  ]);
  if (!lender || !product) throw new PolicyAdminError(400, "INVALID_POLICY_MASTER", "Select an active organization lender and product.");
  draft.lenderName = lender.displayName || lender.label;
  draft.productName = product.label;
}

function asPayload(draft: PolicyDraft): Prisma.InputJsonObject {
  return {
    description: draft.description, priority: draft.priority, approvalAuthority: draft.approvalAuthority,
    lenderName: draft.lenderName, productName: draft.productName,
    customerCategoryId: draft.customerCategoryId ?? null, customerCategoryName: draft.customerCategoryName ?? null,
    ruleRefs: draft.ruleRefs,
  } as Prisma.InputJsonObject;
}

function asDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new PolicyAdminError(400, "INVALID_POLICY_DATE", "Enter a valid effective date.");
  return date;
}

export const policyAdminService = {
  async list(organizationId: string): Promise<DurablePolicyAdminRecord[]> {
    const rows = await prisma.enterpriseCreditRiskPolicy.findMany({
      where: { organizationId, isDeleted: false }, include: { versions: true }, orderBy: { updatedAt: "desc" },
    });
    return rows.filter(row => row.versions.length > 0).map(mapRecord);
  },
  async get(organizationId: string, policyId: string): Promise<DurablePolicyAdminDetails> {
    const row = await prisma.enterpriseCreditRiskPolicy.findFirst({
      where: { id: policyId, organizationId, isDeleted: false }, include: { versions: true },
    });
    if (!row || !row.versions.length) throw new PolicyAdminError(404, "POLICY_NOT_FOUND", "Policy not found.");
    const auditRows = await prisma.enterpriseCreditRiskPolicyAuditEvent.findMany({
      where: { organizationId, policyId }, orderBy: { createdAt: "desc" },
    });
    return {
      ...mapRecord(row),
      versions: row.versions.sort((a, b) => b.versionNumber - a.versionNumber).map(version => mapRecord({ ...row, versions: [version] })),
      auditEvents: auditRows.map(event => ({
        id: event.id, policyId, policyName: row.name,
        versionLabel: `v${row.versions.find(version => version.id === event.versionId)?.versionNumber ?? 1}.0`,
        actor: event.actorName ?? event.actorUserId, action: event.action,
        timestamp: event.createdAt.toISOString(), field: "status",
        oldValue: event.previousValue ? JSON.stringify(event.previousValue) : undefined,
        newValue: event.newValue ? JSON.stringify(event.newValue) : undefined,
      })),
    };
  },
  async save(organizationId: string, actorUserId: string, raw: unknown, policyId?: string): Promise<DurablePolicyAdminRecord> {
    const draft = policyDraftSchema.parse(raw);
    await validateMasters(organizationId, draft);
    const effectiveFrom = asDate(draft.effectiveFrom);
    const effectiveUntil = asDate(draft.effectiveTo);
    if (effectiveFrom && effectiveUntil && effectiveUntil < effectiveFrom) throw new PolicyAdminError(400, "INVALID_POLICY_DATES", "Effective end must follow effective start.");
    const policy = await prisma.$transaction(async tx => {
      if (!policyId) {
        const created = await tx.enterpriseCreditRiskPolicy.create({
          data: {
            organizationId, policyCode: draft.policyCode, name: draft.policyName,
            lenderId: draft.lenderId, productCode: draft.productId, status: "draft",
            createdBy: actorUserId, modifiedBy: actorUserId,
            versions: { create: { organizationId, versionNumber: 1, status: "draft", payload: asPayload(draft),
              eligibilityRules: {}, creditRules: {}, effectiveFrom, effectiveUntil, createdBy: actorUserId } },
          }, include: { versions: true },
        });
        await tx.enterpriseCreditRiskPolicyAuditEvent.create({ data: { organizationId, policyId: created.id,
          versionId: created.versions[0].id, action: "created", actorUserId, reason: "policy_admin_create",
          newValue: { status: "draft", versionNumber: 1 } } });
        return created;
      }
      const current = await tx.enterpriseCreditRiskPolicy.findFirst({
        where: { id: policyId, organizationId, isDeleted: false }, include: { versions: true },
      });
      if (!current || !current.versions.length) throw new PolicyAdminError(404, "POLICY_NOT_FOUND", "Policy not found.");
      const version = latest(current);
      if (version.status !== "draft" && version.status !== "published") throw new PolicyAdminError(409, "POLICY_NOT_EDITABLE", "Only a draft can be edited.");
      if (version.status === "published") {
        await tx.enterpriseCreditRiskPolicyVersion.create({ data: { organizationId, policyId,
          versionNumber: version.versionNumber + 1, status: "draft", payload: asPayload(draft),
          eligibilityRules: {}, creditRules: {}, effectiveFrom, effectiveUntil, createdBy: actorUserId } });
      } else {
        await tx.enterpriseCreditRiskPolicyVersion.update({ where: { id: version.id }, data: {
          payload: asPayload(draft), effectiveFrom, effectiveUntil } });
      }
      const updated = await tx.enterpriseCreditRiskPolicy.update({ where: { id: policyId }, data: {
        policyCode: draft.policyCode, name: draft.policyName, lenderId: draft.lenderId,
        productCode: draft.productId, modifiedBy: actorUserId,
      }, include: { versions: true } });
      await tx.enterpriseCreditRiskPolicyAuditEvent.create({ data: { organizationId, policyId,
        versionId: latest(updated).id, action: "updated", actorUserId, reason: "policy_admin_save",
        newValue: { versionNumber: latest(updated).versionNumber } } });
      return updated;
    });
    return mapRecord(policy);
  },
  async transition(organizationId: string, actorUserId: string, policyId: string, to: DurablePolicyStatus): Promise<DurablePolicyAdminRecord> {
    if (!lifecycle.includes(to)) throw new PolicyAdminError(400, "INVALID_POLICY_STATUS", "Invalid lifecycle status.");
    const row = await prisma.$transaction(async tx => {
      const current = await tx.enterpriseCreditRiskPolicy.findFirst({
        where: { id: policyId, organizationId, isDeleted: false }, include: { versions: true },
      });
      if (!current || !current.versions.length) throw new PolicyAdminError(404, "POLICY_NOT_FOUND", "Policy not found.");
      const version = latest(current);
      if (!canTransitionDurablePolicy(version.status, to)) {
        throw new PolicyAdminError(409, "INVALID_POLICY_TRANSITION", "Complete the preceding lifecycle step first.");
      }
      const now = new Date();
      const changed = await tx.enterpriseCreditRiskPolicyVersion.updateMany({ where: { id: version.id, status: version.status }, data: {
        status: to,
        ...(to === "approved" ? { approvedBy: actorUserId, approvedAt: now } : {}),
        ...(to === "published" ? { publishedBy: actorUserId, publishedAt: now } : {}),
      } });
      if (changed.count !== 1) throw new PolicyAdminError(409, "POLICY_CHANGED", "Policy status changed. Refresh and try again.");
      const updated = await tx.enterpriseCreditRiskPolicy.update({ where: { id: policyId }, data: {
        status: to === "published" ? "published" : current.status,
        currentPublishedVersionId: to === "published" ? version.id : current.currentPublishedVersionId,
        modifiedBy: actorUserId,
      }, include: { versions: true } });
      await tx.enterpriseCreditRiskPolicyAuditEvent.create({ data: { organizationId, policyId,
        versionId: version.id, action: to, actorUserId, reason: "policy_admin_transition",
        previousValue: { status: version.status }, newValue: { status: to } } });
      return updated;
    });
    return mapRecord(row);
  },
};
