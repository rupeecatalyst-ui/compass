/**
 * CO-ARCH-002 — Enterprise Deal Registry feature flags.
 * CO-P0-001 / CO-P0-002 — When ENTERPRISE_PERSISTENCE_MODE=prisma, operational Deal
 * Registry (API / Dual-Write / Port Runtime / workspace consumers) defaults ON unless
 * explicitly set false. Explicit false remains emergency rollback only.
 */
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";

export const DEAL_REGISTRY_API_ENABLED_ENV = "DEAL_REGISTRY_API_ENABLED" as const;
export const NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED_ENV =
  "NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED" as const;
export const DEAL_REGISTRY_DUAL_WRITE_ENV = "DEAL_REGISTRY_DUAL_WRITE" as const;
export const NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE_ENV =
  "NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE" as const;
export const DEAL_REGISTRY_SHADOW_READ_ENV = "DEAL_REGISTRY_SHADOW_READ" as const;
export const NEXT_PUBLIC_DEAL_REGISTRY_SHADOW_READ_ENV =
  "NEXT_PUBLIC_DEAL_REGISTRY_SHADOW_READ" as const;
export const DEAL_REGISTRY_PORT_RUNTIME_ENV = "DEAL_REGISTRY_PORT_RUNTIME" as const;
export const NEXT_PUBLIC_DEAL_REGISTRY_PORT_RUNTIME_ENV =
  "NEXT_PUBLIC_DEAL_REGISTRY_PORT_RUNTIME" as const;
export const DEAL_REGISTRY_IMPORT_ENABLED_ENV = "DEAL_REGISTRY_IMPORT_ENABLED" as const;
export const DEAL_REGISTRY_BLOCK_LOCAL_WRITE_ENV = "DEAL_REGISTRY_BLOCK_LOCAL_WRITE" as const;
/** CO-P0-006 — Create requires Enterprise Deal Registry write (fail closed when ON). */
export const DEAL_REGISTRY_PRIMARY_WRITE_ENV = "DEAL_REGISTRY_PRIMARY_WRITE" as const;
export const NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE_ENV =
  "NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE" as const;

/** Soft-delete Recovery Center module key. */
export const ENTERPRISE_DEAL_SOFT_DELETE_MODULE = "enterprise_deal" as const;

export const DEAL_REGISTRY_WAVE4_MODULES = ["my_deals"] as const;
export type DealRegistryWave4Module = (typeof DEAL_REGISTRY_WAVE4_MODULES)[number];

/** Wave 5 — workspace consumers (module-by-module). */
export const DEAL_CONSUMER_MODULES = [
  "opportunity_workspace",
  "loan_workspace",
  "customer_360",
  "documents",
  "tasks",
  "activities",
  "chanakya_radar",
] as const;
export type DealConsumerModule = (typeof DEAL_CONSUMER_MODULES)[number];

const CONSUMER_FLAG_ENV: Record<
  DealConsumerModule,
  { server: string; public: string }
> = {
  opportunity_workspace: {
    server: "DEAL_REGISTRY_CONSUMER_OPPORTUNITY",
    public: "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_OPPORTUNITY",
  },
  loan_workspace: {
    server: "DEAL_REGISTRY_CONSUMER_LOAN_WORKSPACE",
    public: "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_LOAN_WORKSPACE",
  },
  customer_360: {
    server: "DEAL_REGISTRY_CONSUMER_CUSTOMER_360",
    public: "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_CUSTOMER_360",
  },
  documents: {
    server: "DEAL_REGISTRY_CONSUMER_DOCUMENTS",
    public: "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_DOCUMENTS",
  },
  tasks: {
    server: "DEAL_REGISTRY_CONSUMER_TASKS",
    public: "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_TASKS",
  },
  activities: {
    server: "DEAL_REGISTRY_CONSUMER_ACTIVITIES",
    public: "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_ACTIVITIES",
  },
  chanakya_radar: {
    server: "DEAL_REGISTRY_CONSUMER_CHANAKYA_RADAR",
    public: "NEXT_PUBLIC_DEAL_REGISTRY_CONSUMER_CHANAKYA_RADAR",
  },
};

/** Explicit true/false from env; undefined when unset. */
function readExplicitFlag(...names: string[]): boolean | undefined {
  for (const name of names) {
    const raw = process.env[name];
    if (raw === "true" || raw === "1") return true;
    if (raw === "false" || raw === "0") return false;
  }
  return undefined;
}

function readFlag(...names: string[]): boolean {
  return readExplicitFlag(...names) ?? false;
}

/**
 * CO-P0-001 — Operational Deal Registry flags.
 * Unset + prisma persistence ⇒ ON (Enterprise Deal is live SSOT).
 * Explicit false ⇒ OFF (Wave 6 rollback).
 */
function readOperationalDealFlag(...names: string[]): boolean {
  const explicit = readExplicitFlag(...names);
  if (explicit !== undefined) return explicit;
  return isEnterprisePersistencePrisma();
}

export function isDealRegistryApiEnabled(): boolean {
  return readOperationalDealFlag(
    NEXT_PUBLIC_DEAL_REGISTRY_API_ENABLED_ENV,
    DEAL_REGISTRY_API_ENABLED_ENV,
  );
}

export function isDealRegistryDualWriteEnabled(): boolean {
  return readOperationalDealFlag(
    NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE_ENV,
    DEAL_REGISTRY_DUAL_WRITE_ENV,
  );
}

export function isDealRegistryShadowReadEnabled(): boolean {
  return readFlag(
    NEXT_PUBLIC_DEAL_REGISTRY_SHADOW_READ_ENV,
    DEAL_REGISTRY_SHADOW_READ_ENV,
  );
}

export function isDealRegistryPortRuntimeActive(): boolean {
  return readOperationalDealFlag(
    NEXT_PUBLIC_DEAL_REGISTRY_PORT_RUNTIME_ENV,
    DEAL_REGISTRY_PORT_RUNTIME_ENV,
  );
}

export function isDealRegistryImportEnabled(): boolean {
  return readFlag(DEAL_REGISTRY_IMPORT_ENABLED_ENV);
}

export function isDealRegistryLocalWriteBlocked(): boolean {
  return readFlag(DEAL_REGISTRY_BLOCK_LOCAL_WRITE_ENV);
}

/**
 * CO-P0-006 Wave 1 — New Deal create must succeed in Postgres before UI success.
 * Unset + prisma ⇒ ON. Explicit false = emergency rollback to localStorage-primary create.
 */
export function isDealRegistryPrimaryWriteEnabled(): boolean {
  return readOperationalDealFlag(
    NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE_ENV,
    DEAL_REGISTRY_PRIMARY_WRITE_ENV,
  );
}

/**
 * Wave 5 / CO-P0-002 — per-module consumer enablement (Enterprise Deal preferred read).
 * Unset + prisma ⇒ ON (Opportunity / Loan Workspace / etc. use Enterprise SSOT).
 * Explicit false ⇒ Soft Go-Live rollback for that module only.
 */
export function isDealConsumerModuleEnabled(module: DealConsumerModule): boolean {
  const env = CONSUMER_FLAG_ENV[module];
  return readOperationalDealFlag(env.public, env.server);
}

export function getDealConsumerFlagEnv(module: DealConsumerModule) {
  return CONSUMER_FLAG_ENV[module];
}

/** Integrity helper — true when My Deals / Deal API should use Postgres. */
export function isEnterpriseDealRegistryOperational(): boolean {
  return (
    isEnterprisePersistencePrisma() &&
    isDealRegistryApiEnabled() &&
    isDealRegistryPortRuntimeActive()
  );
}
