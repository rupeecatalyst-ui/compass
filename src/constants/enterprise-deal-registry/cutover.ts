/**
 * CO-ARCH-002-W6 — Cutover activation strategy & monitoring thresholds.
 *
 * Strategy only — Wave 6 does NOT enable production flags.
 * Activation requires final ARB + ESC after Wave 6 approval.
 */
import {
  DEAL_CONSUMER_MODULES,
  DEAL_REGISTRY_API_ENABLED_ENV,
  DEAL_REGISTRY_BLOCK_LOCAL_WRITE_ENV,
  DEAL_REGISTRY_DUAL_WRITE_ENV,
  DEAL_REGISTRY_IMPORT_ENABLED_ENV,
  DEAL_REGISTRY_PORT_RUNTIME_ENV,
  DEAL_REGISTRY_SHADOW_READ_ENV,
  NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED_ENV,
  NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE_ENV,
  NEXT_PUBLIC_DEAL_REGISTRY_PORT_RUNTIME_ENV,
  NEXT_PUBLIC_DEAL_REGISTRY_SHADOW_READ_ENV,
  getDealConsumerFlagEnv,
  type DealConsumerModule,
} from "./flags";

/** Ordered pilot enablement — never skip ahead without gate pass. */
export const DEAL_CUTOVER_ACTIVATION_PHASES = [
  {
    id: "phase_0_idle",
    title: "Idle (Wave 6 delivery)",
    description: "All Deal flags OFF — Soft Go-Live unchanged",
    flagsToEnable: [] as string[],
    gate: "Wave 6 ARB Approved + ESC Go-Live authorization",
  },
  {
    id: "phase_1_api",
    title: "Deal API available",
    description: "API responds; UI still legacy",
    flagsToEnable: [DEAL_REGISTRY_API_ENABLED_ENV, NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED_ENV],
    gate: "API smoke + tenancy checks pass",
  },
  {
    id: "phase_2_dual_write",
    title: "Dual-write",
    description: "Local save also upserts Enterprise Deal",
    flagsToEnable: [DEAL_REGISTRY_DUAL_WRITE_ENV, NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE_ENV],
    gate: "Create → Deal row; reconcile log healthy",
  },
  {
    id: "phase_3_shadow",
    title: "Shadow Read",
    description: "Silent compare; no UI cutover",
    flagsToEnable: [DEAL_REGISTRY_SHADOW_READ_ENV, NEXT_PUBLIC_DEAL_REGISTRY_SHADOW_READ_ENV],
    gate: "Mismatch rate ≤ 5% for soak window",
  },
  {
    id: "phase_4_my_deals_port",
    title: "My Deals port runtime",
    description: "My Deals prefers Enterprise Deal rows",
    flagsToEnable: [DEAL_REGISTRY_PORT_RUNTIME_ENV, NEXT_PUBLIC_DEAL_REGISTRY_PORT_RUNTIME_ENV],
    gate: "Shadow passed; UAT My Deals parity",
  },
  {
    id: "phase_5_consumers",
    title: "Workspace consumers (one at a time)",
    description: "Enable Wave 5 consumer flags module-by-module",
    flagsToEnable: DEAL_CONSUMER_MODULES.flatMap((m) => {
      const env = getDealConsumerFlagEnv(m);
      return [env.server, env.public];
    }),
    gate: "Each module certified before next; rollback validated",
  },
  {
    id: "phase_6_block_local",
    title: "Block local SSOT writes",
    description: "Enterprise Deal becomes write authority",
    flagsToEnable: [DEAL_REGISTRY_BLOCK_LOCAL_WRITE_ENV],
    gate: "Final ARB + empty-localStorage proof + 30-day retention plan",
  },
] as const;

/** Controlled module enablement order (Wave 5 consumers). */
export const DEAL_CONSUMER_ENABLEMENT_ORDER: readonly DealConsumerModule[] = [
  "opportunity_workspace",
  "loan_workspace",
  "documents",
  "tasks",
  "activities",
  "customer_360",
] as const;

/** Monitoring / alert thresholds (Wave 6). */
export const DEAL_CUTOVER_MONITORING = {
  /** Shadow mismatch rate above this → pause enablement. */
  materialMismatchRate: 0.05,
  /** Dual-write exhausted/failed entries in last window → alert. */
  dualWriteFailureAlertCount: 5,
  /** Soft soak for shadow before PORT_RUNTIME (hours). */
  shadowSoakHoursMin: 24,
  /** DAL sync read overhead vs direct load — advisory budget (ms p95 delta). */
  dalOverheadBudgetMs: 5,
  /** Deal API list p95 budget when enabled (ms). */
  dealApiListP95BudgetMs: 800,
  /** Import flag — never auto-enable in cutover path without ESC. */
  importFlag: DEAL_REGISTRY_IMPORT_ENABLED_ENV,
} as const;

export type DealCutoverPhaseId = (typeof DEAL_CUTOVER_ACTIVATION_PHASES)[number]["id"];
