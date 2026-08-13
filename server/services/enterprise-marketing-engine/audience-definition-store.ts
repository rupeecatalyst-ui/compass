/**
 * CO-MARKETING-MKT-03 — Audience definition store (config only).
 * Never stores source audience rows.
 */

import { emptyFilterDefinition } from "@/lib/enterprise-marketing-engine/audience-filters";
import type {
  MarketingAudienceDefinition,
  MarketingEligibilityRules,
  MarketingFilterDefinition,
  MarketingSuppressionPolicy,
} from "@/types/enterprise-marketing-audience";

const store = new Map<string, MarketingAudienceDefinition>();

function nowIso() {
  return new Date().toISOString();
}

const DEFAULT_ELIGIBILITY: MarketingEligibilityRules = {
  requireIdentity: true,
  requireValidEmailIfPresent: true,
  excludeDuplicatesInScan: true,
};

const DEFAULT_SUPPRESSION: MarketingSuppressionPolicy = {
  applyOrgSuppression: true,
  reasons: [],
};

export const marketingAudienceDefinitionStore = {
  list(organizationId: string): MarketingAudienceDefinition[] {
    return [...store.values()]
      .filter((a) => a.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  get(id: string): MarketingAudienceDefinition | null {
    return store.get(id) ?? null;
  },

  getForOrg(id: string, organizationId: string): MarketingAudienceDefinition | null {
    const a = store.get(id);
    if (!a || a.organizationId !== organizationId) return null;
    return a;
  },

  upsert(input: {
    id?: string;
    organizationId: string;
    name: string;
    description?: string | null;
    bindingId: string;
    datasetId: string;
    datasetDisplayName?: string | null;
    filterDefinition?: MarketingFilterDefinition;
    suppressionPolicy?: MarketingSuppressionPolicy;
    eligibilityRules?: MarketingEligibilityRules;
  }): MarketingAudienceDefinition {
    const ts = nowIso();
    const id = input.id?.trim() || `mkt-aud-${input.organizationId}-${Date.now()}`;
    const prev = store.get(id);
    if (prev && prev.organizationId !== input.organizationId) {
      throw Object.assign(new Error("Audience belongs to another organization"), {
        statusCode: 403,
        code: "FORBIDDEN",
      });
    }
    if (!input.name.trim()) {
      throw Object.assign(new Error("Audience name is required"), {
        statusCode: 400,
        code: "INVALID_INPUT",
      });
    }
    if (!input.bindingId.trim() || !input.datasetId.trim()) {
      throw Object.assign(new Error("bindingId and datasetId are required"), {
        statusCode: 400,
        code: "INVALID_INPUT",
      });
    }
    const next: MarketingAudienceDefinition = {
      id,
      organizationId: input.organizationId,
      name: input.name.trim(),
      description: input.description ?? null,
      bindingId: input.bindingId.trim(),
      datasetId: input.datasetId.trim(),
      datasetDisplayName: input.datasetDisplayName ?? null,
      filterDefinition: input.filterDefinition ?? prev?.filterDefinition ?? emptyFilterDefinition(),
      suppressionPolicy: input.suppressionPolicy ?? prev?.suppressionPolicy ?? DEFAULT_SUPPRESSION,
      eligibilityRules: input.eligibilityRules ?? prev?.eligibilityRules ?? DEFAULT_ELIGIBILITY,
      createdAt: prev?.createdAt ?? ts,
      updatedAt: ts,
    };
    store.set(id, next);
    return next;
  },

  remove(id: string, organizationId: string): boolean {
    const a = this.getForOrg(id, organizationId);
    if (!a) return false;
    store.delete(id);
    return true;
  },
};
