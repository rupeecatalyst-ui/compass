/**
 * CO-ORG-001 — Enterprise Organization Workspace service.
 */
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  isFinancialDocumentType,
  mapOrgDocCategoryToRepositoryKey,
} from "@/constants/corporate-compliance-center";
import type {
  OrganizationActivityEventDto,
  OrganizationAuditEntryDto,
  OrganizationBankAccountCreateBody,
  OrganizationBankAccountDto,
  OrganizationBankAccountPatch,
  OrganizationBusinessConfigDto,
  OrganizationBusinessConfigPatch,
  OrganizationDigitalSignatureCreateBody,
  OrganizationDigitalSignatureDto,
  OrganizationDigitalSignaturePatch,
  OrganizationDirectorCreateBody,
  OrganizationDirectorDto,
  OrganizationDirectorPatch,
  OrganizationDocumentDto,
  OrganizationDocumentPatchBody,
  OrganizationDocumentTemplateTypeDto,
  OrganizationDocumentUploadBody,
  OrganizationDocumentVersionDto,
  OrganizationProfileDto,
  OrganizationProfilePatch,
  OrganizationSealDto,
  OrganizationSealPatch,
  OrganizationSecurityConfigDto,
  OrganizationSecurityConfigPatch,
  OrganizationSettingsDto,
  OrganizationSettingsPatch,
  OrganizationWorkspaceActor,
} from "@/types/enterprise-organization-workspace";
import { Prisma } from "@prisma/client";
import type { OrgDocCategoryId } from "@/types/organization-documents";
import {
  resolvePilotOrganizationId,
} from "@server/repositories/ecm/organization.repository";
import { organizationWorkspaceRepository as repo } from "@server/repositories/organization-workspace/organization-workspace.repository";

function asInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asNullableInputJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value == null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export const MAX_ORG_DOCUMENT_BYTES = 4 * 1024 * 1024;

export class OrganizationWorkspaceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "OrganizationWorkspaceError";
  }
}

function guardPrisma() {
  if (!isEnterprisePersistencePrisma()) {
    throw new OrganizationWorkspaceError(
      "Organization workspace requires ENTERPRISE_PERSISTENCE_MODE=prisma",
      "PERSISTENCE_REQUIRED",
      503,
    );
  }
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "RC";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function asJsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function parseVersionsJson(value: unknown): OrganizationDocumentVersionDto[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is OrganizationDocumentVersionDto => {
      return (
        !!v &&
        typeof v === "object" &&
        typeof (v as OrganizationDocumentVersionDto).id === "string" &&
        typeof (v as OrganizationDocumentVersionDto).version === "number"
      );
    })
    .map((v) => ({
      id: v.id,
      version: v.version,
      originalFilename: v.originalFilename,
      fileSizeBytes: v.fileSizeBytes,
      mimeType: v.mimeType,
      uploadedBy: v.uploadedBy,
      uploadedAt: v.uploadedAt,
    }));
}

function decodeBase64Content(contentBase64: string): Buffer {
  const raw = contentBase64.includes(",") ? contentBase64.split(",").pop()! : contentBase64;
  const buf = Buffer.from(raw, "base64");
  if (buf.length > MAX_ORG_DOCUMENT_BYTES) {
    throw new OrganizationWorkspaceError(
      `Document exceeds ${MAX_ORG_DOCUMENT_BYTES} byte limit`,
      "DOCUMENT_TOO_LARGE",
      413,
    );
  }
  return buf;
}

