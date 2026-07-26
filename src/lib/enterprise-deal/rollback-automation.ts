/**
 * CO-ARCH-002-W6 — Rollback automation helpers.
 *
 * Does NOT mutate Vercel/env. Produces the exact OFF matrix and optional
 * client-side cleanup of non-authoritative local diagnostics.
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
} from "@/constants/enterprise-deal-registry";
import { clearReconcileLog } from "@/lib/enterprise-deal/dual-write-store";

export type DealRollbackStep = {
  order: number;
  action: string;
  envKeys?: string[];
  severity: "immediate" | "follow_up";
};

/** Full idle matrix — set every Deal flag false (server + public mirrors). */
export function buildDealIdleFlagEnvLines(): string[] {
  const lines: string[] = [
    `${DEAL_REGISTRY_API_ENABLED_ENV}=false`,
    `${NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED_ENV}=false`,
    `${DEAL_REGISTRY_DUAL_WRITE_ENV}=false`,
    `${NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE_ENV}=false`,
    `${DEAL_REGISTRY_SHADOW_READ_ENV}=false`,
    `NEXT_PUBLIC_DEAL_REGISTRY_SHADOW_READ=false`,
    `${DEAL_REGISTRY_PORT_RUNTIME_ENV}=false`,
    `${NEXT_PUBLIC_DEAL_REGISTRY_PORT_RUNTIME_ENV}=false`,
    `${DEAL_REGISTRY_IMPORT_ENABLED_ENV}=false`,
    `${DEAL_REGISTRY_BLOCK_LOCAL_WRITE_ENV}=false`,
  ];
  for (const m of DEAL_CONSUMER_MODULES) {
    const env = getDealConsumerFlagEnv(m);
    lines.push(`${env.server}=false`);
    lines.push(`${env.public}=false`);
  }
  return lines;
}

/**
 * Emergency rollback sequence (fastest restore of Soft Go-Live reads/writes).
 * Order: block-local OFF → consumers OFF → port OFF → dual-write OFF → shadow OFF → API OFF (optional).
 */
export function buildDealEmergencyRollbackSteps(): DealRollbackStep[] {
  return [
    {
      order: 1,
      severity: "immediate",
      action: "Set DEAL_REGISTRY_BLOCK_LOCAL_WRITE=false (restore local writes if blocked)",
      envKeys: [DEAL_REGISTRY_BLOCK_LOCAL_WRITE_ENV],
    },
    {
      order: 2,
      severity: "immediate",
      action: "Disable all Wave 5 consumer flags (server + NEXT_PUBLIC mirrors)",
      envKeys: DEAL_CONSUMER_MODULES.flatMap((m) => {
        const env = getDealConsumerFlagEnv(m);
        return [env.server, env.public];
      }),
    },
    {
      order: 3,
      severity: "immediate",
      action: "Disable My Deals PORT_RUNTIME",
      envKeys: [DEAL_REGISTRY_PORT_RUNTIME_ENV, NEXT_PUBLIC_DEAL_REGISTRY_PORT_RUNTIME_ENV],
    },
    {
      order: 4,
      severity: "follow_up",
      action: "Disable DUAL_WRITE (stop secondary upserts; local remains SSOT)",
      envKeys: [DEAL_REGISTRY_DUAL_WRITE_ENV, NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE_ENV],
    },
    {
      order: 5,
      severity: "follow_up",
      action: "Disable SHADOW_READ (stop compare traffic)",
      envKeys: [DEAL_REGISTRY_SHADOW_READ_ENV, "NEXT_PUBLIC_DEAL_REGISTRY_SHADOW_READ"],
    },
    {
      order: 6,
      severity: "follow_up",
      action: "Optionally disable Deal API (404) if API defects persist",
      envKeys: [DEAL_REGISTRY_API_ENABLED_ENV, NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED_ENV],
    },
  ];
}

/**
 * Client-side diagnostic cleanup only — does not delete Enterprise Deals or LoanFiles.
 */
export function runClientDealRollbackDiagnosticsCleanup(): {
  clearedReconcileLog: boolean;
  note: string;
} {
  clearReconcileLog();
  return {
    clearedReconcileLog: true,
    note: "Reconcile log cleared. Deal rows and local LoanFiles untouched. Apply env idle matrix in Vercel to complete rollback.",
  };
}

export function formatRollbackRunbookMarkdown(): string {
  const steps = buildDealEmergencyRollbackSteps();
  const lines = [
    "# CO-ARCH-002 — Deal Cutover Rollback Runbook",
    "",
    "Wave 6 automation output. Apply in Vercel / `.env` — never leave BLOCK_LOCAL_WRITE ON during emergency rollback.",
    "",
    "## Emergency sequence",
    "",
    ...steps.map(
      (s) =>
        `${s.order}. **${s.severity}** — ${s.action}` +
        (s.envKeys?.length ? `\n   - Keys: \`${s.envKeys.join("`, `")}\`` : ""),
    ),
    "",
    "## Idle matrix (paste)",
    "",
    "```env",
    ...buildDealIdleFlagEnvLines(),
    "```",
    "",
    "## Post-rollback",
    "",
    "1. Redeploy or restart so `NEXT_PUBLIC_*` mirrors take effect.",
    "2. Confirm Soft Go-Live UX (My Deals + Loan Workspace) from localStorage.",
    "3. Retain Enterprise Deal rows ≥ 30 days — do not hard-delete.",
    "4. Clear browser reconcile diagnostics via Architecture Health if needed.",
    "",
  ];
  return lines.join("\n");
}
