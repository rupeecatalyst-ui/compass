/**
 * Enterprise Relationship Workspace (ERW) — domain types for the reusable graph.
 */

import type {
  ErwColourFamily,
  ErwEntityType,
  ErwLinkedRecordKind,
  ErwRelationshipStatus,
} from "@/constants/enterprise-relationship-workspace";

export type ErwGraphViewMode =
  | "contact_network"
  | "company_network"
  | "opportunity_network"
  | "wealth_partner_network"
  | "employee_hierarchy"
  | "organisation_structure"
  | "referral_network"
  | "lender_relationship_network";

export interface ErwLinkedRecordCount {
  kind: ErwLinkedRecordKind;
  label: string;
  count: number;
  href?: string;
}

export interface ErwRelationshipDetailFields {
  designation?: string;
  ownershipPct?: string;
  pan?: string;
  gstin?: string;
  roc?: string;
  dateSince?: string;
  mobile?: string;
  email?: string;
  location?: string;
  notes?: string;
}

export interface ErwGraphNode {
  id: string;
  /** True for the focal entity (centre of the graph). */
  isCentre: boolean;
  name: string;
  entityType: ErwEntityType;
  relationshipTypeCode: string;
  relationshipTypeLabel: string;
  colourFamily: ErwColourFamily;
  status: ErwRelationshipStatus;
  /** Deep-link into another Catalyst One workspace when available. */
  navigateHref?: string;
  navigateWorkspace?: "contact" | "company" | "opportunity" | "loan" | "lender" | "other";
  detail: ErwRelationshipDetailFields;
  linkedRecords: ErwLinkedRecordCount[];
  /** Presentation-only seed (not persisted). */
  isIllustrative?: boolean;
}

export interface ErwGraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationshipTypeCode: string;
  relationshipTypeLabel: string;
  colourFamily: ErwColourFamily;
}

export interface ErwGraphModel {
  viewMode: ErwGraphViewMode;
  centreNodeId: string;
  nodes: ErwGraphNode[];
  edges: ErwGraphEdge[];
  tickerHints: string[];
}

export interface ErwGraphFilters {
  search: string;
  relationshipTypeCodes: string[];
  entityTypes: ErwEntityType[];
  statuses: ErwRelationshipStatus[];
  colourFamilies: ErwColourFamily[];
}

export const ERW_EMPTY_FILTERS: ErwGraphFilters = {
  search: "",
  relationshipTypeCodes: [],
  entityTypes: [],
  statuses: [],
  colourFamilies: [],
};
