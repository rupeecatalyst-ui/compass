/**
 * CO-OPS-001 / CO-OPS-001.1 — Server-only Build Information.
 * Never returns connection strings or secrets.
 */
import { execSync } from "node:child_process";
import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { BUILD_INFORMATION_PROJECT_NAMES } from "@/constants/build-information/whats-new";
import {
  isDealRegistryApiEnabled,
  isDealRegistryDualWriteEnabled,
  isDealRegistryPortRuntimeActive,
  isEnterpriseDealRegistryOperational,
} from "@/constants/enterprise-deal-registry";
import { resolveEnterprisePersistenceMode } from "@/constants/enterprise-persistence";
import {
  getBuildWhatsNew,
  resolveBuildInformationPublic,
} from "@/lib/build-information/resolve-public";
import type {
  BuildDealRegistryStatus,
  BuildGitWorkingTreeStatus,
  BuildInformationPayload,
  BuildPersistenceModeLabel,
} from "@/types/build-information";

function extractProjectRef(databaseUrl: string | undefined): string | null {
  if (!databaseUrl) return null;
  try {
    const host = new URL(databaseUrl).hostname;
    const m =
      host.match(/^db\.([a-z0-9]+)\.supabase\.co$/i) ??
      host.match(/^([a-z0-9]+)\.pooler\.supabase\.com$/i) ??
      host.match(/^postgres\.([a-z0-9]+)\./i);
    if (m?.[1]) return m[1];
    const userMatch = databaseUrl.match(/postgres\.([a-z0-9]+):/i);
    if (userMatch?.[1]) return userMatch[1];
  } catch {
    /* ignore */
  }
  return null;
}

function resolvePersistenceLabel(): BuildPersistenceModeLabel {
  const mode = resolveEnterprisePersistenceMode();
  const dualRead = process.env.ENTERPRISE_MASTERS_DUAL_READ === "true";
  if (mode === "prisma" && dualRead) return "Hybrid";
  if (mode === "prisma") return "Prisma";
  if (mode === "memory") return "Memory";
  return "Unknown";
}

function resolveDealRegistryStatus(): BuildDealRegistryStatus {
  if (isEnterpriseDealRegistryOperational()) return "Operational";
  if (
    !isDealRegistryApiEnabled() &&
    !isDealRegistryDualWriteEnabled() &&
    !isDealRegistryPortRuntimeActive()
  ) {
    return "Idle (Soft Go-Live)";
  }
  if (resolveEnterprisePersistenceMode() !== "prisma") return "Unavailable";
  return "Unknown";
}

/** Local: live git porcelain. Vercel / packaged deploy: treat as Clean. */
function resolveGitWorkingTreeStatus(): BuildGitWorkingTreeStatus {
  if (process.env.VERCEL === "1") return "Clean";
  try {
    const out = execSync("git status --porcelain", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
    return out.length === 0 ? "Clean" : "Dirty";
  } catch {
    return "Unknown";
  }
}

export async function resolveBuildInformationPayload(): Promise<BuildInformationPayload> {
  const pub = resolveBuildInformationPublic();
  const projectRef = extractProjectRef(process.env.DATABASE_URL);
  const projectName = projectRef
    ? (BUILD_INFORMATION_PROJECT_NAMES[projectRef] ?? `Supabase project ${projectRef}`)
    : resolveEnterprisePersistenceMode() === "prisma"
      ? "Connected (project ref unavailable)"
      : "Not connected (memory mode)";

  let databaseConnected = false;
  let databaseSchemaVersion: string | null = null;
  let lastMigrationApplied: string | null = null;
  let lastMigrationFinishedAt: string | null = null;

  if (resolveEnterprisePersistenceMode() === "prisma" && process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
      const rows = await prisma.$queryRaw<
        Array<{ migration_name: string; finished_at: Date | null }>
      >(Prisma.sql`
        SELECT migration_name, finished_at
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC
        LIMIT 1
      `);
      const latest = rows[0];
      if (latest) {
        lastMigrationApplied = latest.migration_name;
        databaseSchemaVersion = latest.migration_name;
        lastMigrationFinishedAt = latest.finished_at
          ? latest.finished_at.toISOString()
          : null;
      }
    } catch {
      databaseConnected = false;
    }
  }

  return {
    ...pub,
    databaseSchemaVersion,
    lastMigrationApplied,
    lastMigrationFinishedAt,
    connectedProjectName: projectName,
    connectedProjectRef: projectRef,
    persistenceMode: resolvePersistenceLabel(),
    dealRegistryStatus: resolveDealRegistryStatus(),
    databaseConnected,
    gitWorkingTreeStatus: resolveGitWorkingTreeStatus(),
    whatsNew: getBuildWhatsNew(),
  };
}
