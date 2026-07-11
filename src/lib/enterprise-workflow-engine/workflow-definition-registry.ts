/**
 * EWE workflow definition registry.
 */

import { EWE_DEFINITION_LIFECYCLE_STATUS } from "@/constants/enterprise-workflow-engine";
import type {
  EweWorkflowDefinition,
  EweWorkflowVersion,
} from "@/types/enterprise-workflow-engine";
import { recordEweWorkflowAudit } from "./audit-integration";
import { getEwePorts } from "./composition";
import {
  assertEweWorkflowVersionValid,
  validateEweWorkflowDefinition,
} from "./validation-engine";

type CreateDefinitionInput = Omit<
  EweWorkflowDefinition,
  "id" | "lifecycleStatus" | "enabled" | "createdOn" | "modifiedOn" | "modifiedBy"
> &
  Partial<Pick<EweWorkflowDefinition, "enabled">>;

export function registerEweWorkflowDefinition(input: CreateDefinitionInput): EweWorkflowDefinition {
  const now = new Date().toISOString();
  const definition: EweWorkflowDefinition = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    workflowCode: input.workflowCode,
    workflowName: input.workflowName,
    description: input.description,
    moduleRef: input.moduleRef,
    categoryRef: input.categoryRef,
    lifecycleStatus: EWE_DEFINITION_LIFECYCLE_STATUS.DRAFT,
    enabled: input.enabled ?? true,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  validateEweWorkflowDefinition(getEwePorts().definitions, definition);
  getEwePorts().definitions.save(definition);

  recordEweWorkflowAudit({
    entityId: definition.id,
    entityType: "definition",
    action: "created",
    actorId: input.createdBy,
    newStateRef: definition.lifecycleStatus,
    remarks: `Registered workflow ${definition.workflowCode}`,
  });

  return definition;
}

export function getEweWorkflowDefinitionById(id: string): EweWorkflowDefinition | undefined {
  return getEwePorts().definitions.findById(id);
}

export function getEweWorkflowDefinitionByCode(
  workflowCode: string,
  tenantId?: string,
): EweWorkflowDefinition | undefined {
  return getEwePorts().definitions.findByCode(workflowCode, tenantId);
}

export function listEweWorkflowDefinitions(): EweWorkflowDefinition[] {
  return getEwePorts().definitions.list();
}

export function saveEweWorkflowVersion(version: EweWorkflowVersion): EweWorkflowVersion {
  const definition = getEwePorts().definitions.findById(version.definitionId);
  if (!definition) {
    throw new Error(`EWE: definition "${version.definitionId}" not found.`);
  }

  const duplicate = getEwePorts().versions.findByDefinitionAndVersion(
    version.definitionId,
    version.versionMajor,
    version.versionMinor,
  );
  if (duplicate && duplicate.id !== version.id) {
    throw new Error(
      `EWE: version ${version.versionMajor}.${version.versionMinor} already exists for definition.`,
    );
  }

  assertEweWorkflowVersionValid(version);
  getEwePorts().versions.save(version);

  recordEweWorkflowAudit({
    entityId: version.id,
    entityType: "version",
    action: duplicate ? "modified" : "created",
    actorId: version.modifiedBy,
    newStateRef: version.lifecycleStatus,
    remarks: `Saved workflow version ${version.workflowCode} v${version.versionMajor}.${version.versionMinor}`,
  });

  return version;
}

export function createEweWorkflowVersion(
  input: Omit<EweWorkflowVersion, "id" | "lifecycleStatus" | "createdOn" | "modifiedOn">,
): EweWorkflowVersion {
  const now = new Date().toISOString();
  const version: EweWorkflowVersion = {
    ...input,
    id: crypto.randomUUID(),
    lifecycleStatus: EWE_DEFINITION_LIFECYCLE_STATUS.DRAFT,
    createdOn: now,
    modifiedOn: now,
  };

  return saveEweWorkflowVersion(version);
}

export function listEweWorkflowVersions(definitionId?: string): EweWorkflowVersion[] {
  return definitionId
    ? getEwePorts().versions.listByDefinition(definitionId)
    : getEwePorts().versions.list();
}

export function getEweWorkflowVersionById(id: string): EweWorkflowVersion | undefined {
  return getEwePorts().versions.findById(id);
}

export function updateEweWorkflowDefinition(
  id: string,
  patch: Partial<Pick<EweWorkflowDefinition, "workflowName" | "description" | "enabled" | "moduleRef" | "categoryRef">>,
  modifiedBy: string,
): EweWorkflowDefinition | undefined {
  const existing = getEweWorkflowDefinitionById(id);
  if (!existing) return undefined;
  if (existing.lifecycleStatus === EWE_DEFINITION_LIFECYCLE_STATUS.ARCHIVED) {
    throw new Error("EWE: archived definitions cannot be modified.");
  }

  const updated: EweWorkflowDefinition = {
    ...existing,
    ...patch,
    modifiedBy,
    modifiedOn: new Date().toISOString(),
  };

  validateEweWorkflowDefinition(getEwePorts().definitions, updated, existing);
  getEwePorts().definitions.save(updated);

  recordEweWorkflowAudit({
    entityId: id,
    entityType: "definition",
    action: "modified",
    actorId: modifiedBy,
    remarks: `Updated workflow ${existing.workflowCode}`,
  });

  return updated;
}
