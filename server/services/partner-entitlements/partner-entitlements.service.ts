/**
 * CO-WP-ACCESS-001 — Wealth Partner Access & Entitlements service (Catalyst One SSOT).
 */
import { Prisma } from "@prisma/client";
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  PARTNER_ENTITLEMENT_TEMPLATE_SEEDS,
  PARTNER_EXECUTION_MODES,
  type PartnerEntitlementAction,
  type PartnerExecutionMode,
  type PartnerModuleVisibilityMap,
  type PartnerPermissionMap,
} from "@/constants/enterprise-partner-entitlements";
import {
  hasEntitlement,
  normalizeModuleVisibility,
  normalizePermissionMap,
  resolveEffectiveEntitlements,
  templateSeedForMode,
} from "@/lib/enterprise-partner-entitlements";
import type {
  PartnerEffectiveEntitlements,
  PartnerEntitlementAuditEntry,
  PartnerEntitlementEntityKind,
  PartnerEntitlementProfileDto,
  PartnerEntitlementTemplateDto,
  PartnerTransactionEntitlementDto,
} from "@/types/enterprise-partner-entitlements";
import { PartnerGatewayError } from "@server/services/partner-gateway/partner-binding.service";
import {
  memoPartnerEntitlements,
  memoPartnerTemplates,
} from "@server/services/partner-gateway/partner-request-memo";

function assertDb() {
  if (!isDatabaseAvailable()) {
    throw new PartnerGatewayError(
      "Enterprise services are currently unavailable.",
      "ENTERPRISE_UNAVAILABLE",
      503,
    );
  }
}

function asMode(raw: string | null | undefined): PartnerExecutionMode {
  const v = String(raw || "referral").toLowerCase();
  return (PARTNER_EXECUTION_MODES as readonly string[]).includes(v)
    ? (v as PartnerExecutionMode)
    : "referral";
}

function mapTemplate(row: {
  id: string;
  organizationId: string;
  code: string;
  label: string;
  description: string | null;
  executionMode: string;
  permissionsJson: unknown;
  modulesJson: unknown;
  isSystem: boolean;
  enabled: boolean;
  versionNumber: number;
  updatedAt: Date;
}): PartnerEntitlementTemplateDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    label: row.label,
    description: row.description ?? "",
    executionMode: asMode(row.executionMode),
    permissions: normalizePermissionMap(row.permissionsJson),
    modules: normalizeModuleVisibility(row.modulesJson),
    isSystem: row.isSystem,
    versionNumber: row.versionNumber,
    enabled: row.enabled,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapProfile(row: {
  id: string;
  organizationId: string;
  wealthPartnerId: string;
  templateId: string | null;
  defaultExecutionMode: string;
  permissionsJson: unknown;
  modulesJson: unknown;
  notes: string | null;
  versionNumber: number;
  updatedAt: Date;
  template?: { code: string } | null;
}): PartnerEntitlementProfileDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    wealthPartnerId: row.wealthPartnerId,
    templateId: row.templateId,
    templateCode: row.template?.code ?? null,
    defaultExecutionMode: asMode(row.defaultExecutionMode),
    permissions: normalizePermissionMap(row.permissionsJson),
    modules: normalizeModuleVisibility(row.modulesJson),
    notes: row.notes,
    versionNumber: row.versionNumber,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapTxn(row: {
  id: string;
  organizationId: string;
  wealthPartnerId: string;
  entityKind: string;
  entityId: string;
  executionMode: string;
  permissionsJson: unknown;
  reason: string | null;
  versionNumber: number;
  updatedAt: Date;
}): PartnerTransactionEntitlementDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    wealthPartnerId: row.wealthPartnerId,
    entityKind: row.entityKind === "deal" ? "deal" : "opportunity",
    entityId: row.entityId,
    executionMode: asMode(row.executionMode),
    permissions: normalizePermissionMap(row.permissionsJson),
    reason: row.reason,
    versionNumber: row.versionNumber,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function writeAudit(input: {
  organizationId: string;
  wealthPartnerId?: string | null;
  changeType: string;
  targetKind: string;
  targetId: string;
  previousValue: unknown;
  newValue: unknown;
  reason?: string | null;
  actorUserId: string;
  actorLabel: string;
}) {
  await prisma.partnerEntitlementAudit.create({
    data: {
      organizationId: input.organizationId,
      wealthPartnerId: input.wealthPartnerId ?? null,
      changeType: input.changeType,
      targetKind: input.targetKind,
      targetId: input.targetId,
      previousValue:
        input.previousValue === undefined
          ? Prisma.JsonNull
          : (input.previousValue as Prisma.InputJsonValue),
      newValue:
        input.newValue === undefined
          ? Prisma.JsonNull
          : (input.newValue as Prisma.InputJsonValue),
      reason: input.reason ?? null,
      actorUserId: input.actorUserId,
      actorLabel: input.actorLabel,
    },
  });
}

