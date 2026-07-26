/**
 * CO-ARCH-002-W6 — Cutover health snapshot (monitoring input for admin dashboard).
 * Read-only. Never flips feature flags.
 */
import {
  DEAL_CONSUMER_MODULES,
  DEAL_CUTOVER_MONITORING,
  isDealConsumerModuleEnabled,
  isDealRegistryApiEnabled,
  isDealRegistryDualWriteEnabled,
  isDealRegistryImportEnabled,
  isDealRegistryLocalWriteBlocked,
  isDealRegistryPortRuntimeActive,
  isDealRegistryShadowReadEnabled,
  isEnterpriseDealRegistryOperational,
  type DealConsumerModule,
} from "@/constants/enterprise-deal-registry";
import { getDealIdMap, listReconcileLog } from "@/lib/enterprise-deal/dual-write-store";
import {
  getLatestShadowMetrics,
  getModuleMigrationStatus,
  listShadowMismatches,
} from "@/lib/enterprise-deal/shadow-read";

export type DealFlagSnapshot = {
  api: boolean;
  dualWrite: boolean;
  shadowRead: boolean;
  portRuntime: boolean;
  importEnabled: boolean;
  blockLocalWrite: boolean;
  consumers: Record<DealConsumerModule, boolean>;
};

export type DealCutoverAlert = {
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
};

export type DealCutoverHealthSnapshot = {
  at: string;
  deliveryIdle: boolean;
  flags: DealFlagSnapshot;
  anyFlagOn: boolean;
  mappedDealCount: number;
  reconcileFailureCount: number;
  shadowMismatchCount: number;
  shadowMismatchRate: number | null;
  materialDiscrepancy: boolean;
  myDealsShadowStatus: string;
  alerts: DealCutoverAlert[];
  readinessNote: string;
};

function buildFlagSnapshot(): DealFlagSnapshot {
  const consumers = {} as Record<DealConsumerModule, boolean>;
  for (const m of DEAL_CONSUMER_MODULES) {
    consumers[m] = isDealConsumerModuleEnabled(m);
  }
  return {
    api: isDealRegistryApiEnabled(),
    dualWrite: isDealRegistryDualWriteEnabled(),
    shadowRead: isDealRegistryShadowReadEnabled(),
    portRuntime: isDealRegistryPortRuntimeActive(),
    importEnabled: isDealRegistryImportEnabled(),
    blockLocalWrite: isDealRegistryLocalWriteBlocked(),
    consumers,
  };
}

export function buildDealCutoverHealthSnapshot(): DealCutoverHealthSnapshot {
  const flags = buildFlagSnapshot();
  const anyFlagOn =
    flags.api ||
    flags.dualWrite ||
    flags.shadowRead ||
    flags.portRuntime ||
    flags.importEnabled ||
    flags.blockLocalWrite ||
    Object.values(flags.consumers).some(Boolean);

  const reconcile = listReconcileLog().filter(
    (e) => e.status === "exhausted" || e.status === "failed" || e.status === "conflict",
  );
  const shadow = getLatestShadowMetrics("my_deals");
  const mismatches = listShadowMismatches().filter((m) => m.module === "my_deals");
  const moduleStatus = getModuleMigrationStatus("my_deals");

  const alerts: DealCutoverAlert[] = [];

  if (!anyFlagOn) {
    alerts.push({
      severity: "info",
      code: "IDLE_DELIVERY",
      message: "All Deal cutover flags OFF — Soft Go-Live idle (Wave 6 delivery state).",
    });
  }

  if (flags.blockLocalWrite) {
    alerts.push({
      severity: "critical",
      code: "BLOCK_LOCAL_ON",
      message: "DEAL_REGISTRY_BLOCK_LOCAL_WRITE is ON — local SSOT writes blocked.",
    });
  } else if (isEnterpriseDealRegistryOperational()) {
    alerts.push({
      severity: "info",
      code: "LOCAL_WRITE_PROJECTION_ONLY",
      message:
        "CO-STAB-002 — Registry operational: LoanFile localStorage durable writes are blocked (projection notify only).",
    });
  }

  if (reconcile.length >= DEAL_CUTOVER_MONITORING.dualWriteFailureAlertCount) {
    alerts.push({
      severity: "warning",
      code: "DUAL_WRITE_FAILURES",
      message: `${reconcile.length} dual-write failures/conflicts in reconcile log (threshold ${DEAL_CUTOVER_MONITORING.dualWriteFailureAlertCount}).`,
    });
  }

  const mismatchRate = shadow?.mismatchRate ?? null;
  const material =
    shadow?.materialDiscrepancy === true ||
    (mismatchRate != null && mismatchRate > DEAL_CUTOVER_MONITORING.materialMismatchRate);

  if (material) {
    alerts.push({
      severity: "critical",
      code: "SHADOW_MATERIAL",
      message: "Shadow Read material discrepancy — pause PORT_RUNTIME / consumer enablement.",
    });
  }

  if (flags.portRuntime && !flags.shadowRead) {
    alerts.push({
      severity: "warning",
      code: "PORT_WITHOUT_SHADOW",
      message: "PORT_RUNTIME ON without SHADOW_READ — enable shadow soak before trusting port.",
    });
  }

  return {
    at: new Date().toISOString(),
    deliveryIdle: !anyFlagOn,
    flags,
    anyFlagOn,
    mappedDealCount: Object.keys(getDealIdMap()).length,
    reconcileFailureCount: reconcile.length,
    shadowMismatchCount: mismatches.length,
    shadowMismatchRate: mismatchRate,
    materialDiscrepancy: material,
    myDealsShadowStatus: moduleStatus.shadowRead,
    alerts,
    readinessNote: anyFlagOn
      ? "Cutover flags active — monitor reconcile + shadow gates before further enablement."
      : "Wave 6 delivery: idle. Do not enable production flags until final ARB approval.",
  };
}
