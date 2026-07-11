/**
 * EME in-memory adapters — Sprint 2 default implementation.
 */

import {
  EME_DEFAULT_FORMULA_OPERATORS,
  EME_DEFAULT_METADATA_CATEGORIES,
  EME_DEFAULT_METADATA_DEFINITIONS,
  EME_DEFAULT_VALIDATION_RULES,
} from "@/constants/enterprise-metadata-engine";
import type {
  EmeFieldDefinition,
  EmeFormulaOperator,
  EmeMetadataCategory,
  EmeMetadataDefinition,
  EmeMetadataVersionRecord,
  EmeValidationRuleMetadata,
} from "@/types/enterprise-metadata-engine";
import type { EmePorts } from "@/types/enterprise-metadata-engine-ports";

function createMutableListStore<T>(): {
  list: () => T[];
  replaceAll: (items: T[]) => void;
  upsert: (item: T, key: (item: T) => string) => void;
  append: (item: T) => void;
} {
  let items: T[] = [];
  return {
    list: () => items,
    replaceAll: (next) => {
      items = next;
    },
    append: (item) => {
      items = [item, ...items];
    },
    upsert: (item, key) => {
      const id = key(item);
      items = [item, ...items.filter((i) => key(i) !== id)];
    },
  };
}

export function createInMemoryEmePorts(): EmePorts {
  const definitions = createMutableListStore<EmeMetadataDefinition>();
  definitions.replaceAll([...EME_DEFAULT_METADATA_DEFINITIONS]);

  const fields = createMutableListStore<EmeFieldDefinition>();
  const categories = createMutableListStore<EmeMetadataCategory>();
  categories.replaceAll([...EME_DEFAULT_METADATA_CATEGORIES]);

  const validationRules = createMutableListStore<EmeValidationRuleMetadata>();
  validationRules.replaceAll([...EME_DEFAULT_VALIDATION_RULES]);

  let formulaOperators: EmeFormulaOperator[] = [...EME_DEFAULT_FORMULA_OPERATORS];
  const versions = createMutableListStore<EmeMetadataVersionRecord>();

  return {
    metadataRegistry: {
      list: () => definitions.list(),
      findById: (id) => definitions.list().find((d) => d.id === id),
      findByAssetTypeCode: (code) =>
        definitions.list().find((d) => d.assetTypeCode === code && d.enabled),
      findBySchemaCode: (code) =>
        definitions.list().find((d) => d.schemaCode === code && d.enabled),
      save: (definition) => definitions.upsert(definition, (d) => d.id),
      replaceAll: (items) => definitions.replaceAll(items),
    },
    fields: {
      list: () => fields.list(),
      findById: (id) => fields.list().find((f) => f.id === id),
      listByMetadataDefinitionId: (metadataDefinitionId) =>
        fields
          .list()
          .filter((f) => f.metadataDefinitionId === metadataDefinitionId && f.enabled)
          .sort((a, b) => a.displayOrder - b.displayOrder),
      listByAssetTypeCode: (assetTypeCode) =>
        fields
          .list()
          .filter((f) => f.assetTypeCode === assetTypeCode && f.enabled)
          .sort((a, b) => a.displayOrder - b.displayOrder),
      save: (field) => fields.upsert(field, (f) => f.id),
      replaceAll: (items) => fields.replaceAll(items),
    },
    categories: {
      list: () => categories.list(),
      findByCode: (categoryCode) =>
        categories.list().find((c) => c.categoryCode === categoryCode && c.enabled),
      save: (category) => categories.upsert(category, (c) => c.id),
      replaceAll: (items) => categories.replaceAll(items),
    },
    validationRules: {
      list: () => validationRules.list(),
      findById: (id) => validationRules.list().find((r) => r.id === id),
      findByCode: (ruleCode) =>
        validationRules.list().find((r) => r.ruleCode === ruleCode && r.enabled),
      save: (rule) => validationRules.upsert(rule, (r) => r.id),
      replaceAll: (items) => validationRules.replaceAll(items),
    },
    formulaOperators: {
      list: () => formulaOperators,
      findByCode: (operatorCode) =>
        formulaOperators.find((o) => o.operatorCode === operatorCode && o.enabled),
      replaceAll: (operators) => {
        formulaOperators = operators;
      },
    },
    versions: {
      list: () => versions.list(),
      append: (record) => versions.append(record),
      findByMetadataDefinitionId: (metadataDefinitionId) =>
        versions
          .list()
          .filter((v) => v.metadataDefinitionId === metadataDefinitionId)
          .sort((a, b) => b.createdOn.localeCompare(a.createdOn)),
      replaceAll: (records) => versions.replaceAll(records),
    },
  };
}
