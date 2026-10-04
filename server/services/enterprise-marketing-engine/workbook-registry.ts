/**
 * CO-MARKETING-GOOGLE-ACTIVATION-001 — Organisation-authorised workbook registry.
 * Administrators register specific spreadsheet IDs. Operators select only active
 * authorised workbooks for their organisation. Credentials never leave the server.
 */

import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { MARKETING_SHEETS_AUTH_REF } from "@/constants/enterprise-marketing-engine";
import {
  MARKETING_FIXTURE_WORKBOOK_ID,
  type MarketingWorkbookConnectionState,
} from "@/constants/enterprise-marketing-engine/authorised-workbook";
import {
  assertWorkbookIdMayBeRegistered,
  isMarketingFixtureRuntimeAllowed,
  resolveMarketingSheetsSourceStatus,
  resolveMarketingWorkbookConnectionState,
} from "@/lib/enterprise-marketing-engine/authorised-workbook";
import {
  createMemoryMarketingDurabilityPorts,
  getConfiguredMarketingDurabilityPorts,
} from "@/lib/enterprise-marketing-engine/durability";
import type { MarketingDurableSheetBindingRecord } from "@/types/enterprise-marketing-durability";
import type { MarketingDataSourceBinding } from "@/types/enterprise-marketing-data-source";
import {
  ensureFixtureBinding,
  hydrateRuntimeBinding,
  marketingDataSourceBindingStore,
} from "./binding-store";
import { ensureProductionMarketingDurabilityPorts } from "./durability-runtime";

function nowIso() {
  return new Date().toISOString();
}

function toRuntimeBinding(row: MarketingDurableSheetBindingRecord): MarketingDataSourceBinding {
  const createdAt = typeof row.createdAt === "string" ? row.createdAt : new Date(row.createdAt).toISOString();
  const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : new Date(row.updatedAt).toISOString();
  const status = row.status === "DISABLED" || row.status === "ERROR" ? row.status : "ACTIVE";
  return {
    id: row.id,
    organizationId: row.organizationId,
    providerType: "GOOGLE_SHEETS",
    displayName: row.displayName,
    spreadsheetId: row.spreadsheetId,
    driveFileId: row.driveFileId,
    authRef: row.authRef,
    status,
    createdAt,
    updatedAt,
  };
}

function toDurableBinding(binding: MarketingDataSourceBinding, actorUserId?: string | null): MarketingDurableSheetBindingRecord {
  return {
    id: binding.id,
    organizationId: binding.organizationId,
    displayName: binding.displayName,
    spreadsheetId: binding.spreadsheetId,
    driveFileId: binding.driveFileId ?? binding.spreadsheetId,
    authorised: true,
    authRef: binding.authRef,
    status: binding.status,
    createdByUserId: actorUserId ?? null,
    updatedByUserId: actorUserId ?? null,
    createdAt: binding.createdAt,
    updatedAt: binding.updatedAt,
  };
}

function resolvePorts() {
  const existing = getConfiguredMarketingDurabilityPorts();
  if (existing) return existing;
  if (!isEnterprisePersistencePrisma()) return null;
  try {
    return ensureProductionMarketingDurabilityPorts();
  } catch {
    return null;
  }
}

/**
 * Audience freeze ports. Fixture BAT uses a dedicated memory adapter so Prisma
 * workbook registry ports are not overwritten.
 */
let audienceFreezePorts: ReturnType<typeof createMemoryMarketingDurabilityPorts> | null = null;

export function ensureAudienceDurabilityPorts() {
  const existing = getConfiguredMarketingDurabilityPorts();
  if (existing?.kind === "memory-test-fixture") return existing;
  if (isMarketingFixtureRuntimeAllowed()) {
    if (!audienceFreezePorts) {
      audienceFreezePorts = createMemoryMarketingDurabilityPorts();
    }
    return audienceFreezePorts;
  }
  if (existing) return existing;
  if (isEnterprisePersistencePrisma()) {
    try {
      return ensureProductionMarketingDurabilityPorts();
    } catch {
      return null;
    }
  }
  return null;
}

export async function persistAuthorisedWorkbook(
  binding: MarketingDataSourceBinding,
  actorUserId?: string | null,
): Promise<MarketingDataSourceBinding> {
  hydrateRuntimeBinding(binding);
  const ports = resolvePorts();
  if (!ports) return binding;
  const saved = await ports.bindings.upsert(toDurableBinding(binding, actorUserId));
  const runtime = toRuntimeBinding(saved);
  hydrateRuntimeBinding(runtime);
  return runtime;
}

export async function listDurableAuthorisedWorkbooks(
  organizationId: string,
): Promise<MarketingDataSourceBinding[] | null> {
  const ports = resolvePorts();
  if (!ports) return null;
  const rows = await ports.bindings.list(organizationId);
  const runtime = rows.filter((row) => row.authorised).map(toRuntimeBinding);
  for (const binding of runtime) hydrateRuntimeBinding(binding);
  return runtime;
}

