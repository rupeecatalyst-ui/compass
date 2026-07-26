/**
 * CO-OPS-001.1 — Release Health derivation + clipboard payload.
 */
import type {
  BuildDealRegistryStatus,
  BuildDeploymentEnvironment,
  BuildHealthIndicator,
  BuildHealthLevel,
  BuildInformationPayload,
  BuildPersistenceModeLabel,
  BuildReleaseHealth,
} from "@/types/build-information";
import { formatBuildDisplayTimestamp } from "@/types/build-information";

function level(
  status: BuildHealthLevel,
  label: string,
  detail?: string,
): BuildHealthIndicator {
  return { status, label, detail };
}

export function healthEmoji(status: BuildHealthLevel): string {
  if (status === "healthy") return "🟢";
  if (status === "warning") return "🟡";
  return "🔴";
}

export function healthToneClass(status: BuildHealthLevel): string {
  if (status === "healthy") return "text-emerald-700 dark:text-emerald-400";
  if (status === "warning") return "text-amber-700 dark:text-amber-400";
  return "text-red-700 dark:text-red-400";
}

function dealRegistryHealth(
  status: BuildDealRegistryStatus,
  persistence: BuildPersistenceModeLabel,
): BuildHealthIndicator {
  if (status === "Operational") {
    return level("healthy", "Healthy", status);
  }
  if (status === "Idle (Soft Go-Live)") {
    return level("warning", "Warning", status);
  }
  if (persistence === "Memory") {
    return level("warning", "Warning", "Unavailable in memory mode");
  }
  return level("error", "Error", status);
}

function migrationHealth(
  persistence: BuildPersistenceModeLabel,
  databaseConnected: boolean,
  lastMigration: string | null,
): BuildHealthIndicator {
  if (persistence === "Memory") {
    return level("warning", "Warning", "Not applicable (memory mode)");
  }
  if (!databaseConnected) {
    return level("error", "Error", "Cannot verify migrations — database unreachable");
  }
  if (!lastMigration) {
    return level("warning", "Warning", "No finished migration recorded");
  }
  return level("healthy", "Healthy", lastMigration);
}

function gitTreeHealth(
  workingTree: "Clean" | "Dirty" | "Unknown" | null | undefined,
  env: BuildDeploymentEnvironment,
): BuildHealthIndicator {
  if (workingTree === "Clean") {
    return level("healthy", "Healthy", "Clean");
  }
  if (workingTree === "Dirty") {
    return level(
      env === "Local" ? "warning" : "error",
      env === "Local" ? "Warning" : "Error",
      "Dirty",
    );
  }
  return level("warning", "Warning", "Unknown");
}

export type DeriveReleaseHealthInput = {
  applicationOk: boolean;
  /** checking = initial load; ok = admin API authorized; failed = 401/403 or no token */
  authenticationState: "checking" | "ok" | "failed";
  databaseConnected: boolean;
  persistenceMode: BuildPersistenceModeLabel;
  dealRegistryStatus: BuildDealRegistryStatus;
  lastMigrationApplied: string | null;
  gitWorkingTreeStatus: "Clean" | "Dirty" | "Unknown";
  deploymentEnvironment: BuildDeploymentEnvironment;
  gitBranch: string | null;
};

export function deriveReleaseHealth(input: DeriveReleaseHealthInput): BuildReleaseHealth {
  const applicationStatus = input.applicationOk
    ? level("healthy", "Healthy", "Application responding")
    : level("error", "Error", "Application details unavailable");

  const databaseConnectivity =
    input.persistenceMode === "Memory"
      ? level("warning", "Warning", "Memory mode — no Postgres connection required")
      : input.databaseConnected
        ? level("healthy", "Healthy", "Connected")
        : level("error", "Error", "Not connected");

  const authenticationStatus =
    input.authenticationState === "checking"
      ? level("warning", "Warning", "Checking…")
      : input.authenticationState === "ok"
        ? level("healthy", "Healthy", "Administrator session valid")
        : level("error", "Error", "Authentication failed or missing");

  return {
    applicationStatus,
    databaseConnectivity,
    authenticationStatus,
    dealRegistryStatus: dealRegistryHealth(
      input.dealRegistryStatus,
      input.persistenceMode,
    ),
    migrationStatus: migrationHealth(
      input.persistenceMode,
      input.databaseConnected,
      input.lastMigrationApplied,
    ),
    gitWorkingTreeStatus: gitTreeHealth(
      input.gitWorkingTreeStatus,
      input.deploymentEnvironment,
    ),
    currentEnvironment: input.deploymentEnvironment,
    currentBranch: input.gitBranch ?? "—",
  };
}

/** Clipboard text for support / ChatGPT / GitHub Issues. */
export function formatBuildInformationClipboard(info: BuildInformationPayload): string {
  const lines = [
    "----------------------------------------",
    "",
    info.applicationName,
    "",
    `Version: ${info.applicationVersion}`,
    `Build: ${info.buildNumber}`,
    `Environment: ${info.deploymentEnvironment}`,
    `Branch: ${info.gitBranch ?? "—"}`,
    `Commit: ${info.gitCommitHash ?? "—"}`,
    `Build Timestamp: ${formatBuildDisplayTimestamp(info.buildTimestamp)}`,
    `Deployment Timestamp: ${formatBuildDisplayTimestamp(info.deploymentTimestamp)}`,
    `Database: ${info.connectedProjectName ?? "—"}`,
    `Project Reference: ${info.connectedProjectRef ?? "—"}`,
    `Persistence Mode: ${info.persistenceMode}`,
    `Deal Registry: ${info.dealRegistryStatus}`,
    `Migration: ${info.lastMigrationApplied ?? "—"}`,
    "",
    "----------------------------------------",
  ];
  return lines.join("\n");
}
