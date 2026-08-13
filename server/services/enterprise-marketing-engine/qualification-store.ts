/**
 * CO-MARKETING-MKT-11 — Qualification records (business responses — not Opportunities).
 */

import type { MarketingQualificationRecord } from "@/types/enterprise-marketing-qualification";

const records = new Map<string, MarketingQualificationRecord>();
let seq = 0;

function nowIso() {
  return new Date().toISOString();
}

export const marketingQualificationStore = {
  list(organizationId: string): MarketingQualificationRecord[] {
    return [...records.values()]
      .filter((r) => r.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  get(id: string): MarketingQualificationRecord | null {
    return records.get(id) ?? null;
  },

  getForOrg(id: string, organizationId: string): MarketingQualificationRecord | null {
    const row = records.get(id);
    if (!row || row.organizationId !== organizationId) return null;
    return row;
  },

  upsert(record: MarketingQualificationRecord): MarketingQualificationRecord {
    records.set(record.id, record);
    return record;
  },

  create(
    input: Omit<MarketingQualificationRecord, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ): MarketingQualificationRecord {
    const ts = nowIso();
    const id = input.id?.trim() || `mkt-qual-${++seq}`;
    const row: MarketingQualificationRecord = {
      ...input,
      id,
      createdAt: ts,
      updatedAt: ts,
    };
    records.set(id, row);
    return row;
  },

  patch(
    id: string,
    patch: Partial<MarketingQualificationRecord>,
  ): MarketingQualificationRecord | null {
    const existing = records.get(id);
    if (!existing) return null;
    const next = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    records.set(id, next);
    return next;
  },

  resetOrganization(organizationId: string) {
    for (const [id, r] of [...records.entries()]) {
      if (r.organizationId === organizationId) records.delete(id);
    }
  },
};
