/**
 * EAF relationship type registry — generic relationship codes only.
 */

import type { EafRelationshipTypeDefinition } from "@/types/enterprise-asset-framework";

export const EAF_RELATIONSHIP_TYPE_CODES = {
  PARENT_CHILD: "parent_child",
  DEPENDS_ON: "depends_on",
  ASSOCIATED_WITH: "associated_with",
  GOVERNED_BY: "governed_by",
  VERSION_OF: "version_of",
} as const;

export const EAF_DEFAULT_RELATIONSHIP_TYPES: EafRelationshipTypeDefinition[] = [
  {
    id: "eaf-rel-parent-child",
    relationshipTypeCode: EAF_RELATIONSHIP_TYPE_CODES.PARENT_CHILD,
    label: "Parent / Child",
    description: "Hierarchical containment relationship.",
    sourceAssetTypeCodes: [],
    targetAssetTypeCodes: [],
    cardinality: "one_to_many",
    bidirectional: false,
    enabled: true,
  },
  {
    id: "eaf-rel-depends-on",
    relationshipTypeCode: EAF_RELATIONSHIP_TYPE_CODES.DEPENDS_ON,
    label: "Depends On",
    description: "Source asset depends on target asset.",
    sourceAssetTypeCodes: [],
    targetAssetTypeCodes: [],
    cardinality: "many_to_many",
    bidirectional: false,
    enabled: true,
  },
  {
    id: "eaf-rel-associated",
    relationshipTypeCode: EAF_RELATIONSHIP_TYPE_CODES.ASSOCIATED_WITH,
    label: "Associated With",
    description: "Loose association between assets.",
    sourceAssetTypeCodes: [],
    targetAssetTypeCodes: [],
    cardinality: "many_to_many",
    bidirectional: true,
    enabled: true,
  },
  {
    id: "eaf-rel-governed-by",
    relationshipTypeCode: EAF_RELATIONSHIP_TYPE_CODES.GOVERNED_BY,
    label: "Governed By",
    description: "Source asset governed by target policy or rule asset.",
    sourceAssetTypeCodes: [],
    targetAssetTypeCodes: [],
    cardinality: "many_to_one",
    bidirectional: false,
    enabled: true,
  },
  {
    id: "eaf-rel-version-of",
    relationshipTypeCode: EAF_RELATIONSHIP_TYPE_CODES.VERSION_OF,
    label: "Version Of",
    description: "Version lineage relationship.",
    sourceAssetTypeCodes: [],
    targetAssetTypeCodes: [],
    cardinality: "many_to_one",
    bidirectional: false,
    enabled: true,
  },
];