async function ensureSystemTemplatesUncached(
  orgId: string,
  actor: { userId: string; label: string },
): Promise<PartnerEntitlementTemplateDto[]> {
  /** CO-WP-PERF-005 — one findMany instead of N sequential findUnique. */
  const seedCodes = PARTNER_ENTITLEMENT_TEMPLATE_SEEDS.map((s) => s.code);
  const existingRows = await prisma.partnerEntitlementTemplate.findMany({
    where: { organizationId: orgId, code: { in: seedCodes } },
  });
  const byCode = new Map(existingRows.map((r) => [r.code, r]));
  const out: PartnerEntitlementTemplateDto[] = [];

  const missing = PARTNER_ENTITLEMENT_TEMPLATE_SEEDS.filter((s) => !byCode.has(s.code));
  if (missing.length > 0) {
    const created = await Promise.all(
      missing.map((seed) =>
        prisma.partnerEntitlementTemplate.create({
          data: {
            organizationId: orgId,
            code: seed.code,
            label: seed.label,
            description: seed.description,
            executionMode: seed.executionMode,
            permissionsJson: seed.permissions,
            modulesJson: seed.modules,
            isSystem: true,
            enabled: true,
            createdBy: actor.userId,
            modifiedBy: actor.userId,
          },
        }),
      ),
    );
    await Promise.all(
      created.map((row) =>
        writeAudit({
          organizationId: orgId,
          changeType: "template_seeded",
          targetKind: "template",
          targetId: row.id,
          previousValue: null,
          newValue: mapTemplate(row),
          actorUserId: actor.userId,
          actorLabel: actor.label,
          reason: "System template seed",
        }),
      ),
    );
    for (const row of created) byCode.set(row.code, row);
  }

  for (const seed of PARTNER_ENTITLEMENT_TEMPLATE_SEEDS) {
    const row = byCode.get(seed.code);
    if (row) out.push(mapTemplate(row));
  }
  return out;
}

