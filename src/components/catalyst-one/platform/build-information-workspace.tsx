"use client";

/**
 * CO-OPS-001 / CO-OPS-001.1 — Administrator Build Information workspace.
 * Operational visibility only — not shown to non-administrators.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { getAccessToken } from "@/lib/api-client";
import {
  BUILD_INFORMATION_CERTIFICATION,
  certificationStatusEmoji,
  certificationStatusLabel,
  isCertificationStageForEnvironment,
} from "@/constants/build-information";
import {
  deriveReleaseHealth,
  formatBuildInformationClipboard,
  getBuildWhatsNew,
  healthEmoji,
  healthToneClass,
  resolveBuildInformationPublic,
} from "@/lib/build-information";
import type {
  BuildHealthIndicator,
  BuildInformationPayload,
} from "@/types/build-information";
import { formatBuildDisplayTimestamp } from "@/types/build-information";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RowProps = { label: string; value: ReactNode };

function emptyExtras(): Pick<
  BuildInformationPayload,
  | "databaseSchemaVersion"
  | "lastMigrationApplied"
  | "lastMigrationFinishedAt"
  | "connectedProjectName"
  | "connectedProjectRef"
  | "persistenceMode"
  | "dealRegistryStatus"
  | "databaseConnected"
  | "gitWorkingTreeStatus"
  | "whatsNew"
> {
  return {
    databaseSchemaVersion: null,
    lastMigrationApplied: null,
    lastMigrationFinishedAt: null,
    connectedProjectName: null,
    connectedProjectRef: null,
    persistenceMode: "Unknown",
    dealRegistryStatus: "Unknown",
    databaseConnected: false,
    gitWorkingTreeStatus: "Unknown",
    whatsNew: getBuildWhatsNew(),
  };
}

function InfoRow({ label, value }: RowProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 break-all text-sm font-medium text-foreground sm:text-right">
        {value ?? "—"}
      </dd>
    </div>
  );
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2 pt-4">
        <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="pb-4">
        <dl>{children}</dl>
      </CardContent>
    </Card>
  );
}

function HealthRow({ label, indicator }: { label: string; indicator: BuildHealthIndicator }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 sm:text-right">
        <span className={cn("text-sm font-semibold", healthToneClass(indicator.status))}>
          {healthEmoji(indicator.status)} {indicator.label}
        </span>
        {indicator.detail ? (
          <span className="mt-0.5 block text-xs text-muted-foreground sm:mt-0 sm:ml-2 sm:inline">
            {indicator.detail}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function envPillVariant(env: string): "success" | "warning" | "info" | "muted" {
  if (env === "Production") return "warning";
  if (env === "Preview") return "info";
  return "success";
}

export function BuildInformationWorkspace() {
  const [data, setData] = useState<BuildInformationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<"checking" | "ok" | "failed">("checking");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const publicFallback: BuildInformationPayload = {
      ...resolveBuildInformationPublic(),
      ...emptyExtras(),
    };

    async function load() {
      setLoading(true);
      setError(null);
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setData(publicFallback);
          setAuthState("failed");
          setError("Authentication required to load database details.");
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch("/api/admin/build-information", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = (await res.json()) as {
          success?: boolean;
          data?: BuildInformationPayload;
          error?: { message?: string };
        };
        if (res.status === 401 || res.status === 403) {
          throw Object.assign(
            new Error(body.error?.message || "Administrator authentication failed"),
            { authFailed: true },
          );
        }
        if (!res.ok || !body.success || !body.data) {
          throw new Error(body.error?.message || `Request failed (${res.status})`);
        }
        if (!cancelled) {
          setData(body.data);
          setAuthState("ok");
        }
      } catch (e) {
        if (!cancelled) {
          setData(publicFallback);
          const authFailed = Boolean(e && typeof e === "object" && "authFailed" in e);
          setAuthState(authFailed ? "failed" : "ok");
          setError(e instanceof Error ? e.message : "Failed to load Build Information");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const info: BuildInformationPayload = data ?? {
    ...resolveBuildInformationPublic(),
    ...emptyExtras(),
  };

  const releaseHealth = useMemo(
    () =>
      deriveReleaseHealth({
        applicationOk: Boolean(info.applicationVersion),
        authenticationState: loading ? "checking" : authState,
        databaseConnected: info.databaseConnected,
        persistenceMode: info.persistenceMode,
        dealRegistryStatus: info.dealRegistryStatus,
        lastMigrationApplied: info.lastMigrationApplied,
        gitWorkingTreeStatus: info.gitWorkingTreeStatus,
        deploymentEnvironment: info.deploymentEnvironment,
        gitBranch: info.gitBranch,
      }),
    [authState, info, loading],
  );

  const lastUpdated =
    formatBuildDisplayTimestamp(info.deploymentTimestamp) !== "—"
      ? formatBuildDisplayTimestamp(info.deploymentTimestamp)
      : formatBuildDisplayTimestamp(info.buildTimestamp);

  const handleCopy = async () => {
    const text = formatBuildInformationClipboard(info);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Unable to copy to clipboard.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Build Information"
        description="Operational visibility into the exact Catalyst One build, environment, and database connection. Administrators only."
      />

      {/* Build Status Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Build Status
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground">
              {info.applicationName}
            </h2>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Copy Build Information
              </>
            )}
          </Button>
        </div>
        <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Version</dt>
            <dd className="text-sm font-semibold">{info.applicationVersion}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Build</dt>
            <dd className="text-sm font-semibold">{info.buildNumber}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Environment</dt>
            <dd className="mt-0.5">
              <StatusPill variant={envPillVariant(info.deploymentEnvironment)} dot>
                {info.deploymentEnvironment}
              </StatusPill>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last Updated</dt>
            <dd className="text-sm font-semibold">{lastUpdated}</dd>
          </div>
        </dl>
        {loading ? (
          <p className="mt-3 text-xs text-muted-foreground">Loading live database details…</p>
        ) : null}
        {error ? (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400" role="status">
            {error} Showing build-time values where available.
          </p>
        ) : null}
      </div>

      {/* Release Health */}
      <SectionCard title="Release Health">
        <HealthRow label="Application Status" indicator={releaseHealth.applicationStatus} />
        <HealthRow label="Database Connectivity" indicator={releaseHealth.databaseConnectivity} />
        <HealthRow label="Authentication Status" indicator={releaseHealth.authenticationStatus} />
        <HealthRow
          label="Enterprise Deal Registry Status"
          indicator={releaseHealth.dealRegistryStatus}
        />
        <HealthRow label="Migration Status" indicator={releaseHealth.migrationStatus} />
        <HealthRow
          label="Git Working Tree Status"
          indicator={releaseHealth.gitWorkingTreeStatus}
        />
        <InfoRow label="Current Environment" value={releaseHealth.currentEnvironment} />
        <InfoRow label="Current Branch" value={releaseHealth.currentBranch} />
      </SectionCard>

      {/* Current Certification */}
      <Card className="border-border bg-card shadow-none">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold tracking-tight">
            Current Certification
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <ul className="space-y-3">
            {BUILD_INFORMATION_CERTIFICATION.map((stage) => {
              const active = isCertificationStageForEnvironment(
                stage.id,
                info.deploymentEnvironment,
              );
              return (
                <li
                  key={stage.id}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-lg border border-transparent px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
                    active && "border-border bg-muted/40",
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{stage.label}</p>
                    {stage.note ? (
                      <p className="text-xs text-muted-foreground">{stage.note}</p>
                    ) : null}
                    {active ? (
                      <p className="text-xs text-muted-foreground">Current environment</p>
                    ) : null}
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {certificationStatusEmoji(stage.status)}{" "}
                    {certificationStatusLabel(stage.status)}
                  </p>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Application">
          <InfoRow label="Application Name" value={info.applicationName} />
          <InfoRow label="Application Version" value={info.applicationVersion} />
          <InfoRow label="Build Number" value={info.buildNumber} />
        </SectionCard>

        <SectionCard title="Source Control">
          <InfoRow label="Git Branch" value={info.gitBranch ?? "—"} />
          <InfoRow label="Git Commit Hash" value={info.gitCommitHash ?? "—"} />
          <InfoRow
            label="Commit Timestamp"
            value={formatBuildDisplayTimestamp(info.gitCommitTimestamp)}
          />
        </SectionCard>

        <SectionCard title="Deployment">
          <InfoRow
            label="Build Timestamp"
            value={formatBuildDisplayTimestamp(info.buildTimestamp)}
          />
          <InfoRow
            label="Deployment Timestamp"
            value={formatBuildDisplayTimestamp(info.deploymentTimestamp)}
          />
          <InfoRow
            label="Deployment Environment"
            value={
              <StatusPill variant={envPillVariant(info.deploymentEnvironment)} dot>
                {info.deploymentEnvironment}
              </StatusPill>
            }
          />
        </SectionCard>

        <SectionCard title="Platform">
          <InfoRow label="Frontend Version" value={info.frontendVersion} />
          <InfoRow label="Backend Version" value={info.backendVersion} />
          <InfoRow label="API Version" value={info.apiVersion} />
          <InfoRow
            label="Database Schema Version"
            value={info.databaseSchemaVersion ?? "—"}
          />
        </SectionCard>

        <SectionCard title="Database">
          <InfoRow
            label="Connected Project Name"
            value={info.connectedProjectName ?? "—"}
          />
          <InfoRow
            label="Connected Supabase Project Reference"
            value={info.connectedProjectRef ?? "—"}
          />
          <InfoRow label="Current Persistence Mode" value={info.persistenceMode} />
          <InfoRow
            label="Database Connected"
            value={info.databaseConnected ? "Yes" : "No"}
          />
        </SectionCard>

        <SectionCard title="Runtime">
          <InfoRow
            label="Enterprise Deal Registry Status"
            value={info.dealRegistryStatus}
          />
          <InfoRow label="Environment Mode" value={info.environmentMode} />
          <InfoRow
            label="Last Migration Applied"
            value={info.lastMigrationApplied ?? "—"}
          />
          <InfoRow
            label="Last Migration Finished"
            value={formatBuildDisplayTimestamp(info.lastMigrationFinishedAt)}
          />
        </SectionCard>
      </div>

      <Card className="border-border bg-card shadow-none">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold tracking-tight">
            What&apos;s New in this Build
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {info.whatsNew.length === 0 ? (
            <p className="text-sm text-muted-foreground">No release notes for this build yet.</p>
          ) : (
            <ul className="space-y-4">
              {info.whatsNew.map((entry) => (
                <li key={`${entry.version}-${entry.date}`}>
                  <p className="text-sm font-semibold text-foreground">
                    {entry.version.startsWith("v") ? entry.version : `v${entry.version}`}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {entry.date}
                    </span>
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {entry.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        Build information is visible only to authorized administrators.
      </p>
    </div>
  );
}
