/**
 * ATLAS v0.1 — Architectural Topology, Lifecycle & Asset System.
 * Design-time enterprise architecture catalog only.
 * ATLAS is NOT queried during business transactions.
 */

import type {
  DocumentationStatus,
  EnterpriseArchitectureMetadata,
  EnterpriseArtifactStatus,
} from "@/types/enterprise-architecture";

/** Asset types eligible for automatic platform registration. */
export type EnterpriseAssetType =
  | "capability"
  | "object"
  | "rule"
  | "policy"
  | "workflow"
  | "api"
  | "screen"
  | "dashboard"
  | "widget"
  | "report"
  | "integration"
  | "permission"
  | "role";

export type AtlasAssetStatus = EnterpriseArtifactStatus;

/** Aggregate compliance posture derived from design-time score. */
export type ComplianceStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_evaluated";

/** Lightweight reference — not enforced at runtime. */
export interface PerformanceBudgetReference {
  id: string;
  enterpriseId: string;
  label: string;
}

export type ArchitectureTimelineAction =
  | "created"
  | "updated"
  | "validated"
  | "approved"
  | "published"
  | "archived";

export interface ArchitectureTimelineEntry {
  id: string;
  enterpriseId: string;
  action: ArchitectureTimelineAction;
  actor: string;
  timestamp: string;
  version?: string;
  notes?: string;
}

export interface ArchitectureVersionHistoryEntry {
  version: string;
  status: AtlasAssetStatus;
  modifiedDate: string;
  actor?: string;
}

/**
 * Enterprise asset — generic model for any platform artifact.
 * Business transaction data must never be stored here.
 */
export interface EnterpriseAsset {
  enterpriseId: string;
  name: string;
  assetType: EnterpriseAssetType;
  category: string;
  description: string;
  module: string;
  owner: string;
  version: string;
  status: AtlasAssetStatus;
  createdDate: string;
  modifiedDate: string;
  documentationStatus: DocumentationStatus;
  complianceScore: number;
  complianceStatus: ComplianceStatus;
  performanceBudgetRef: PerformanceBudgetReference | null;
  parentAssetId: string | null;
  architectureMetadata: EnterpriseArchitectureMetadata;
  /** Platform source reference for automatic registration deduplication. */
  platformRef?: {
    module: string;
    refId: string;
  };
  versionHistory: ArchitectureVersionHistoryEntry[];
}

export interface ArchitectureMetrics {
  totalAssets: number;
  assetsByType: Partial<Record<EnterpriseAssetType, number>>;
  publishedAssets: number;
  draftAssets: number;
  deprecatedAssets: number;
  averageComplianceScore: number;
  documentationCoverage: number;
  performanceBudgetCoverage: number;
}

export type AtlasSectionId = "dashboard" | "explorer";

export interface AtlasAssetSearchFilters {
  query?: string;
  assetType?: EnterpriseAssetType | "all";
  module?: string | "all";
  owner?: string | "all";
  status?: AtlasAssetStatus | "all";
  category?: string | "all";
  version?: string;
}

export interface AtlasAssetSearchResult {
  items: EnterpriseAsset[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AtlasRegistrationInput {
  assetType: EnterpriseAssetType;
  name: string;
  category: string;
  description: string;
  module: string;
  owner: string;
  version: string;
  status: AtlasAssetStatus;
  documentationStatus?: DocumentationStatus;
  complianceScore?: number;
  parentAssetId?: string | null;
  performanceBudgetRef?: PerformanceBudgetReference | null;
  architectureMetadata?: Partial<EnterpriseArchitectureMetadata>;
  platformRef: {
    module: string;
    refId: string;
  };
  enterpriseId?: string;
  timelineAction?: ArchitectureTimelineAction;
  actor?: string;
}

/** Reserved extension points — not implemented in v0.1. */
export type AtlasReservedExtension =
  | "relationship_engine"
  | "dependency_engine"
  | "knowledge_graph"
  | "compass"
  | "sage"
  | "forge";
