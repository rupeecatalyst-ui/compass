/**
 * Enterprise Read Connectors (CO-AI-104 / Sprint AI-4).
 * READ ONLY. Never write. Never expose raw enterprise entities to the LLM.
 */

import type { EaiPersonaPackId, EaiSanitizedFact } from "./enterprise-ai-platform";
import type { EaiContextDomain } from "./enterprise-ai-context-intelligence";
import type { EaiToolCategoryId } from "./enterprise-ai-capability-layer";

export type EaiReadConnectorId =
  | "customer_registry"
  | "loan_registry"
  | "partner_registry"
  | "product_registry"
  | "workflow_registry"
  | "document_registry"
  | "knowledge_registry"
  | "financial_registry"
  | "policy_registry";

/** Opaque entity references for read resolution — never raw row dumps. */
export interface EaiEntityRefs {
  customerId?: string;
  opportunityId?: string;
  productId?: string;
  partnerId?: string;
  documentScopeId?: string;
}

export interface EaiReadConnectorRequest {
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  requestHint?: string;
  entityRefs?: EaiEntityRefs;
}

/** Business-safe projection — flat fields only. */
export interface EaiReadProjection {
  projectionId: string;
  connectorId: EaiReadConnectorId;
  domain: EaiContextDomain;
  /** Display / business fields only — no PAN/Aadhaar/secrets. */
  fields: Record<string, string>;
  refs: Array<{ registry: string; entityId: string; label?: string }>;
  summary: string;
  /** True when SSOT data was resolved; false when empty/unavailable. */
  resolved: boolean;
}

export interface EaiReadConnector {
  readonly connectorId: EaiReadConnectorId;
  readonly domain: EaiContextDomain;
  readonly connectorVersion: string;
  /** Always true for AI-4 connectors — they call SSOT projections, not DB. */
  readonly readOnly: true;
  read(request: EaiReadConnectorRequest): Promise<EaiReadProjection>;
}

export interface EaiReadAuditEvent {
  eventId: string;
  recordedAt: string;
  toolId?: string;
  connectorId: EaiReadConnectorId;
  providerId?: string;
  personaPackId: EaiPersonaPackId;
  sessionId: string;
  conversationId: string;
  domain: EaiContextDomain;
  projectionId: string;
  resolved: boolean;
  summary: string;
  /** Why the read occurred — internal only (SB-04 audit). */
  purpose: string;
}

export interface EaiReadCachePolicy {
  enabled: boolean;
  /** Soft TTL seconds — framework only until production cache sprint. */
  ttlSeconds: number;
  maxEntries: number;
}

export interface EaiToolDiscoveryRequest {
  personaPackId: EaiPersonaPackId;
  requestedCategories: EaiToolCategoryId[];
  sessionId: string;
  conversationId: string;
}

export interface EaiDiscoveredTool {
  toolId: string;
  category: EaiToolCategoryId;
  name: string;
  description: string;
  allowedByPolicy: boolean;
  denyReasons: string[];
}

export interface EaiReadConnectorsReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}

export function projectionToSanitizedFacts(
  projection: EaiReadProjection,
): EaiSanitizedFact[] {
  return Object.entries(projection.fields).map(([key, value]) => ({
    key,
    value: String(value).slice(0, 500),
    provenance: "registry_projection" as const,
  }));
}
