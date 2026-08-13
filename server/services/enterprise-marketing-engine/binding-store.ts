/**
 * CO-MARKETING-MKT-02 — In-process binding store (config metadata only).
 * Durable Prisma binding model is a future dependency — not in this sprint.
 * Never stores audience rows.
 */

import { MARKETING_SHEETS_AUTH_REF } from "@/constants/enterprise-marketing-engine";
import type { MarketingDataSourceBinding } from "@/types/enterprise-marketing-data-source";

const bindings = new Map<string, MarketingDataSourceBinding>();

function nowIso() {
  return new Date().toISOString();
}

function seedFromEnv() {
  const spreadsheetId = (process.env.MARKETING_SHEETS_DEFAULT_SPREADSHEET_ID ?? "").trim();
  const displayName =
    (process.env.MARKETING_SHEETS_DEFAULT_DISPLAY_NAME ?? "Marketing Master Database").trim();
  const orgId = (process.env.MARKETING_SHEETS_DEFAULT_ORG_ID ?? "default").trim() || "default";
  if (!spreadsheetId) return;
  const id = `mkt-src-env-${orgId}`;
  if (bindings.has(id)) return;
  const ts = nowIso();
  bindings.set(id, {
    id,
    organizationId: orgId,
    providerType: "GOOGLE_SHEETS",
    displayName,
    spreadsheetId,
    driveFileId: spreadsheetId,
    authRef: MARKETING_SHEETS_AUTH_REF,
    status: "ACTIVE",
    createdAt: ts,
    updatedAt: ts,
  });
}

seedFromEnv();

/** Ensure fixture binding exists when mode=fixture. */
export function ensureFixtureBinding(organizationId: string): MarketingDataSourceBinding {
  const id = `mkt-src-fixture-${organizationId}`;
  const existing = bindings.get(id);
  if (existing) return existing;
  const ts = nowIso();
  const binding: MarketingDataSourceBinding = {
    id,
    organizationId,
    providerType: "GOOGLE_SHEETS",
    displayName: "Controlled Fixture — Marketing Master (non-production)",
    spreadsheetId: "fixture-marketing-master",
    driveFileId: "fixture-marketing-master",
    authRef: "fixture:local",
    status: "ACTIVE",
    createdAt: ts,
    updatedAt: ts,
  };
  bindings.set(id, binding);
  return binding;
}

export const marketingDataSourceBindingStore = {
  list(organizationId: string): MarketingDataSourceBinding[] {
    seedFromEnv();
    return [...bindings.values()].filter((b) => b.organizationId === organizationId);
  },

  get(bindingId: string): MarketingDataSourceBinding | null {
    seedFromEnv();
    return bindings.get(bindingId) ?? null;
  },

  getForOrg(bindingId: string, organizationId: string): MarketingDataSourceBinding | null {
    const b = this.get(bindingId);
    if (!b || b.organizationId !== organizationId) return null;
    return b;
  },

  upsert(input: {
    id?: string;
    organizationId: string;
    displayName: string;
    spreadsheetId: string;
  }): MarketingDataSourceBinding {
    const ts = nowIso();
    const id = input.id?.trim() || `mkt-src-${input.organizationId}-${Date.now()}`;
    const prev = bindings.get(id);
    if (prev && prev.organizationId !== input.organizationId) {
      throw Object.assign(new Error("Binding belongs to another organization"), {
        statusCode: 403,
        code: "FORBIDDEN",
      });
    }
    const next: MarketingDataSourceBinding = {
      id,
      organizationId: input.organizationId,
      providerType: "GOOGLE_SHEETS",
      displayName: input.displayName.trim() || "Marketing Data Source",
      spreadsheetId: input.spreadsheetId.trim(),
      driveFileId: input.spreadsheetId.trim(),
      authRef: MARKETING_SHEETS_AUTH_REF,
      status: "ACTIVE",
      createdAt: prev?.createdAt ?? ts,
      updatedAt: ts,
      lastHealthAt: prev?.lastHealthAt,
      lastHealthOk: prev?.lastHealthOk,
      lastHealthMessage: prev?.lastHealthMessage,
      lastDiscoverAt: prev?.lastDiscoverAt,
      lastError: null,
    };
    bindings.set(id, next);
    return next;
  },

  patch(
    bindingId: string,
    organizationId: string,
    patch: Partial<
      Pick<
        MarketingDataSourceBinding,
        | "status"
        | "lastHealthAt"
        | "lastHealthOk"
        | "lastHealthMessage"
        | "lastDiscoverAt"
        | "lastError"
        | "displayName"
      >
    >,
  ): MarketingDataSourceBinding | null {
    const b = this.getForOrg(bindingId, organizationId);
    if (!b) return null;
    const next = { ...b, ...patch, updatedAt: nowIso() };
    bindings.set(bindingId, next);
    return next;
  },
};