function newVersionId() {
  return `odv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function newTypeCode() {
  return `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

async function writeAudit(
  organizationId: string,
  actor: OrganizationWorkspaceActor,
  input: {
    action: string;
    entityType: string;
    entityId: string;
    previousValue?: unknown;
    newValue?: unknown;
    justification?: string;
  },
) {
  await repo.createAuditEntry({
    organization: { connect: { id: organizationId } },
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    previousValue: input.previousValue ?? undefined,
    newValue: input.newValue ?? undefined,
    actorUserId: actor.userId,
    actorName: actor.displayName,
    justification: input.justification,
  });
}

async function writeActivity(
  organizationId: string,
  actor: OrganizationWorkspaceActor,
  input: {
    title: string;
    description?: string;
    eventType: string;
    entityType?: string;
    entityId?: string;
  },
) {
  const row = await repo.createActivityEvent({
    organization: { connect: { id: organizationId } },
    title: input.title,
    description: input.description,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    actorUserId: actor.userId,
    actorName: actor.displayName,
  });

  // CO-ORG-003 — dual-write Org MDM activity → Enterprise Activity Registry
  try {
    const { enterpriseActivityService } = await import(
      "@server/services/enterprise-activity/enterprise-activity.service"
    );
    const kind =
      input.eventType.includes("document") || input.entityType === "document"
        ? ("documents" as const)
        : ("workflow" as const);
    await enterpriseActivityService.emitBestEffort({
      eventKind: kind,
      sourceSystem: "org",
      sourceEventId: row.id,
      title: input.title,
      summary: input.description ?? input.eventType,
      payload: {
        orgEventType: input.eventType,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
      actorUserId: actor.userId,
      actorName: actor.displayName,
      occurredAt: row.occurredAt,
    });
  } catch {
    /* fail-open */
  }
}

function mapProfile(row: Awaited<ReturnType<typeof repo.findProfile>>): OrganizationProfileDto | null {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    companyName: row.companyName,
    legalEntityName: row.legalEntityName,
    brandName: row.brandName,
    logoInitials: row.logoInitials,
    logoDocumentId: row.logoDocumentId,
    gst: row.gst,
    pan: row.pan,
    cin: row.cin,
    msme: row.msme,
    incorporationDate: row.incorporationDate,
    incorporationDetails: row.incorporationDetails,
    registeredAddress: row.registeredAddress,
    corporateAddress: row.corporateAddress,
    website: row.website,
    phoneNumbers: asStringArray(row.phoneNumbersJson),
    officialEmails: asStringArray(row.officialEmailsJson),
    emailDomains: asStringArray(row.emailDomainsJson),
    socialLinks: asRecord(row.socialLinksJson),
    versionNumber: row.versionNumber,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSettings(row: Awaited<ReturnType<typeof repo.findSettings>>): OrganizationSettingsDto | null {
  if (!row) return null;
  const workingHoursRaw = asJsonObject(row.workingHoursJson);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workingDays: asStringArray(row.workingDaysJson),
    workingHours: {
      start: typeof workingHoursRaw.start === "string" ? workingHoursRaw.start : "09:30",
      end: typeof workingHoursRaw.end === "string" ? workingHoursRaw.end : "18:30",
      timeZone: typeof workingHoursRaw.timeZone === "string" ? workingHoursRaw.timeZone : row.timeZone,
    },
    holidayCalendar: asJsonArray(row.holidayCalendarJson),
    financialYearStartMonth: row.financialYearStartMonth,
    timeZone: row.timeZone,
    currency: row.currency,
    numberFormat: row.numberFormat,
    dateFormat: row.dateFormat,
    versionNumber: row.versionNumber,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapBusinessConfig(
  row: Awaited<ReturnType<typeof repo.findBusinessConfig>>,
): OrganizationBusinessConfigDto | null {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    businessType: row.businessType,
    productsOffered: asJsonArray(row.productsOfferedJson),
    operatingStates: asJsonArray(row.operatingStatesJson),
    branches: asJsonArray(row.branchesJson),
    departments: asJsonArray(row.departmentsJson),
    teams: asJsonArray(row.teamsJson),
    designations: asJsonArray(row.designationsJson),
    rolesConfig: asJsonArray(row.rolesConfigJson),
    hierarchy: asJsonArray(row.hierarchyJson),
    versionNumber: row.versionNumber,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSecurityConfig(
  row: Awaited<ReturnType<typeof repo.findSecurityConfig>>,
): OrganizationSecurityConfigDto | null {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    permissions: asJsonArray(row.permissionsJson),
    featureFlags: asJsonObject(row.featureFlagsJson),
    defaults: asJsonObject(row.defaultsJson),
    branding: asJsonObject(row.brandingJson),
    versionNumber: row.versionNumber,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapDirector(row: Awaited<ReturnType<typeof repo.listDirectors>>[number]): OrganizationDirectorDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    designation: row.designation,
    din: row.din,
    pan: row.pan,
    email: row.email,
    mobile: row.mobile,
    status: row.status,
    photographInitials: row.photographInitials,
    address: row.address,
    documents: asJsonArray(row.documentsJson),
    sortOrder: row.sortOrder,
    isDeleted: row.isDeleted,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapBankAccount(
  row: Awaited<ReturnType<typeof repo.listBankAccounts>>[number],
): OrganizationBankAccountDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    bank: row.bank,
    branch: row.branch,
    accountNumber: row.accountNumber,
    ifsc: row.ifsc,
    isCurrentAccount: row.isCurrentAccount,
    cancelledChequeAvailable: row.cancelledChequeAvailable,
    isPrimary: row.isPrimary,
    isDeleted: row.isDeleted,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapDigitalSignature(
  row: Awaited<ReturnType<typeof repo.listDigitalSignatures>>[number],
): OrganizationDigitalSignatureDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    person: row.person,
    designation: row.designation,
    status: row.status,
    expiry: row.expiry,
    initials: row.initials,
    isDeleted: row.isDeleted,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSeal(row: Awaited<ReturnType<typeof repo.findSeal>>): OrganizationSealDto | null {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    lastUpdated: row.lastUpdated,
    version: row.version,
    initials: row.initials,
    documentId: row.documentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapDocument(
  row: Awaited<ReturnType<typeof repo.listDocuments>>[number],
  includeContentMeta = false,
): OrganizationDocumentDto {
  const tags = asStringArray(row.tagsJson);
  const versions = parseVersionsJson(row.versionsJson);
  const linkedPackageIds = Array.isArray(row.linkedPackageIdsJson)
    ? (row.linkedPackageIdsJson as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  return {
    id: row.id,
    organizationId: row.organizationId,
    clientRecordId: row.clientRecordId,
    originalFilename: row.originalFilename,
    displayName: row.displayName,
    categoryId: row.categoryId as OrgDocCategoryId,
    documentTypeId: row.documentTypeId,
    documentTypeLabel: row.documentTypeLabel,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    status: row.status as OrganizationDocumentDto["status"],
    versionNumber: row.versionNumber,
    tags,
    versions,
    uploadedBy: row.uploadedBy,
    uploadedAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    hasContent: includeContentMeta ? row.contentBytes != null : row.contentBytes != null,
    legalEntityId: row.legalEntityId,
    repositoryKey: row.repositoryKey,
    financialYear: row.financialYear,
    isCurrentFinancialVersion: row.isCurrentFinancialVersion,
    effectiveDate: row.effectiveDate?.toISOString() ?? null,
    expiryDate: row.expiryDate?.toISOString() ?? null,
    approvalStatus: row.approvalStatus,
    confidentiality: row.confidentiality,
    supersededByDocumentId: row.supersededByDocumentId,
    linkedPackageIds,
  };
}

function mapTemplateType(
  row: Awaited<ReturnType<typeof repo.listTemplateTypes>>[number],
): OrganizationDocumentTemplateTypeDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    typeCode: row.typeCode,
    label: row.label,
    sortOrder: row.sortOrder,
    isDeleted: row.isDeleted,
    categoryId: "templates",
    system: false,
  };
}

export const organizationWorkspaceService = {
  async resolvePilotOrganizationId(): Promise<string> {
    guardPrisma();
    return resolvePilotOrganizationId();
  },

  async getOrBootstrapProfile(actor: OrganizationWorkspaceActor): Promise<OrganizationProfileDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findProfile(organizationId);
    if (existing) return mapProfile(existing)!;

    const org = await repo.findOrganizationById(organizationId);
    const orgName = org?.name ?? "Organization";
    const brandName = orgName;
    const initials = deriveInitials(brandName);

    const created = await repo.createProfile({
      organization: { connect: { id: organizationId } },
      companyName: orgName,
      legalEntityName: orgName,
      brandName,
      logoInitials: initials,
      gst: "",
      pan: "",
      cin: "",
      msme: "",
      website: "",
      phoneNumbersJson: [],
      officialEmailsJson: [],
      emailDomainsJson: [],
      socialLinksJson: {},
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });

    await writeActivity(organizationId, actor, {
      title: "Organization profile initialized",
      description: "Company profile bootstrapped from organization registry.",
      eventType: "profile.bootstrap",
      entityType: "profile",
      entityId: created.id,
    });

    return mapProfile(created)!;
  },

  async updateProfile(
    patch: OrganizationProfilePatch,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationProfileDto> {
    guardPrisma();
    const current = await this.getOrBootstrapProfile(actor);
    const organizationId = current.organizationId;
    const previous = { ...current };

    const updated = await repo.updateProfile(organizationId, {
      companyName: patch.companyName,
      legalEntityName: patch.legalEntityName,
      brandName: patch.brandName,
      logoInitials: patch.logoInitials,
      logoDocumentId: patch.logoDocumentId,
      gst: patch.gst,
      pan: patch.pan,
      cin: patch.cin,
      msme: patch.msme,
      incorporationDate: patch.incorporationDate,
      incorporationDetails: patch.incorporationDetails,
      registeredAddress: patch.registeredAddress,
      corporateAddress: patch.corporateAddress,
      website: patch.website,
      phoneNumbersJson: patch.phoneNumbers != null ? asInputJson(patch.phoneNumbers) : undefined,
      officialEmailsJson: patch.officialEmails != null ? asInputJson(patch.officialEmails) : undefined,
      emailDomainsJson: patch.emailDomains != null ? asInputJson(patch.emailDomains) : undefined,
      socialLinksJson: patch.socialLinks != null ? asInputJson(patch.socialLinks) : undefined,
      versionNumber: { increment: 1 },
      modifiedBy: actor.userId,
    });

    const dto = mapProfile(updated)!;
    await writeAudit(organizationId, actor, {
      action: "profile.update",
      entityType: "profile",
      entityId: dto.id,
      previousValue: previous,
      newValue: dto,
    });
    await writeActivity(organizationId, actor, {
      title: "Company profile updated",
      eventType: "profile.update",
      entityType: "profile",
      entityId: dto.id,
    });
    return dto;
  },

  async getOrBootstrapSettings(actor: OrganizationWorkspaceActor): Promise<OrganizationSettingsDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findSettings(organizationId);
    if (existing) return mapSettings(existing)!;

    const created = await repo.createSettings({
      organization: { connect: { id: organizationId } },
      workingDaysJson: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      workingHoursJson: { start: "09:30", end: "18:30", timeZone: "Asia/Kolkata" },
      holidayCalendarJson: [],
      financialYearStartMonth: 4,
      timeZone: "Asia/Kolkata",
      currency: "INR",
      numberFormat: "en-IN",
      dateFormat: "dd/MM/yyyy",
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });
    return mapSettings(created)!;
  },

  async updateSettings(
    patch: OrganizationSettingsPatch,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationSettingsDto> {
    guardPrisma();
    const current = await this.getOrBootstrapSettings(actor);
    const organizationId = current.organizationId;
    const previous = { ...current };

    const updated = await repo.updateSettings(organizationId, {
      workingDaysJson: patch.workingDays != null ? asInputJson(patch.workingDays) : undefined,
      workingHoursJson: patch.workingHours != null ? asInputJson(patch.workingHours) : undefined,
      holidayCalendarJson: patch.holidayCalendar != null ? asInputJson(patch.holidayCalendar) : undefined,
      financialYearStartMonth: patch.financialYearStartMonth,
      timeZone: patch.timeZone,
      currency: patch.currency,
      numberFormat: patch.numberFormat,
      dateFormat: patch.dateFormat,
      versionNumber: { increment: 1 },
      modifiedBy: actor.userId,
    });

    const dto = mapSettings(updated)!;
    await writeAudit(organizationId, actor, {
      action: "settings.update",
      entityType: "settings",
      entityId: dto.id,
      previousValue: previous,
      newValue: dto,
    });
    return dto;
  },

  async getOrBootstrapBusinessConfig(
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationBusinessConfigDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findBusinessConfig(organizationId);
    if (existing) return mapBusinessConfig(existing)!;

    const created = await repo.createBusinessConfig({
      organization: { connect: { id: organizationId } },
      businessType: "NBFC / DSA / Financial Services",
      productsOfferedJson: [],
      operatingStatesJson: [],
      branchesJson: [],
      departmentsJson: [],
      teamsJson: [],
      designationsJson: [],
      rolesConfigJson: [],
      hierarchyJson: [],
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });
    return mapBusinessConfig(created)!;
  },

  async updateBusinessConfig(
    patch: OrganizationBusinessConfigPatch,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationBusinessConfigDto> {
    guardPrisma();
    const current = await this.getOrBootstrapBusinessConfig(actor);
    const organizationId = current.organizationId;
    const previous = { ...current };

    const updated = await repo.updateBusinessConfig(organizationId, {
      businessType: patch.businessType,
      productsOfferedJson: patch.productsOffered != null ? asInputJson(patch.productsOffered) : undefined,
      operatingStatesJson: patch.operatingStates != null ? asInputJson(patch.operatingStates) : undefined,
      branchesJson: patch.branches != null ? asInputJson(patch.branches) : undefined,
      departmentsJson: patch.departments != null ? asInputJson(patch.departments) : undefined,
      teamsJson: patch.teams != null ? asInputJson(patch.teams) : undefined,
      designationsJson: patch.designations != null ? asInputJson(patch.designations) : undefined,
      rolesConfigJson: patch.rolesConfig != null ? asInputJson(patch.rolesConfig) : undefined,
      hierarchyJson: patch.hierarchy != null ? asInputJson(patch.hierarchy) : undefined,
      versionNumber: { increment: 1 },
      modifiedBy: actor.userId,
    });

    const dto = mapBusinessConfig(updated)!;
    await writeAudit(organizationId, actor, {
      action: "business_config.update",
      entityType: "business_config",
      entityId: dto.id,
      previousValue: previous,
      newValue: dto,
    });
    return dto;
  },

  async getOrBootstrapSecurityConfig(
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationSecurityConfigDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findSecurityConfig(organizationId);
    if (existing) return mapSecurityConfig(existing)!;

    const profile = await this.getOrBootstrapProfile(actor);
    const created = await repo.createSecurityConfig({
      organization: { connect: { id: organizationId } },
      permissionsJson: [],
      featureFlagsJson: {},
      defaultsJson: {},
      brandingJson: { brandName: profile.brandName },
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });
    return mapSecurityConfig(created)!;
  },

  async updateSecurityConfig(
    patch: OrganizationSecurityConfigPatch,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationSecurityConfigDto> {
    guardPrisma();
    const current = await this.getOrBootstrapSecurityConfig(actor);
    const organizationId = current.organizationId;
    const previous = { ...current };

    const updated = await repo.updateSecurityConfig(organizationId, {
      permissionsJson: patch.permissions != null ? asInputJson(patch.permissions) : undefined,
      featureFlagsJson: patch.featureFlags != null ? asInputJson(patch.featureFlags) : undefined,
      defaultsJson: patch.defaults != null ? asInputJson(patch.defaults) : undefined,
      brandingJson: patch.branding != null ? asInputJson(patch.branding) : undefined,
      versionNumber: { increment: 1 },
      modifiedBy: actor.userId,
    });

    const dto = mapSecurityConfig(updated)!;
    await writeAudit(organizationId, actor, {
      action: "security_config.update",
      entityType: "security_config",
      entityId: dto.id,
      previousValue: previous,
      newValue: dto,
    });
    return dto;
  },

  async listDirectors(): Promise<OrganizationDirectorDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const rows = await repo.listDirectors(organizationId);
    return rows.map(mapDirector);
  },

  async createDirector(
    body: OrganizationDirectorCreateBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationDirectorDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const created = await repo.createDirector({
      organization: { connect: { id: organizationId } },
      name: body.name,
      designation: body.designation ?? "",
      din: body.din ?? "",
      pan: body.pan ?? "",
      email: body.email ?? "",
      mobile: body.mobile ?? "",
      status: body.status ?? "active",
      photographInitials: body.photographInitials ?? deriveInitials(body.name),
      address: body.address,
      documentsJson: asInputJson(body.documents ?? []),
      sortOrder: body.sortOrder ?? 0,
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });
    const dto = mapDirector(created);
    await writeAudit(organizationId, actor, {
      action: "director.create",
      entityType: "director",
      entityId: dto.id,
      newValue: dto,
    });
    await writeActivity(organizationId, actor, {
      title: `Director added: ${dto.name}`,
      eventType: "director.create",
      entityType: "director",
      entityId: dto.id,
    });
    return dto;
  },

  async updateDirector(
    directorId: string,
    patch: OrganizationDirectorPatch,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationDirectorDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findDirector(organizationId, directorId);
    if (!existing) {
      throw new OrganizationWorkspaceError("Director not found", "DIRECTOR_NOT_FOUND", 404);
    }
    const previous = mapDirector(existing);
    const updated = await repo.updateDirector(directorId, {
      name: patch.name,
      designation: patch.designation,
      din: patch.din,
      pan: patch.pan,
      email: patch.email,
      mobile: patch.mobile,
      status: patch.status,
      photographInitials: patch.photographInitials,
      address: patch.address,
      documentsJson: patch.documents != null ? asInputJson(patch.documents) : undefined,
      sortOrder: patch.sortOrder,
      modifiedBy: actor.userId,
    });
    const dto = mapDirector(updated);
    await writeAudit(organizationId, actor, {
      action: "director.update",
      entityType: "director",
      entityId: dto.id,
      previousValue: previous,
      newValue: dto,
    });
    return dto;
  },

  async deleteDirector(directorId: string, actor: OrganizationWorkspaceActor): Promise<void> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findDirector(organizationId, directorId);
    if (!existing) {
      throw new OrganizationWorkspaceError("Director not found", "DIRECTOR_NOT_FOUND", 404);
    }
    await repo.softDeleteDirector(directorId, actor.userId);
    await writeAudit(organizationId, actor, {
      action: "director.delete",
      entityType: "director",
      entityId: directorId,
      previousValue: mapDirector(existing),
    });
  },

  async listBankAccounts(): Promise<OrganizationBankAccountDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    return (await repo.listBankAccounts(organizationId)).map(mapBankAccount);
  },

  async createBankAccount(
    body: OrganizationBankAccountCreateBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationBankAccountDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    if (body.isPrimary) {
      const accounts = await repo.listBankAccounts(organizationId);
      for (const acc of accounts) {
        if (acc.isPrimary) {
          await repo.updateBankAccount(acc.id, { isPrimary: false, modifiedBy: actor.userId });
        }
      }
    }
    const created = await repo.createBankAccount({
      organization: { connect: { id: organizationId } },
      bank: body.bank,
      branch: body.branch ?? "",
      accountNumber: body.accountNumber,
      ifsc: body.ifsc ?? "",
      isCurrentAccount: body.isCurrentAccount ?? true,
      cancelledChequeAvailable: body.cancelledChequeAvailable ?? false,
      isPrimary: body.isPrimary ?? false,
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });
    const dto = mapBankAccount(created);
    await writeAudit(organizationId, actor, {
      action: "bank_account.create",
      entityType: "bank_account",
      entityId: dto.id,
      newValue: dto,
    });
    return dto;
  },

  async updateBankAccount(
    accountId: string,
    patch: OrganizationBankAccountPatch,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationBankAccountDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findBankAccount(organizationId, accountId);
    if (!existing) {
      throw new OrganizationWorkspaceError("Bank account not found", "BANK_ACCOUNT_NOT_FOUND", 404);
    }
    if (patch.isPrimary) {
      const accounts = await repo.listBankAccounts(organizationId);
      for (const acc of accounts) {
        if (acc.isPrimary && acc.id !== accountId) {
          await repo.updateBankAccount(acc.id, { isPrimary: false, modifiedBy: actor.userId });
        }
      }
    }
    const previous = mapBankAccount(existing);
    const updated = await repo.updateBankAccount(accountId, {
      bank: patch.bank,
      branch: patch.branch,
      accountNumber: patch.accountNumber,
      ifsc: patch.ifsc,
      isCurrentAccount: patch.isCurrentAccount,
      cancelledChequeAvailable: patch.cancelledChequeAvailable,
      isPrimary: patch.isPrimary,
      modifiedBy: actor.userId,
    });
    const dto = mapBankAccount(updated);
    await writeAudit(organizationId, actor, {
      action: "bank_account.update",
      entityType: "bank_account",
      entityId: dto.id,
      previousValue: previous,
      newValue: dto,
    });
    return dto;
  },

  async deleteBankAccount(accountId: string, actor: OrganizationWorkspaceActor): Promise<void> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findBankAccount(organizationId, accountId);
    if (!existing) {
      throw new OrganizationWorkspaceError("Bank account not found", "BANK_ACCOUNT_NOT_FOUND", 404);
    }
    await repo.softDeleteBankAccount(accountId, actor.userId);
    await writeAudit(organizationId, actor, {
      action: "bank_account.delete",
      entityType: "bank_account",
      entityId: accountId,
      previousValue: mapBankAccount(existing),
    });
  },

  async listDigitalSignatures(): Promise<OrganizationDigitalSignatureDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    return (await repo.listDigitalSignatures(organizationId)).map(mapDigitalSignature);
  },

  async createDigitalSignature(
    body: OrganizationDigitalSignatureCreateBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationDigitalSignatureDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const created = await repo.createDigitalSignature({
      organization: { connect: { id: organizationId } },
      person: body.person,
      designation: body.designation ?? "",
      status: body.status ?? "active",
      expiry: body.expiry ?? "",
      initials: body.initials ?? deriveInitials(body.person),
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });
    const dto = mapDigitalSignature(created);
    await writeAudit(organizationId, actor, {
      action: "digital_signature.create",
      entityType: "digital_signature",
      entityId: dto.id,
      newValue: dto,
    });
    return dto;
  },

  async updateDigitalSignature(
    signatureId: string,
    patch: OrganizationDigitalSignaturePatch,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationDigitalSignatureDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findDigitalSignature(organizationId, signatureId);
    if (!existing) {
      throw new OrganizationWorkspaceError(
        "Digital signature not found",
        "DIGITAL_SIGNATURE_NOT_FOUND",
        404,
      );
    }
    const previous = mapDigitalSignature(existing);
    const updated = await repo.updateDigitalSignature(signatureId, {
      person: patch.person,
      designation: patch.designation,
      status: patch.status,
      expiry: patch.expiry,
      initials: patch.initials,
      modifiedBy: actor.userId,
    });
    const dto = mapDigitalSignature(updated);
    await writeAudit(organizationId, actor, {
      action: "digital_signature.update",
      entityType: "digital_signature",
      entityId: dto.id,
      previousValue: previous,
      newValue: dto,
    });
    return dto;
  },

  async deleteDigitalSignature(signatureId: string, actor: OrganizationWorkspaceActor): Promise<void> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findDigitalSignature(organizationId, signatureId);
    if (!existing) {
      throw new OrganizationWorkspaceError(
        "Digital signature not found",
        "DIGITAL_SIGNATURE_NOT_FOUND",
        404,
      );
    }
    await repo.softDeleteDigitalSignature(signatureId, actor.userId);
    await writeAudit(organizationId, actor, {
      action: "digital_signature.delete",
      entityType: "digital_signature",
      entityId: signatureId,
      previousValue: mapDigitalSignature(existing),
    });
  },

  async getOrBootstrapSeal(actor: OrganizationWorkspaceActor): Promise<OrganizationSealDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findSeal(organizationId);
    if (existing) return mapSeal(existing)!;

    const profile = await this.getOrBootstrapProfile(actor);
    const created = await repo.createSeal({
      organization: { connect: { id: organizationId } },
      lastUpdated: null,
      version: "1",
      initials: profile.logoInitials ?? deriveInitials(profile.brandName),
      documentId: null,
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });
    return mapSeal(created)!;
  },

  async updateSeal(
    patch: OrganizationSealPatch,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationSealDto> {
    guardPrisma();
    const current = await this.getOrBootstrapSeal(actor);
    const organizationId = current.organizationId;
    const previous = { ...current };
    const updated = await repo.updateSeal(organizationId, {
      lastUpdated: patch.lastUpdated ?? new Date().toISOString(),
      version: patch.version,
      initials: patch.initials,
      documentId: patch.documentId,
      modifiedBy: actor.userId,
    });
    const dto = mapSeal(updated)!;
    await writeAudit(organizationId, actor, {
      action: "seal.update",
      entityType: "seal",
      entityId: dto.id,
      previousValue: previous,
      newValue: dto,
    });
    return dto;
  },

  async listDocuments(status?: string): Promise<OrganizationDocumentDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const rows = await repo.listDocuments(organizationId, status);
    return rows.map((r) => mapDocument(r));
  },

  async getDocument(documentId: string): Promise<OrganizationDocumentDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const row = await repo.findDocument(organizationId, documentId);
    if (!row) {
      throw new OrganizationWorkspaceError("Document not found", "DOCUMENT_NOT_FOUND", 404);
    }
    return mapDocument(row);
  },

  async getDocumentContent(documentId: string): Promise<{
    buffer: Buffer;
    mimeType: string;
    originalFilename: string;
  }> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const row = await repo.findDocument(organizationId, documentId);
    if (!row || !row.contentBytes) {
      throw new OrganizationWorkspaceError("Document content not found", "DOCUMENT_CONTENT_NOT_FOUND", 404);
    }
    return {
      buffer: Buffer.from(row.contentBytes),
      mimeType: row.mimeType,
      originalFilename: row.originalFilename,
    };
  },

  async uploadDocuments(
    body: OrganizationDocumentUploadBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationDocumentDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const uploadedBy = actor.displayName ?? actor.userId;
    const createdDocs: OrganizationDocumentDto[] = [];

    for (const file of body.files) {
      const contentBytes = decodeBase64Content(file.contentBase64);
      const now = new Date().toISOString();
      const version: OrganizationDocumentVersionDto = {
        id: newVersionId(),
        version: 1,
        originalFilename: file.originalFilename,
        fileSizeBytes: file.fileSizeBytes,
        mimeType: file.mimeType,
        uploadedBy,
        uploadedAt: now,
      };

      const repositoryKey = mapOrgDocCategoryToRepositoryKey(body.categoryId);
      const row = await repo.createDocument({
        organization: { connect: { id: organizationId } },
        clientRecordId: body.clientRecordId,
        originalFilename: file.originalFilename,
        displayName: file.originalFilename,
        categoryId: body.categoryId,
        documentTypeId: body.documentTypeId,
        documentTypeLabel: body.documentTypeLabel,
        mimeType: file.mimeType,
        fileSizeBytes: file.fileSizeBytes,
        status: "active",
        versionNumber: 1,
        tagsJson: asInputJson(body.tags ?? []),
        contentBytes: new Uint8Array(contentBytes),
        versionsJson: asInputJson([version]),
        repositoryKey: repositoryKey ?? (isFinancialDocumentType(body.documentTypeId) ? "financial" : null),
        uploadedBy,
        createdBy: actor.userId,
        modifiedBy: actor.userId,
      });

      const dto = mapDocument(row);
      createdDocs.push(dto);
      await writeActivity(organizationId, actor, {
        title: `Document uploaded: ${dto.originalFilename}`,
        eventType: "document.upload",
        entityType: "document",
        entityId: dto.id,
      });
    }

    return createdDocs;
  },

  async patchDocument(
    documentId: string,
    patch: OrganizationDocumentPatchBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationDocumentDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findDocument(organizationId, documentId);
    if (!existing) {
      throw new OrganizationWorkspaceError("Document not found", "DOCUMENT_NOT_FOUND", 404);
    }
    const previous = mapDocument(existing);
    const uploadedBy = actor.displayName ?? actor.userId;
    let versionNumber = existing.versionNumber;
    let versionsJson = parseVersionsJson(existing.versionsJson);
    let contentBytes: Uint8Array | undefined;
    let fileSizeBytes = existing.fileSizeBytes;
    let mimeType = existing.mimeType;
    let originalFilename = existing.originalFilename;

    if (patch.contentBase64) {
      contentBytes = new Uint8Array(decodeBase64Content(patch.contentBase64));
      versionNumber += 1;
      originalFilename = patch.originalFilename ?? existing.originalFilename;
      mimeType = patch.mimeType ?? existing.mimeType;
      fileSizeBytes = patch.fileSizeBytes ?? contentBytes.length;
      const version: OrganizationDocumentVersionDto = {
        id: newVersionId(),
        version: versionNumber,
        originalFilename,
        fileSizeBytes,
        mimeType,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
      };
      versionsJson = [version, ...versionsJson];
    }

    const updated = await repo.updateDocument(documentId, {
      status: patch.status,
      categoryId: patch.categoryId,
      documentTypeId: patch.documentTypeId,
      documentTypeLabel: patch.documentTypeLabel,
      tagsJson: patch.tags != null ? asInputJson(patch.tags) : undefined,
      versionNumber,
      versionsJson: asInputJson(versionsJson),
      contentBytes: contentBytes as Prisma.Bytes,
      fileSizeBytes,
      mimeType,
      originalFilename,
      displayName: originalFilename,
      modifiedBy: actor.userId,
    });

    const dto = mapDocument(updated);
    await writeAudit(organizationId, actor, {
      action: patch.contentBase64 ? "document.replace" : "document.update",
      entityType: "document",
      entityId: dto.id,
      previousValue: previous,
      newValue: dto,
    });
    return dto;
  },

  async archiveDocuments(documentIds: string[], actor: OrganizationWorkspaceActor): Promise<number> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    let count = 0;
    for (const id of documentIds) {
      const existing = await repo.findDocument(organizationId, id);
      if (!existing || existing.status === "archived") continue;
      await repo.updateDocument(id, { status: "archived", modifiedBy: actor.userId });
      count += 1;
    }
    if (count > 0) {
      await writeActivity(organizationId, actor, {
        title: `Archived ${count} document${count === 1 ? "" : "s"}`,
        eventType: "document.archive",
        entityType: "document",
      });
    }
    return count;
  },

  async listTemplateTypes(): Promise<OrganizationDocumentTemplateTypeDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    return (await repo.listTemplateTypes(organizationId)).map(mapTemplateType);
  },

  async createTemplateType(
    label: string,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationDocumentTemplateTypeDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.listTemplateTypes(organizationId);
    const maxOrder = existing.reduce((m, t) => Math.max(m, t.sortOrder), 0);
    const created = await repo.createTemplateType({
      organization: { connect: { id: organizationId } },
      typeCode: newTypeCode(),
      label: label.trim(),
      sortOrder: maxOrder + 1,
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });
    return mapTemplateType(created);
  },

  async updateTemplateType(
    templateId: string,
    label: string,
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationDocumentTemplateTypeDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findTemplateType(organizationId, templateId);
    if (!existing) {
      throw new OrganizationWorkspaceError("Template type not found", "TEMPLATE_NOT_FOUND", 404);
    }
    const updated = await repo.updateTemplateType(templateId, {
      label: label.trim(),
      modifiedBy: actor.userId,
    });
    return mapTemplateType(updated);
  },

  async deleteTemplateType(templateId: string, actor: OrganizationWorkspaceActor): Promise<void> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findTemplateType(organizationId, templateId);
    if (!existing) {
      throw new OrganizationWorkspaceError("Template type not found", "TEMPLATE_NOT_FOUND", 404);
    }
    await repo.softDeleteTemplateType(templateId, actor.userId);
  },

  async reorderTemplateTypes(
    orderedIds: string[],
    actor: OrganizationWorkspaceActor,
  ): Promise<OrganizationDocumentTemplateTypeDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const types = await repo.listTemplateTypes(organizationId);
    const byId = new Map(types.map((t) => [t.id, t]));
    let order = 0;
    for (const id of orderedIds) {
      if (!byId.has(id)) continue;
      order += 1;
      await repo.updateTemplateType(id, { sortOrder: order, modifiedBy: actor.userId });
    }
    for (const t of types) {
      if (!orderedIds.includes(t.id)) {
        order += 1;
        await repo.updateTemplateType(t.id, { sortOrder: order, modifiedBy: actor.userId });
      }
    }
    return this.listTemplateTypes();
  },

  async listActivity(limit = 50): Promise<OrganizationActivityEventDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const rows = await repo.listActivityEvents(organizationId, limit);
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      title: r.title,
      description: r.description,
      eventType: r.eventType,
      entityType: r.entityType,
      entityId: r.entityId,
      actorUserId: r.actorUserId,
      actorName: r.actorName,
      occurredAt: r.occurredAt.toISOString(),
    }));
  },

  async listAudit(limit = 100): Promise<OrganizationAuditEntryDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const rows = await repo.listAuditEntries(organizationId, limit);
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      previousValue: r.previousValue,
      newValue: r.newValue,
      actorUserId: r.actorUserId,
      actorName: r.actorName,
      justification: r.justification,
      occurredAt: r.occurredAt.toISOString(),
    }));
  },
};
