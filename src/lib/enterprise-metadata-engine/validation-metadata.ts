/**
 * EME validation metadata registry — no runtime validation engine.
 */

import type { EmeValidationRuleMetadata } from "@/types/enterprise-metadata-engine";
import { recordEmeMetadataAudit } from "./audit-integration";
import { getEmePorts } from "./composition";

export function listEmeValidationRuleMetadata(): EmeValidationRuleMetadata[] {
  return getEmePorts().validationRules.list();
}

export function getEmeValidationRuleByCode(ruleCode: string): EmeValidationRuleMetadata | undefined {
  return getEmePorts().validationRules.findByCode(ruleCode);
}

export function registerEmeValidationRuleMetadata(
  input: Omit<EmeValidationRuleMetadata, "id"> & { id?: string },
  actorId: string,
): EmeValidationRuleMetadata {
  const duplicate = getEmePorts()
    .validationRules.list()
    .find((r) => r.ruleCode === input.ruleCode && r.id !== input.id);
  if (duplicate) {
    throw new Error(`EME: validation rule code "${input.ruleCode}" is already registered.`);
  }

  const rule: EmeValidationRuleMetadata = {
    id: input.id ?? crypto.randomUUID(),
    ruleCode: input.ruleCode,
    ruleType: input.ruleType,
    label: input.label,
    description: input.description,
    parameters: input.parameters,
    expressionRef: input.expressionRef,
    severity: input.severity,
    applicableFieldTypes: input.applicableFieldTypes,
    enabled: input.enabled,
  };

  getEmePorts().validationRules.save(rule);

  recordEmeMetadataAudit({
    metadataDefinitionId: rule.id,
    action: "validation_rule_modified",
    actorId,
    changeSetRef: rule.ruleCode,
    remarks: `Registered validation rule ${rule.label}`,
  });

  return rule;
}
