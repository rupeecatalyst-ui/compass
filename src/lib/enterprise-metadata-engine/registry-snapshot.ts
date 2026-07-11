/**
 * EME registry snapshot and framework utilities.
 */

import type { EmeMetadataRegistrySnapshot } from "@/types/enterprise-metadata-engine";
import { EME_FRAMEWORK_VERSION } from "@/constants/enterprise-metadata-engine";
import { getEmePorts } from "./composition";

export function getEmeFrameworkVersion(): string {
  return EME_FRAMEWORK_VERSION;
}

export function getEmeMetadataRegistrySnapshot(): EmeMetadataRegistrySnapshot {
  const ports = getEmePorts();
  return {
    definitions: ports.metadataRegistry.list(),
    fields: ports.fields.list(),
    categories: ports.categories.list(),
    validationRules: ports.validationRules.list(),
    formulaOperators: ports.formulaOperators.list(),
    versions: ports.versions.list(),
  };
}

export function getEmeMetadataVersions(metadataDefinitionId: string) {
  return getEmePorts().versions.findByMetadataDefinitionId(metadataDefinitionId);
}
