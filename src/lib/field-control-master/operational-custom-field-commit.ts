/**
 * Server commit of operational custom values inside the entity transaction.
 * Organization id is resolved on the server. Client organization ids are rejected.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { ecmCompanyService } from "@server/services/ecm/company.service";
import { ecmContactService } from "@server/services/ecm/contact.service";
import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import type { EcmCompanyRegisterInput } from "@/types/enterprise-company-master";
import type { RegisterContactInput } from "@server/services/ecm/contact.service";
import { createOperationalCustomValueAuditBuffer, recordCustomFieldAudit } from "./custom-field-audit";
import type { CustomFieldAuditEvent } from "./custom-field-audit";
import {
  entityBelongsToOrganization,
  loadPlacementDefinitions,
  prismaCustomFieldValueStore,
  prismaPlacementStore,
  resolveCustomFieldOrganizationId,
} from "./custom-field-persistence";
import { CustomFieldValueError } from "./custom-field-value";
import {
  applyOperationalCustomValuePlan,
  operationalCustomFieldTarget,
  prepareOperationalCustomValueWrites,
  projectOperationalCustomFields,
  readCustomFieldSubmissions,
  resolveCompanyCreateCustomValueAction,
  type OperationalCustomFieldDefinition,
  type OperationalCustomFieldDomain,
  type OperationalCustomFieldMode,
} from "./operational-custom-fields";

async function definitionsFor(lineageIds: string[]): Promise<OperationalCustomFieldDefinition[]> {
  const definitions: OperationalCustomFieldDefinition[] = [];
  for (const lineageId of lineageIds) {
    const rows = await loadPlacementDefinitions(lineageId);
    const labelled = await prisma.fieldControlDefinition.findMany({
      where: { lineageId },
      select: { id: true, friendlyLabel: true },
    });
    const labels = new Map(labelled.map((row) => [row.id, row.friendlyLabel]));
    for (const row of rows) {
      definitions.push({ ...row, friendlyLabel: labels.get(row.id) ?? row.fieldId });
    }
  }
  return definitions;
}

async function contextFor(input: {
  domain: OperationalCustomFieldDomain;
  mode: OperationalCustomFieldMode;
  productCode: string | null;
  employmentTypeCode?: string | null;
  submissions: ReturnType<typeof readCustomFieldSubmissions>;
  existingEntityId?: string;
}) {
  const organizationId = await resolveCustomFieldOrganizationId();
  if (input.existingEntityId) {
    const allowed = await entityBelongsToOrganization(input.domain, organizationId, input.existingEntityId);
    if (!allowed) {
      throw new CustomFieldValueError(404, "ENTITY_NOT_IN_ORGANIZATION", "The entity is not available in the authorized organization.");
    }
  }
  const screen = operationalCustomFieldTarget(input.domain);
  const placements = await prismaPlacementStore().list({
    owningDomain: screen.owningDomain,
    screenId: screen.screenId,
    sectionId: screen.sectionId,
  });
  const definitions = await definitionsFor(placements.map((row) => row.fieldLineageId));
  const existingValues = input.existingEntityId
    ? await prismaCustomFieldValueStore().listForEntity({
        organizationId,
        entityDomain: input.domain,
        entityId: input.existingEntityId,
      })
    : [];
  const plan = prepareOperationalCustomValueWrites({
    domain: input.domain,
    mode: input.mode === "view" ? "edit" : input.mode,
    productCode: input.productCode,
    employmentTypeCode: input.employmentTypeCode ?? null,
    placements: placements.filter((row) => row.active),
    definitions,
    submissions: input.submissions,
    existingValues,
  });
  return { organizationId, placements: prismaPlacementStore(), definitions, plan };
}

export async function loadOperationalCustomFields(input: {
  domain: OperationalCustomFieldDomain;
  mode: OperationalCustomFieldMode;
  entityId?: string | null;
  productCode?: string | null;
  employmentTypeCode?: string | null;
}) {
  const organizationId = await resolveCustomFieldOrganizationId();
  if (input.entityId) {
    const allowed = await entityBelongsToOrganization(input.domain, organizationId, input.entityId);
    if (!allowed) {
      throw new CustomFieldValueError(404, "ENTITY_NOT_IN_ORGANIZATION", "The entity is not available in the authorized organization.");
    }
  }
  const screen = operationalCustomFieldTarget(input.domain);
  const placementStore = prismaPlacementStore();
  const placements = await placementStore.list({
    owningDomain: screen.owningDomain,
    screenId: screen.screenId,
    sectionId: screen.sectionId,
    active: true,
  });
  const definitions = await definitionsFor(placements.map((row) => row.fieldLineageId));
  const values = input.entityId
    ? await prismaCustomFieldValueStore().listForEntity({
        organizationId,
        entityDomain: input.domain,
        entityId: input.entityId,
      })
    : [];
  return projectOperationalCustomFields({
    domain: input.domain,
    mode: input.mode,
    productCode: input.productCode ?? null,
    employmentTypeCode: input.domain === "opportunity" ? (input.employmentTypeCode ?? null) : null,
    placements,
    definitions,
    values,
  });
}

async function applyPlan(
  tx: Prisma.TransactionClient,
  prepared: Awaited<ReturnType<typeof contextFor>>,
  entityId: string,
  actorUserId: string,
  audit: (event: CustomFieldAuditEvent) => void = recordCustomFieldAudit,
) {
  await applyOperationalCustomValuePlan({
    plan: prepared.plan,
    actor: { userId: actorUserId },
    entityId,
    resolveOrganizationId: async () => prepared.organizationId,
    dealInOrganization: async (organizationId, id) => entityBelongsToOrganization("deal", organizationId, id, tx),
    entityInOrganization: (organizationId, domain, id) => entityBelongsToOrganization(domain, organizationId, id, tx),
    placements: prepared.placements,
    definitions: prepared.definitions,
    values: prismaCustomFieldValueStore(tx),
    audit,
  });
}

export async function commitContactWithCustomFields(input: {
  contact: RegisterContactInput;
  customFieldValues: unknown;
  actorUserId: string;
}) {
  const submissions = readCustomFieldSubmissions(input.customFieldValues);
  const prepared = await contextFor({
    domain: "contact",
    mode: "create",
    productCode: null,
    submissions,
  });
  return prisma.$transaction(async (tx) => {
    const contact = await ecmContactService.register(input.contact, tx);
    await applyPlan(tx, prepared, contact.id, input.actorUserId);
    return contact;
  });
}

export async function commitCompanyWithCustomFields(input: {
  company: EcmCompanyRegisterInput;
  customFieldValues: unknown;
  actorUserId: string;
}) {
  const submissions = readCustomFieldSubmissions(input.customFieldValues);
  const prepared = await contextFor({
    domain: "company",
    mode: "create",
    productCode: null,
    submissions,
  });
  return prisma.$transaction(async (tx) => {
    const outcome = await ecmCompanyService.registerOutcome(
      { ...input.company, createdBy: input.actorUserId },
      tx,
    );
    const action = resolveCompanyCreateCustomValueAction({
      created: outcome.created,
      writes: prepared.plan.writes,
      clears: prepared.plan.clears,
    });
    if (action === "reject") {
      throw new CustomFieldValueError(
        409,
        "COMPANY_ALREADY_EXISTS",
        "A company with this name already exists. Open that company to change its custom fields. The values entered here were not saved.",
      );
    }
    if (action === "apply") {
      await applyPlan(tx, prepared, outcome.company.id, input.actorUserId);
    }
    return outcome.company;
  });
}

export async function commitOpportunityWithCustomFields(input: {
  opportunityId: string;
  body: Record<string, unknown>;
  customFieldValues: unknown;
  actorUserId: string;
}) {
  const submissions = readCustomFieldSubmissions(input.customFieldValues);
  const organizationId = await resolveCustomFieldOrganizationId();
  const allowed = await entityBelongsToOrganization("opportunity", organizationId, input.opportunityId);
  if (!allowed) {
    throw new CustomFieldValueError(404, "ENTITY_NOT_IN_ORGANIZATION", "The entity is not available in the authorized organization.");
  }
  const existing = await prisma.enterpriseOpportunity.findFirst({
    where: { id: input.opportunityId, organizationId, isDeleted: false },
    select: { productCode: true, employmentTypeCode: true },
  });
  const productCode =
    input.body.productCode !== undefined
      ? input.body.productCode
        ? String(input.body.productCode)
        : null
      : (existing?.productCode ?? null);
  const employmentTypeCode =
    input.body.employmentTypeCode !== undefined
      ? input.body.employmentTypeCode
        ? String(input.body.employmentTypeCode)
        : null
      : (existing?.employmentTypeCode ?? null);
  const prepared = await contextFor({
    domain: "opportunity",
    mode: "create",
    productCode,
    employmentTypeCode,
    submissions,
    existingEntityId: input.opportunityId,
  });
  const customValueAudits = createOperationalCustomValueAuditBuffer();
  return prisma.$transaction(async (tx) => {
    const saved = await enterpriseOpportunityService.updateOpportunity(input.opportunityId, input.body, input.actorUserId, {
      db: tx,
      afterRowUpdate: async () => {
        await applyPlan(tx, prepared, input.opportunityId, input.actorUserId, customValueAudits.capture);
      },
    });
    customValueAudits.publish();
    return saved;
  });
}

export async function saveOperationalCustomField(input: {
  domain: OperationalCustomFieldDomain;
  entityId: string;
  fieldLineageId: string;
  value: unknown;
  mode: "edit";
  productCode?: string | null;
  employmentTypeCode?: string | null;
  actorUserId: string;
}) {
  const prepared = await contextFor({
    domain: input.domain,
    mode: "edit",
    productCode: input.productCode ?? null,
    employmentTypeCode: input.domain === "opportunity" ? (input.employmentTypeCode ?? null) : null,
    submissions: [{ fieldLineageId: input.fieldLineageId, value: input.value }],
    existingEntityId: input.entityId,
  });
  await prisma.$transaction(async (tx) => {
    await applyPlan(tx, prepared, input.entityId, input.actorUserId);
  });
}