export async function getDurableWorkbookForOrg(
  bindingId: string,
  organizationId: string,
): Promise<MarketingDataSourceBinding | null> {
  const ports = resolvePorts();
  if (ports) {
    const row = await ports.bindings.getForOrg(bindingId, organizationId);
    if (row?.authorised) {
      const runtime = toRuntimeBinding(row);
      hydrateRuntimeBinding(runtime);
      return runtime;
    }
  }
  return marketingDataSourceBindingStore.getForOrg(bindingId, organizationId);
}

export async function ensureConfiguredOrgWorkbook(
  organizationId: string,
  actorUserId?: string | null,
): Promise<MarketingDataSourceBinding | null> {
  const source = resolveMarketingSheetsSourceStatus();
  if (source.status === "FIXTURE") {
    const fixture = ensureFixtureBinding(organizationId);
    return persistAuthorisedWorkbook(fixture, actorUserId);
  }
  if (source.status === "LIVE" && source.authorisedWorkbookId) {
    const existing = (await listDurableAuthorisedWorkbooks(organizationId)) ?? [];
    const match = existing.find((row) => row.spreadsheetId === source.authorisedWorkbookId);
    if (match) return match;
    const ts = nowIso();
    const seeded: MarketingDataSourceBinding = {
      id: `mkt-src-env-${organizationId}`,
      organizationId,
      providerType: "GOOGLE_SHEETS",
      displayName: source.authorisedWorkbookDisplayName || "Authorised Marketing Master",
      spreadsheetId: source.authorisedWorkbookId,
      driveFileId: source.authorisedWorkbookId,
      authRef: MARKETING_SHEETS_AUTH_REF,
      status: "ACTIVE",
      createdAt: ts,
      updatedAt: ts,
    };
    return persistAuthorisedWorkbook(seeded, actorUserId);
  }
  return null;
}

export async function registerAuthorisedWorkbook(input: {
  organizationId: string;
  actorUserId?: string | null;
  id?: string;
  displayName: string;
  spreadsheetId?: string;
}): Promise<MarketingDataSourceBinding> {
  const source = resolveMarketingSheetsSourceStatus();
  const spreadsheetId = assertWorkbookIdMayBeRegistered(
    input.spreadsheetId?.trim() || source.authorisedWorkbookId || MARKETING_FIXTURE_WORKBOOK_ID,
  );
  const durable = await listDurableAuthorisedWorkbooks(input.organizationId);
  const previous =
    (input.id
      ? durable?.find((row) => row.id === input.id) ??
        marketingDataSourceBindingStore.getForOrg(input.id, input.organizationId)
      : durable?.find((row) => row.spreadsheetId === spreadsheetId) ??
        marketingDataSourceBindingStore
          .list(input.organizationId)
          .find((row) => row.spreadsheetId === spreadsheetId)) ?? null;
  const ts = nowIso();
  const binding: MarketingDataSourceBinding = {
    id: previous?.id || input.id?.trim() || `mkt-src-${input.organizationId}-${Date.now()}`,
    organizationId: input.organizationId,
    providerType: "GOOGLE_SHEETS",
    displayName: input.displayName.trim() || "Authorised Marketing Workbook",
    spreadsheetId,
    driveFileId: spreadsheetId,
    authRef: source.status === "FIXTURE" ? "fixture:local" : MARKETING_SHEETS_AUTH_REF,
    status: "ACTIVE",
    createdAt: previous?.createdAt ?? ts,
    updatedAt: ts,
    lastHealthAt: previous?.lastHealthAt,
    lastHealthOk: previous?.lastHealthOk,
    lastHealthMessage: previous?.lastHealthMessage,
    lastDiscoverAt: previous?.lastDiscoverAt,
    lastError: null,
  };
  return persistAuthorisedWorkbook(binding, input.actorUserId);
}

export async function revokeAuthorisedWorkbook(input: {
  organizationId: string;
  bindingId: string;
  actorUserId?: string | null;
}): Promise<MarketingDataSourceBinding> {
  const current = await getDurableWorkbookForOrg(input.bindingId, input.organizationId);
  if (!current) {
    throw Object.assign(new Error("Authorised workbook not found for organization"), {
      statusCode: 404,
      code: "BINDING_NOT_FOUND",
    });
  }
  const revoked: MarketingDataSourceBinding = {
    ...current,
    status: "DISABLED",
    lastError: "Access revoked by administrator",
    updatedAt: nowIso(),
  };
  const ports = resolvePorts();
  if (ports) {
    await ports.bindings.upsert({
      ...toDurableBinding(revoked, input.actorUserId),
      authorised: false,
      status: "DISABLED",
    });
  }
  marketingDataSourceBindingStore.patch(input.bindingId, input.organizationId, {
    status: "DISABLED",
    lastError: revoked.lastError,
  });
  hydrateRuntimeBinding(revoked);
  return revoked;
}

export function connectionStateForBinding(
  binding: MarketingDataSourceBinding | null,
): MarketingWorkbookConnectionState {
  const source = resolveMarketingSheetsSourceStatus();
  return resolveMarketingWorkbookConnectionState({
    sourceStatus: source.status,
    bindingStatus: binding?.status,
    healthOk: binding?.lastHealthOk,
    healthMessage: binding?.lastHealthMessage,
  });
}
