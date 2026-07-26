/**
 * CO-OPS-001 / CO-OPS-001.1 — Build Information types & helpers.
 */
export type BuildDeploymentEnvironment = "Local" | "Preview" | "Production";

export type BuildPersistenceModeLabel = "Prisma" | "Memory" | "Hybrid" | "Unknown";

export type BuildDealRegistryStatus =
  | "Operational"
  | "Idle (Soft Go-Live)"
  | "Unavailable"
  | "Unknown";

export type BuildHealthLevel = "healthy" | "warning" | "error";

export type BuildHealthIndicator = {
  status: BuildHealthLevel;
  /** Short display: Healthy | Warning | Error */
  label: string;
  detail?: string;
};

export type BuildGitWorkingTreeStatus = "Clean" | "Dirty" | "Unknown";

export type BuildReleaseHealth = {
  applicationStatus: BuildHealthIndicator;
  databaseConnectivity: BuildHealthIndicator;
  authenticationStatus: BuildHealthIndicator;
  dealRegistryStatus: BuildHealthIndicator;
  migrationStatus: BuildHealthIndicator;
  gitWorkingTreeStatus: BuildHealthIndicator;
  currentEnvironment: BuildDeploymentEnvironment;
  currentBranch: string;
};

export type BuildInformationPublic = {
  applicationName: string;
  applicationVersion: string;
  buildNumber: string;
  gitBranch: string | null;
  gitCommitHash: string | null;
  gitCommitTimestamp: string | null;
  buildTimestamp: string | null;
  deploymentTimestamp: string | null;
  deploymentEnvironment: BuildDeploymentEnvironment;
  frontendVersion: string;
  backendVersion: string;
  apiVersion: string;
  environmentMode: string;
};

export type BuildInformationServerExtras = {
  databaseSchemaVersion: string | null;
  lastMigrationApplied: string | null;
  lastMigrationFinishedAt: string | null;
  connectedProjectName: string | null;
  connectedProjectRef: string | null;
  persistenceMode: BuildPersistenceModeLabel;
  dealRegistryStatus: BuildDealRegistryStatus;
  databaseConnected: boolean;
  gitWorkingTreeStatus: BuildGitWorkingTreeStatus;
};

export type BuildInformationPayload = BuildInformationPublic &
  BuildInformationServerExtras & {
    whatsNew: Array<{ version: string; date: string; items: string[] }>;
  };

export function shortGitHash(hash: string | null | undefined): string | null {
  if (!hash) return null;
  const trimmed = hash.trim();
  if (!trimmed) return null;
  return trimmed.length > 7 ? trimmed.slice(0, 7) : trimmed;
}

export function formatBuildDisplayTimestamp(isoOrNull: string | null | undefined): string {
  if (!isoOrNull) return "—";
  const d = new Date(isoOrNull);
  if (Number.isNaN(d.getTime())) return isoOrNull;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}
