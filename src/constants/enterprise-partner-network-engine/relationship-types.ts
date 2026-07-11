/**
 * EPNE configuration-driven relationship type definitions.
 */

export const EPNE_RELATIONSHIP_TYPE_CODES = {
  REFERS_BUSINESS_TO: "refers_business_to",
  MANAGED_BY: "managed_by",
  INTRODUCED_BY: "introduced_by",
  STRATEGIC_ALLIANCE: "strategic_alliance",
  FRANCHISE_OF: "franchise_of",
  SERVICES_TERRITORY: "services_territory",
  REPORTS_TO: "reports_to",
  PARENT_PARTNER: "parent_partner",
  CHILD_PARTNER: "child_partner",
} as const;

export type EpneRelationshipTypeCode =
  (typeof EPNE_RELATIONSHIP_TYPE_CODES)[keyof typeof EPNE_RELATIONSHIP_TYPE_CODES];

export interface EpneDefaultRelationshipTypeConfig {
  typeCode: EpneRelationshipTypeCode;
  typeName: string;
  description: string;
  bidirectional: boolean;
  hierarchyImplied: boolean;
}

export const EPNE_DEFAULT_RELATIONSHIP_TYPES: EpneDefaultRelationshipTypeConfig[] = [
  {
    typeCode: EPNE_RELATIONSHIP_TYPE_CODES.REFERS_BUSINESS_TO,
    typeName: "Refers Business To",
    description: "Source partner refers business opportunities to target partner.",
    bidirectional: false,
    hierarchyImplied: false,
  },
  {
    typeCode: EPNE_RELATIONSHIP_TYPE_CODES.MANAGED_BY,
    typeName: "Managed By",
    description: "Source partner is managed by target partner.",
    bidirectional: false,
    hierarchyImplied: false,
  },
  {
    typeCode: EPNE_RELATIONSHIP_TYPE_CODES.INTRODUCED_BY,
    typeName: "Introduced By",
    description: "Source partner was introduced by target partner.",
    bidirectional: false,
    hierarchyImplied: false,
  },
  {
    typeCode: EPNE_RELATIONSHIP_TYPE_CODES.STRATEGIC_ALLIANCE,
    typeName: "Strategic Alliance",
    description: "Strategic alliance between partners.",
    bidirectional: true,
    hierarchyImplied: false,
  },
  {
    typeCode: EPNE_RELATIONSHIP_TYPE_CODES.FRANCHISE_OF,
    typeName: "Franchise Of",
    description: "Source partner operates as franchise of target partner.",
    bidirectional: false,
    hierarchyImplied: true,
  },
  {
    typeCode: EPNE_RELATIONSHIP_TYPE_CODES.SERVICES_TERRITORY,
    typeName: "Services Territory",
    description: "Source partner services territory managed by target partner.",
    bidirectional: false,
    hierarchyImplied: false,
  },
  {
    typeCode: EPNE_RELATIONSHIP_TYPE_CODES.REPORTS_TO,
    typeName: "Reports To",
    description: "Source partner reports to target partner.",
    bidirectional: false,
    hierarchyImplied: true,
  },
  {
    typeCode: EPNE_RELATIONSHIP_TYPE_CODES.PARENT_PARTNER,
    typeName: "Parent Partner",
    description: "Target partner is parent of source partner.",
    bidirectional: false,
    hierarchyImplied: true,
  },
  {
    typeCode: EPNE_RELATIONSHIP_TYPE_CODES.CHILD_PARTNER,
    typeName: "Child Partner",
    description: "Target partner is child of source partner.",
    bidirectional: false,
    hierarchyImplied: true,
  },
];
