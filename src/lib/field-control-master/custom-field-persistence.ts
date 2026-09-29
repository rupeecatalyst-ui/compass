/**
 * Prisma binding for custom-field placement and values.
 * New tables are reached structurally so this file typechecks before prisma generate.
 * It does not connect by itself and does not run migrations.
 */
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";

import {
  CustomFieldPlacementError,
  type PlacementDefinitionRecord,
  type PlacementListFilter,
  type PlacementRow,
  type PlacementStore,
} from "./custom-field-placement";
import {
  CustomFieldValueError,
  type CustomFieldValueRow,
  type CustomFieldValueStore,
} from "./custom-field-value";

type RawPlacement = Omit<PlacementRow, "createdAt" | "updatedAt"> & {
  createdAt: Date | string;
  updatedAt: Date | string;
};

type RawValue = Omit<CustomFieldValueRow, "definitionVersionIdCapturedUnder" | "createdAt" | "updatedAt"> & {
  definitionVersionId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type PlacementDelegate = {
  findFirst: (args: { where: Record<string, unknown> }) => Promise<RawPlacement | null>;
  findMany: (args: { where: Record<string, unknown> }) => Promise<RawPlacement[]>;
  create: (args: { data: Record<string, unknown> }) => Promise<RawPlacement>;
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<RawPlacement>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

type ValueDelegate = {
  findFirst: (args: { where: Record<string, unknown> }) => Promise<RawValue | null>;
  findMany: (args: { where: Record<string, unknown> }) => Promise<RawValue[]>;
  create: (args: { data: Record<string, unknown> }) => Promise<RawValue>;
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<RawValue>;
  delete: (args: { where: Record<string, unknown> }) => Promise<unknown>;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toPlacement(row: RawPlacement): PlacementRow {
  return { ...row, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) };
}

function placementData(row: PlacementRow): Record<string, unknown> {
  return { ...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) };
}

function toValue(row: RawValue): CustomFieldValueRow {
  return {
    id: row.id,
    organizationId: row.organizationId,
    fieldLineageId: row.fieldLineageId,
    fieldId: row.fieldId,
    definitionVersionIdCapturedUnder: row.definitionVersionId,
    entityDomain: row.entityDomain,
    entityId: row.entityId,
    valueJson: row.valueJson,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
  };
}

function valueData(row: CustomFieldValueRow): Record<string, unknown> {
  return {
    id: row.id,
    organizationId: row.organizationId,
    fieldLineageId: row.fieldLineageId,
    fieldId: row.fieldId,
    definitionVersionId: row.definitionVersionIdCapturedUnder,
    entityDomain: row.entityDomain,
    entityId: row.entityId,
    valueJson: row.valueJson,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
  };
}

function placementTable(): PlacementDelegate {
  const table = (prisma as unknown as { fieldControlPlacement?: PlacementDelegate }).fieldControlPlacement;
  if (!table?.findFirst || !table.findMany || !table.create || !table.update || !table.delete) {
    throw new CustomFieldPlacementError(
      503,
      "PLACEMENT_STORAGE_UNAVAILABLE",
      "Custom field placement storage is not available on the database client.",
    );
  }
  return table;
}

function valueTable(db: unknown = prisma): ValueDelegate {
  const table = (db as { fieldControlCustomValue?: ValueDelegate }).fieldControlCustomValue;
  if (!table?.findFirst || !table.findMany || !table.create || !table.update || !table.delete) {
    throw new CustomFieldValueError(
      503,
      "VALUE_STORAGE_UNAVAILABLE",
      "Custom field value storage is not available on the database client.",
    );
  }
  return table;
}

function placementWhere(filter: PlacementListFilter): Record<string, unknown> {
  return {
    ...(filter.fieldLineageId ? { fieldLineageId: filter.fieldLineageId } : {}),
    ...(filter.owningDomain ? { owningDomain: filter.owningDomain } : {}),
    ...(filter.screenId ? { screenId: filter.screenId } : {}),
    ...(filter.sectionId ? { sectionId: filter.sectionId } : {}),
    ...(typeof filter.active === "boolean" ? { active: filter.active } : {}),
  };
}

export function prismaPlacementStore(): PlacementStore {
  const table = placementTable();
  return {
    async findByIdentity(identity) {
      const row = await table.findFirst({ where: { ...identity } });
      return row ? toPlacement(row) : null;
    },
    async findById(id) {
      const row = await table.findFirst({ where: { id } });
      return row ? toPlacement(row) : null;
    },
    async insert(row) {
      await table.create({ data: placementData(row) });
    },
    async replace(row) {
      await table.update({ where: { id: row.id }, data: placementData(row) });
    },
    async remove(id) {
      await table.delete({ where: { id } });
    },
    async list(filter) {
      const rows = await table.findMany({ where: placementWhere(filter) });
      return rows.map(toPlacement);
    },
  };
}

export function prismaCustomFieldValueStore(db: unknown = prisma): CustomFieldValueStore {
  const table = valueTable(db);
  return {
    async findByKey(key) {
      const row = await table.findFirst({ where: { ...key } });
      return row ? toValue(row) : null;
    },
    async insert(row) {
      await table.create({ data: valueData(row) });
    },
    async replace(row) {
      await table.update({ where: { id: row.id }, data: valueData(row) });
    },
    async removeByKey(key) {
      const existing = await table.findFirst({ where: { ...key } });
      if (!existing) return false;
      await table.delete({ where: { id: existing.id } });
      return true;
    },
    async listForEntity(query) {
      const rows = await table.findMany({ where: { ...query } });
      return rows.map(toValue);
    },
  };
}

export async function loadPlacementDefinitions(lineageId: string): Promise<PlacementDefinitionRecord[]> {
  const rows = await prisma.fieldControlDefinition.findMany({ where: { lineageId } });
  return rows.map((row) => ({
    id: row.id,
    fieldId: row.fieldId,
    lineageId: row.lineageId,
    versionNumber: row.versionNumber,
    classification: row.classification,
    owningDomain: row.owningDomain,
    lifecycleStatus: row.lifecycleStatus,
    fieldType: row.fieldType,
    controlsRuntime: row.controlsRuntime,
    customerFacingActivation: row.customerFacingActivation,
    selectOptionKeysJson: row.selectOptionKeysJson,
    currencyUnitsJson: row.currencyUnitsJson,
    applicabilityDeclared: row.applicabilityDeclared,
    productApplicabilityJson: row.productApplicabilityJson,
  }));
}

type MembershipClient = {
  ecmContact: { findFirst: typeof prisma.ecmContact.findFirst };
  ecmCompany: { findFirst: typeof prisma.ecmCompany.findFirst };
  enterpriseOpportunity: { findFirst: typeof prisma.enterpriseOpportunity.findFirst };
  enterpriseDeal: { findFirst: typeof prisma.enterpriseDeal.findFirst };
};

export async function contactBelongsToOrganization(
  organizationId: string,
  entityId: string,
  db: MembershipClient = prisma,
): Promise<boolean> {
  const row = await db.ecmContact.findFirst({
    where: { id: entityId, organizationId, isDeleted: false },
    select: { id: true },
  });
  return row !== null;
}

export async function companyBelongsToOrganization(
  organizationId: string,
  entityId: string,
  db: MembershipClient = prisma,
): Promise<boolean> {
  const row = await db.ecmCompany.findFirst({
    where: { id: entityId, organizationId, isDeleted: false },
    select: { id: true },
  });
  return row !== null;
}

export async function opportunityBelongsToOrganization(
  organizationId: string,
  entityId: string,
  db: MembershipClient = prisma,
): Promise<boolean> {
  const row = await db.enterpriseOpportunity.findFirst({
    where: { id: entityId, organizationId, isDeleted: false },
    select: { id: true },
  });
  return row !== null;
}

export async function entityBelongsToOrganization(
  entityDomain: string,
  organizationId: string,
  entityId: string,
  db: MembershipClient = prisma,
): Promise<boolean> {
  if (entityDomain === "contact") return contactBelongsToOrganization(organizationId, entityId, db);
  if (entityDomain === "company") return companyBelongsToOrganization(organizationId, entityId, db);
  if (entityDomain === "opportunity") return opportunityBelongsToOrganization(organizationId, entityId, db);
  if (entityDomain === "deal") {
    const row = await db.enterpriseDeal.findFirst({
      where: { id: entityId, organizationId, isDeleted: false },
      select: { id: true },
    });
    return row !== null;
  }
  return false;
}

export async function dealBelongsToOrganization(organizationId: string, entityId: string): Promise<boolean> {
  const deal = await prisma.enterpriseDeal.findFirst({
    where: { id: entityId, organizationId, isDeleted: false },
    select: { id: true },
  });
  return deal !== null;
}

export async function resolveCustomFieldOrganizationId(): Promise<string> {
  try {
    const organizationId = await resolvePilotOrganizationId();
    if (!organizationId) {
      throw new CustomFieldValueError(403, "ORGANIZATION_CONTEXT_REJECTED", "Organization context is not available.");
    }
    return organizationId;
  } catch (error) {
    if (error instanceof CustomFieldValueError) throw error;
    throw new CustomFieldValueError(403, "ORGANIZATION_CONTEXT_REJECTED", "Organization context is not available.");
  }
}
