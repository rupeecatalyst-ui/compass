/**
 * EC360 configuration-driven relationship type definitions.
 */

export const EC360_RELATIONSHIP_TYPE_CODES = {
  HOUSEHOLD: "household",
  FAMILY: "family",
  BUSINESS: "business",
  GUARANTOR: "guarantor",
  CO_APPLICANT: "co_applicant",
  NOMINEE: "nominee",
  AUTHORIZED_SIGNATORY: "authorized_signatory",
  PARTNER_RELATIONSHIP: "partner_relationship",
} as const;

export type Ec360RelationshipTypeCode =
  (typeof EC360_RELATIONSHIP_TYPE_CODES)[keyof typeof EC360_RELATIONSHIP_TYPE_CODES];

export interface Ec360DefaultRelationshipTypeConfig {
  typeCode: Ec360RelationshipTypeCode;
  typeName: string;
  description: string;
  hierarchyImplied: boolean;
}

export const EC360_DEFAULT_RELATIONSHIP_TYPES: Ec360DefaultRelationshipTypeConfig[] = [
  {
    typeCode: EC360_RELATIONSHIP_TYPE_CODES.HOUSEHOLD,
    typeName: "Household",
    description: "Customer belongs to household.",
    hierarchyImplied: false,
  },
  {
    typeCode: EC360_RELATIONSHIP_TYPE_CODES.FAMILY,
    typeName: "Family",
    description: "Family relationship between customers.",
    hierarchyImplied: false,
  },
  {
    typeCode: EC360_RELATIONSHIP_TYPE_CODES.BUSINESS,
    typeName: "Business",
    description: "Business relationship between customers.",
    hierarchyImplied: false,
  },
  {
    typeCode: EC360_RELATIONSHIP_TYPE_CODES.GUARANTOR,
    typeName: "Guarantor",
    description: "Source customer is guarantor for target customer.",
    hierarchyImplied: false,
  },
  {
    typeCode: EC360_RELATIONSHIP_TYPE_CODES.CO_APPLICANT,
    typeName: "Co-applicant",
    description: "Co-applicant relationship between customers.",
    hierarchyImplied: false,
  },
  {
    typeCode: EC360_RELATIONSHIP_TYPE_CODES.NOMINEE,
    typeName: "Nominee",
    description: "Nominee relationship between customers.",
    hierarchyImplied: false,
  },
  {
    typeCode: EC360_RELATIONSHIP_TYPE_CODES.AUTHORIZED_SIGNATORY,
    typeName: "Authorized Signatory",
    description: "Authorized signatory for organization customer.",
    hierarchyImplied: false,
  },
  {
    typeCode: EC360_RELATIONSHIP_TYPE_CODES.PARTNER_RELATIONSHIP,
    typeName: "Partner Relationship",
    description: "Partner relationship between customers.",
    hierarchyImplied: false,
  },
];
