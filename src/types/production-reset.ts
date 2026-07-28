/**
 * CO-ADMIN-004 — Production Reset & Demo Data Cleanup (types).
 * Transactional business data only — never master/configuration.
 */

export type ProductionResetEntityKey =
  | "contacts"
  | "opportunities"
  | "deals"
  | "tasks"
  | "documents"
  | "notes"
  | "timeline"
  | "notifications"
  | "activities";

export type ProductionResetPresetId =
  | "demo_data_only"
  | "production_cutover"
  | "custom";

export type ProductionResetMode = "analyse" | "dry_run" | "execute";

export type ProductionResetRunStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "cancelled";

export interface ProductionResetEntitySelection {
  contacts: boolean;
  opportunities: boolean;
  deals: boolean;
  tasks: boolean;
  documents: boolean;
  notes: boolean;
  timeline: boolean;
  notifications: boolean;
  activities: boolean;
}

export interface ProductionResetFilters {
  /** Soft-delete records created on/before this ISO date (inclusive end of day). */
  createdBefore?: string | null;
  /** Prefer records created by these user IDs. */
  createdByUserIds?: string[];
  /** Opportunity number prefixes (e.g. DEMO-, TEST-, UAT-). */
  opportunityPrefixes?: string[];
  /** Contact name prefixes (e.g. Demo, Test). */
  contactPrefixes?: string[];
  /** Deal / opportunity numbers matching demo heuristics (DEMO/TEST/UAT/SAMPLE). */
  demoHeuristics?: boolean;
  /** Prefer rows with an import batch id (migrated / seeded batches). */
  importBatchOnly?: boolean;
}

export interface ProductionResetEntityCount {
  entity: string;
  activeCount: number;
  alreadyDeletedCount: number;
  earliestCreatedAt: string | null;
  latestCreatedAt: string | null;
  latestUpdatedAt: string | null;
}

export interface ProductionResetAnalyseResult {
  generatedAt: string;
  persistenceReady: boolean;
  featureEnabled: boolean;
  organizationIds: string[];
  entities: ProductionResetEntityCount[];
  estimatedRecordsAffected: number;
  preservedCategories: string[];
  warnings: string[];
}

/** CO-CUTOVER-001 — demo vs live inventory (analysis only; no deletion). */
export interface CutoverDemoVsLiveLine {
  entity: string;
  totalActive: number;
  demoCandidateCount: number;
  liveRetainedEstimate: number;
  notes?: string;
}

export interface CutoverAnalysisResult {
  programme: "CO-CUTOVER-001";
  generatedAt: string;
  deletionPerformed: false;
  awaitingAdministratorReview: true;
  persistenceReady: boolean;
  featureEnabled: boolean;
  organizationIds: string[];
  preservedCategories: string[];
  inventory: ProductionResetEntityCount[];
  demoVsLive: CutoverDemoVsLiveLine[];
  demoImpactPreview: ProductionResetImpactAnalysis;
  rebuildPlan: string[];
  validationChecklist: string[];
  warnings: string[];
  recommendations: string[];
}

export interface ProductionResetImpactLine {
  entity: ProductionResetEntityKey | string;
  matchedCount: number;
  dependentOf?: string;
  action: "soft_delete" | "hard_delete" | "skip";
}

export interface ProductionResetImpactAnalysis {
  generatedAt: string;
  mode: "dry_run" | "execute";
  preset: ProductionResetPresetId;
  selection: ProductionResetEntitySelection;
  filters: ProductionResetFilters;
  lines: ProductionResetImpactLine[];
  totalMatched: number;
  estimatedDurationMs: number;
  relationshipImpact: string[];
  orphanRisks: string[];
  warnings: string[];
  recommendations: string[];
}

export interface ProductionResetExecutionResult {
  runId: string;
  mode: ProductionResetMode;
  status: ProductionResetRunStatus;
  dryRun: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  reason: string;
  countsRemoved: Record<string, number>;
  countsRemaining: Record<string, number>;
  impact: ProductionResetImpactAnalysis;
  report: ProductionResetCutoverReport;
  warnings: string[];
  errorMessage?: string | null;
}

export interface ProductionResetCutoverReport {
  title: string;
  summary: string;
  runId: string;
  dryRun: boolean;
  administrator: { userId: string; email?: string; name?: string };
  executedAt: string;
  durationMs: number;
  entityCountsRemoved: Record<string, number>;
  remainingCounts: Record<string, number>;
  warnings: string[];
  recommendations: string[];
  preservedMastersNote: string;
}

export interface ProductionResetExecuteRequest {
  mode: "dry_run" | "execute";
  preset: ProductionResetPresetId;
  selection: ProductionResetEntitySelection;
  filters: ProductionResetFilters;
  reason: string;
  /** Required for execute — must equal RESET PRODUCTION DATA */
  typedConfirmation?: string;
  /** Required for execute — current administrator password */
  password?: string;
  acknowledgedIrreversible?: boolean;
}

export interface ProductionResetRunSummary {
  id: string;
  mode: ProductionResetMode;
  status: ProductionResetRunStatus;
  dryRun: boolean;
  actorUserId: string;
  actorEmail: string | null;
  reason: string;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
  totalRemoved: number | null;
}