export const partnerEntitlementsService = {
  async ensureSystemTemplates(
    organizationId?: string,
    actor = { userId: "system", label: "System" },
  ): Promise<PartnerEntitlementTemplateDto[]> {
    assertDb();
    const orgId = organizationId || (await resolvePilotOrganizationId());
    return memoPartnerTemplates(orgId, () => ensureSystemTemplatesUncached(orgId, actor));
  },

  async listTemplates(organizationId?: string): Promise<PartnerEntitlementTemplateDto[]> {
    assertDb();
    const orgId = organizationId || (await resolvePilotOrganizationId());
    await this.ensureSystemTemplates(orgId);
    const rows = await prisma.partnerEntitlementTemplate.findMany({
      where: { organizationId: orgId },
      orderBy: [{ isSystem: "desc" }, { code: "asc" }],
    });
    return rows.map(mapTemplate);
  },

  async updateTemplate(
    templateId: string,
    input: {
      label?: string;
      description?: string;
      permissions?: Partial<PartnerPermissionMap>;
      modules?: Partial<PartnerModuleVisibilityMap>;
      enabled?: boolean;
      reason?: string;
    },
    actor: { userId: string; label: string },
  ): Promise<PartnerEntitlementTemplateDto> {
    assertDb();
    const existing = await prisma.partnerEntitlementTemplate.findUnique({
      where: { id: templateId },
    });
    if (!existing) {
      throw new PartnerGatewayError("Template not found", "NOT_FOUND", 404);
    }
    const permissions = normalizePermissionMap(existing.permissionsJson);
    const modules = normalizeModuleVisibility(existing.modulesJson);
    if (input.permissions) {
      for (const [k, v] of Object.entries(input.permissions)) {
        if (typeof v === "boolean") permissions[k as PartnerEntitlementAction] = v;
      }
    }
    if (input.modules) {
      for (const [k, v] of Object.entries(input.modules)) {
        if (typeof v === "boolean") {
          modules[k as keyof PartnerModuleVisibilityMap] = v;
        }
      }
    }
    const updated = await prisma.partnerEntitlementTemplate.update({
      where: { id: templateId },
      data: {
        label: input.label?.trim() || existing.label,
        description:
          input.description !== undefined ? input.description : existing.description,
        permissionsJson: permissions,
        modulesJson: modules,
        enabled: input.enabled ?? existing.enabled,
        versionNumber: existing.versionNumber + 1,
        modifiedBy: actor.userId,
      },
    });
    await writeAudit({
      organizationId: existing.organizationId,
      changeType: "template_updated",
      targetKind: "template",
      targetId: templateId,
      previousValue: mapTemplate(existing),
      newValue: mapTemplate(updated),
      reason: input.reason ?? null,
      actorUserId: actor.userId,
      actorLabel: actor.label,
    });
    return mapTemplate(updated);
  },

  async listPartnersWithProfiles(organizationId?: string) {
    assertDb();
    const orgId = organizationId || (await resolvePilotOrganizationId());
    await this.ensureSystemTemplates(orgId);
    const partners = await prisma.enterpriseWealthPartner.findMany({
      where: { organizationId: orgId, isDeleted: false },
      orderBy: { displayName: "asc" },
      take: 500,
      select: {
        id: true,
        code: true,
        displayName: true,
        partnerType: true,
        lifecycleStatus: true,
        operationalStatus: true,
        entitlementProfile: {
          include: { template: { select: { code: true } } },
        },
      },
    });
    return partners.map((p) => ({
      id: p.id,
      code: p.code,
      displayName: p.displayName,
      partnerType: p.partnerType,
      lifecycleStatus: p.lifecycleStatus,
      operationalStatus: p.operationalStatus,
      profile: p.entitlementProfile ? mapProfile(p.entitlementProfile) : null,
    }));
  },

  async getOrCreateProfile(
    wealthPartnerId: string,
    actor: { userId: string; label: string },
    templateCode?: string,
  ): Promise<PartnerEntitlementProfileDto> {
    assertDb();
    const partner = await prisma.enterpriseWealthPartner.findFirst({
      where: { id: wealthPartnerId, isDeleted: false },
    });
    if (!partner) {
      throw new PartnerGatewayError("Wealth Partner not found", "NOT_FOUND", 404);
    }
    const existing = await prisma.partnerEntitlementProfile.findUnique({
      where: { wealthPartnerId },
      include: { template: { select: { code: true } } },
    });
    if (existing) return mapProfile(existing);

    await this.ensureSystemTemplates(partner.organizationId, actor);
    const code = templateCode || "REFERRAL_PARTNER";
    const template = await prisma.partnerEntitlementTemplate.findUnique({
      where: {
        organizationId_code: {
          organizationId: partner.organizationId,
          code,
        },
      },
    });
    const seed = templateSeedForMode(asMode(template?.executionMode));
    const created = await prisma.partnerEntitlementProfile.create({
      data: {
        organizationId: partner.organizationId,
        wealthPartnerId,
        templateId: template?.id ?? null,
        defaultExecutionMode: template?.executionMode ?? seed.executionMode,
        permissionsJson: template
          ? normalizePermissionMap(template.permissionsJson)
          : seed.permissions,
        modulesJson: template
          ? normalizeModuleVisibility(template.modulesJson)
          : seed.modules,
        createdBy: actor.userId,
        modifiedBy: actor.userId,
      },
      include: { template: { select: { code: true } } },
    });
    await writeAudit({
      organizationId: partner.organizationId,
      wealthPartnerId,
      changeType: "profile_created",
      targetKind: "profile",
      targetId: created.id,
      previousValue: null,
      newValue: mapProfile(created),
      actorUserId: actor.userId,
      actorLabel: actor.label,
      reason: `Initialized from template ${code}`,
    });
    return mapProfile(created);
  },

  async updateProfile(
    wealthPartnerId: string,
    input: {
      templateId?: string | null;
      templateCode?: string;
      defaultExecutionMode?: PartnerExecutionMode;
      permissions?: Partial<PartnerPermissionMap>;
      modules?: Partial<PartnerModuleVisibilityMap>;
      notes?: string | null;
      reason?: string;
      applyTemplateDefaults?: boolean;
    },
    actor: { userId: string; label: string },
  ): Promise<PartnerEntitlementProfileDto> {
    assertDb();
    let profile = await prisma.partnerEntitlementProfile.findUnique({
      where: { wealthPartnerId },
      include: { template: { select: { code: true } } },
    });
    if (!profile) {
      await this.getOrCreateProfile(wealthPartnerId, actor, input.templateCode);
      profile = await prisma.partnerEntitlementProfile.findUnique({
        where: { wealthPartnerId },
        include: { template: { select: { code: true } } },
      });
    }
    if (!profile) {
      throw new PartnerGatewayError("Profile not found", "NOT_FOUND", 404);
    }

    let templateId = input.templateId !== undefined ? input.templateId : profile.templateId;
    let templateRow = templateId
      ? await prisma.partnerEntitlementTemplate.findUnique({ where: { id: templateId } })
      : null;
    if (input.templateCode) {
      templateRow = await prisma.partnerEntitlementTemplate.findUnique({
        where: {
          organizationId_code: {
            organizationId: profile.organizationId,
            code: input.templateCode,
          },
        },
      });
      templateId = templateRow?.id ?? null;
    }

    let permissions = normalizePermissionMap(profile.permissionsJson);
    let modules = normalizeModuleVisibility(profile.modulesJson);
    let mode = asMode(input.defaultExecutionMode ?? profile.defaultExecutionMode);

    if (input.applyTemplateDefaults && templateRow) {
      permissions = normalizePermissionMap(templateRow.permissionsJson);
      modules = normalizeModuleVisibility(templateRow.modulesJson);
      mode = asMode(templateRow.executionMode);
    }
    if (input.permissions) {
      for (const [k, v] of Object.entries(input.permissions)) {
        if (typeof v === "boolean") permissions[k as PartnerEntitlementAction] = v;
      }
    }
    if (input.modules) {
      for (const [k, v] of Object.entries(input.modules)) {
        if (typeof v === "boolean") {
          modules[k as keyof PartnerModuleVisibilityMap] = v;
        }
      }
    }

    const updated = await prisma.partnerEntitlementProfile.update({
      where: { wealthPartnerId },
      data: {
        templateId,
        defaultExecutionMode: mode,
        permissionsJson: permissions,
        modulesJson: modules,
        notes: input.notes !== undefined ? input.notes : profile.notes,
        versionNumber: profile.versionNumber + 1,
        modifiedBy: actor.userId,
      },
      include: { template: { select: { code: true } } },
    });
    await writeAudit({
      organizationId: profile.organizationId,
      wealthPartnerId,
      changeType: "profile_updated",
      targetKind: "profile",
      targetId: updated.id,
      previousValue: mapProfile(profile),
      newValue: mapProfile(updated),
      reason: input.reason ?? null,
      actorUserId: actor.userId,
      actorLabel: actor.label,
    });
    return mapProfile(updated);
  },

  async upsertTransactionEntitlement(
    input: {
      wealthPartnerId: string;
      entityKind: PartnerEntitlementEntityKind;
      entityId: string;
      executionMode: PartnerExecutionMode;
      permissions: Partial<PartnerPermissionMap>;
      reason?: string;
    },
    actor: { userId: string; label: string },
  ): Promise<PartnerTransactionEntitlementDto> {
    assertDb();
    const partner = await prisma.enterpriseWealthPartner.findFirst({
      where: { id: input.wealthPartnerId, isDeleted: false },
    });
    if (!partner) {
      throw new PartnerGatewayError("Wealth Partner not found", "NOT_FOUND", 404);
    }
    const existing = await prisma.partnerTransactionEntitlement.findUnique({
      where: {
        wealthPartnerId_entityKind_entityId: {
          wealthPartnerId: input.wealthPartnerId,
          entityKind: input.entityKind,
          entityId: input.entityId,
        },
      },
    });
    const permissions = normalizePermissionMap(
      existing?.permissionsJson,
      templateSeedForMode(input.executionMode).permissions,
    );
    for (const [k, v] of Object.entries(input.permissions)) {
      if (typeof v === "boolean") permissions[k as PartnerEntitlementAction] = v;
    }

    const row = existing
      ? await prisma.partnerTransactionEntitlement.update({
          where: { id: existing.id },
          data: {
            executionMode: input.executionMode,
            permissionsJson: permissions,
            reason: input.reason ?? existing.reason,
            versionNumber: existing.versionNumber + 1,
            modifiedBy: actor.userId,
          },
        })
      : await prisma.partnerTransactionEntitlement.create({
          data: {
            organizationId: partner.organizationId,
            wealthPartnerId: input.wealthPartnerId,
            entityKind: input.entityKind,
            entityId: input.entityId,
            executionMode: input.executionMode,
            permissionsJson: permissions,
            reason: input.reason ?? null,
            createdBy: actor.userId,
            modifiedBy: actor.userId,
          },
        });

    await writeAudit({
      organizationId: partner.organizationId,
      wealthPartnerId: input.wealthPartnerId,
      changeType: existing ? "transaction_override_updated" : "transaction_override_created",
      targetKind: "transaction_entitlement",
      targetId: row.id,
      previousValue: existing ? mapTxn(existing) : null,
      newValue: mapTxn(row),
      reason: input.reason ?? null,
      actorUserId: actor.userId,
      actorLabel: actor.label,
    });
    return mapTxn(row);
  },

  async listTransactionEntitlements(
    wealthPartnerId: string,
  ): Promise<PartnerTransactionEntitlementDto[]> {
    assertDb();
    const rows = await prisma.partnerTransactionEntitlement.findMany({
      where: { wealthPartnerId },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return rows.map(mapTxn);
  },

  async listAudits(input: {
    wealthPartnerId?: string;
    organizationId?: string;
    limit?: number;
  }): Promise<PartnerEntitlementAuditEntry[]> {
    assertDb();
    const orgId = input.organizationId || (await resolvePilotOrganizationId());
    const rows = await prisma.partnerEntitlementAudit.findMany({
      where: {
        organizationId: orgId,
        ...(input.wealthPartnerId ? { wealthPartnerId: input.wealthPartnerId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(input.limit ?? 50, 200),
    });
    return rows.map((r) => ({
      id: r.id,
      wealthPartnerId: r.wealthPartnerId ?? "",
      changeType: r.changeType,
      previousValue: r.previousValue,
      newValue: r.newValue,
      reason: r.reason,
      actorUserId: r.actorUserId,
      createdAt: r.createdAt.toISOString(),
    }));
  },

  /**
   * Runtime resolve — used by Partner Gateway enforcement.
   * Falls back to Referral template seed when DB profile missing (fail-closed on actions except view/activity defaults).
   */
  async resolveForPartner(input: {
    wealthPartnerId: string;
    organizationId: string;
    entityKind?: PartnerEntitlementEntityKind | null;
    entityId?: string | null;
  }): Promise<PartnerEffectiveEntitlements> {
    const memoKey = [
      input.wealthPartnerId,
      input.organizationId,
      input.entityKind ?? "",
      input.entityId ?? "",
    ].join(":");
    return memoPartnerEntitlements(memoKey, () =>
      resolveForPartnerUncached(input),
    );
  },

  async assertEntitlement(input: {
    wealthPartnerId: string;
    organizationId: string;
    action: PartnerEntitlementAction;
    entityKind?: PartnerEntitlementEntityKind | null;
    entityId?: string | null;
  }): Promise<PartnerEffectiveEntitlements> {
    const effective = await this.resolveForPartner(input);
    if (!hasEntitlement(effective, input.action)) {
      throw new PartnerGatewayError(
        `Not entitled to perform action: ${input.action}`,
        "FORBIDDEN",
        403,
      );
    }
    return effective;
  },
};

async function resolveForPartnerUncached(input: {
  wealthPartnerId: string;
  organizationId: string;
  entityKind?: PartnerEntitlementEntityKind | null;
  entityId?: string | null;
}): Promise<PartnerEffectiveEntitlements> {
    if (!isDatabaseAvailable()) {
      const seed = templateSeedForMode("referral");
      return resolveEffectiveEntitlements({
        wealthPartnerId: input.wealthPartnerId,
        organizationId: input.organizationId,
        defaultExecutionMode: "referral",
        templateCode: seed.code,
        partnerPermissions: seed.permissions,
        partnerModules: seed.modules,
        transaction: null,
      });
    }

    /**
     * CO-WP-PERF-005 — run template ensure + profile (+ optional txn) concurrently.
     * Effective merge logic unchanged (resolveEffectiveEntitlements).
     */
    const profilePromise = prisma.partnerEntitlementProfile.findUnique({
      where: { wealthPartnerId: input.wealthPartnerId },
      include: { template: true },
    });
    const templatesPromise = partnerEntitlementsService
      .ensureSystemTemplates(input.organizationId)
      .catch(() => null);
    const txnPromise =
      input.entityKind && input.entityId
        ? prisma.partnerTransactionEntitlement.findUnique({
            where: {
              wealthPartnerId_entityKind_entityId: {
                wealthPartnerId: input.wealthPartnerId,
                entityKind: input.entityKind,
                entityId: input.entityId,
              },
            },
          })
        : Promise.resolve(null);

    const [profile, , txn] = await Promise.all([
      profilePromise,
      templatesPromise,
      txnPromise,
    ]);

    const defaultMode = asMode(profile?.defaultExecutionMode);
    const partnerPermissions = profile
      ? normalizePermissionMap(profile.permissionsJson)
      : templateSeedForMode(defaultMode).permissions;
    const partnerModules = profile
      ? normalizeModuleVisibility(profile.modulesJson)
      : templateSeedForMode(defaultMode).modules;

    let transaction: {
      entityKind: PartnerEntitlementEntityKind;
      entityId: string;
      executionMode: PartnerExecutionMode;
      permissions: Partial<PartnerPermissionMap>;
    } | null = null;

    if (txn && input.entityKind && input.entityId) {
      transaction = {
        entityKind: input.entityKind,
        entityId: input.entityId,
        executionMode: asMode(txn.executionMode),
        permissions: normalizePermissionMap(txn.permissionsJson),
      };
    }

    return resolveEffectiveEntitlements({
      wealthPartnerId: input.wealthPartnerId,
      organizationId: input.organizationId,
      defaultExecutionMode: defaultMode,
      templateCode: profile?.template?.code ?? null,
      partnerPermissions,
      partnerModules,
      transaction,
    });
}
