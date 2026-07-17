/**
 * CF-LIFE-010 — Enterprise Lender Workspace (ELW).
 * Enrich workflows; never interrupt them.
 */

export type ElwOriginSurface =
  | "opportunity_workspace"
  | "life"
  | "loan_files"
  | "dashboard"
  | "lenders"
  | "search"
  | "contacts"
  | "pipeline"
  | "unknown";

export interface ElwOriginContext {
  from: ElwOriginSurface;
  /** Absolute path (+ query) to restore after Select Lender / Back. */
  returnTo: string;
  loanFileId?: string;
  opportunityId?: string;
  contactId?: string;
  /** When true, Select Lender is the primary CTA. */
  selectionMode: boolean;
}

export interface ElwPerformanceMetrics {
  successProbability: number;
  approvalRateLabel: string;
  averageTatDays: number;
  activeCases: number;
  relationshipStrength: "strong" | "steady" | "building";
}

export interface ElwProductSummary {
  productRef: string;
  label: string;
}

export interface ElwPolicySummary {
  headline: string;
  bullets: string[];
}

export interface ElwRelationshipContact {
  contactId: string;
  name: string;
  designation: string;
  branchName?: string;
  city?: string;
  mobile?: string;
  email?: string;
  isExecutor: boolean;
}

export interface ElwDocumentItem {
  id: string;
  title: string;
  category: string;
  status: "available" | "request";
}

export interface ElwChanakyaInsight {
  headline: string;
  body: string;
  recommendation: string;
}

export interface ElwLenderProfile {
  lenderId: string;
  lenderRef: string;
  name: string;
  code: string;
  headquartersCity?: string;
  overview: string;
  metrics: ElwPerformanceMetrics;
  products: ElwProductSummary[];
  policy: ElwPolicySummary;
  contacts: ElwRelationshipContact[];
  documents: ElwDocumentItem[];
  chanakya: ElwChanakyaInsight;
  cities: string[];
  branchNames: string[];
}

export interface ElwRegistryEntry {
  lenderId: string;
  lenderRef: string;
  name: string;
  contactCount: number;
  productCount: number;
  headquartersCity?: string;
  /** Landing card enrichment (Phase 1 UI). */
  productsOffered?: string[];
  citiesCovered?: string[];
  relationshipStatus?: ElwRelationshipStatus;
  lastPolicyUpdate?: string;
  primaryContactName?: string;
  logoInitials?: string;
}

export type ElwRelationshipStatus = "active" | "building" | "onboarding" | "dormant";

/** Fixed enterprise hierarchy ranks — vacant roles remain visible. */
export type ElwHierarchyRank =
  | "vice_president"
  | "national_head"
  | "regional_head"
  | "state_head"
  | "cluster_head"
  | "relationship_manager";

export interface ElwHierarchyPerson {
  contactId: string;
  name: string;
  designation: string;
  phone?: string;
  email?: string;
  territory?: string;
  productsHandled?: string[];
  photoInitials: string;
  directReportsCount: number;
}

export interface ElwHierarchyNode {
  id: string;
  rank: ElwHierarchyRank;
  rankLabel: string;
  levelIndex: number;
  /** null = vacant position */
  person: ElwHierarchyPerson | null;
  parentId: string | null;
}

export type ElwProductPolicySectionId =
  | "eligibility"
  | "credit_programs"
  | "financial_programs"
  | "documents"
  | "property"
  | "income"
  | "risk"
  | "special_conditions"
  | "version_history";

export interface ElwProductPolicySection {
  id: ElwProductPolicySectionId;
  title: string;
  placeholder: string;
}

export interface ElwLenderLandingCard {
  lenderId: string;
  lenderRef: string;
  name: string;
  logoInitials: string;
  productsOffered: string[];
  citiesCovered: string[];
  relationshipStatus: ElwRelationshipStatus;
  lastPolicyUpdate: string;
  primaryContactName: string | null;
}
