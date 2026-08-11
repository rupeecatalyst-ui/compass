/**
 * SSOT-backed Enterprise Read Connectors (CO-AI-104).
 * READ ONLY — no Prisma, no mutations, no raw entity returns.
 */

import { getEcmContact } from "@/lib/enterprise-contact-master/contact-registry";
import { getProductById, searchProductRegistry } from "@/lib/product-library/product-store";
import { resolveChanakyaGuideEntries } from "@/lib/chanakya-guide";
import {
  listChanakyaLoanJourneyStages,
  getChanakyaLoanJourneyProgress,
} from "@/lib/chanakya-guide/resolve-journey";
import { getDocumentRequestState } from "@/lib/document-requests/store";
import { deriveOpportunityDocumentReadiness } from "@/lib/document-requests/readiness";
import { getEpdePolicyByCode, listEpdePolicies } from "@/lib/enterprise-policy-decision-engine/policy-registry";
import { resolveLoanInitiationFinancialProfile } from "@/lib/context-aware-data-collection";
import type {
  EaiReadConnector,
  EaiReadConnectorRequest,
  EaiReadProjection,
} from "@/types/enterprise-ai-read-connectors";
import { createEmptyProjection, createProjection } from "./projections";
import {
  buildEaiReadCacheKey,
  getEaiReadCache,
  setEaiReadCache,
} from "./cache";
import { recordEaiReadAudit } from "./audit";

async function withCacheAndAudit(
  connector: EaiReadConnector,
  request: EaiReadConnectorRequest,
  load: () => Promise<EaiReadProjection>,
  purpose = `enterprise_read:${connector.connectorId}`,
): Promise<EaiReadProjection> {
  const entityKey =
    request.entityRefs?.customerId ||
    request.entityRefs?.opportunityId ||
    request.entityRefs?.productId ||
    request.entityRefs?.partnerId ||
    "-";
  const cacheKey = buildEaiReadCacheKey({
    connectorId: connector.connectorId,
    sessionId: request.sessionId,
    entityKey,
    hintHash: (request.requestHint ?? "").slice(0, 40),
  });
  const cached = getEaiReadCache(cacheKey);
  if (cached) {
    recordEaiReadAudit({
      connectorId: connector.connectorId,
      personaPackId: request.personaPackId,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      domain: connector.domain,
      projectionId: cached.projectionId,
      resolved: cached.resolved,
      summary: `[cache] ${cached.summary}`,
      purpose: `${purpose}:cache_hit`,
    });
    return cached;
  }

  const projection = await load();
  setEaiReadCache(cacheKey, projection);
  recordEaiReadAudit({
    connectorId: connector.connectorId,
    personaPackId: request.personaPackId,
    sessionId: request.sessionId,
    conversationId: request.conversationId,
    domain: connector.domain,
    projectionId: projection.projectionId,
    resolved: projection.resolved,
    summary: projection.summary,
    purpose,
  });
  return projection;
}

function customerConnector(): EaiReadConnector {
  return {
    connectorId: "customer_registry",
    domain: "customer",
    connectorVersion: "1.0.0-ai4",
    readOnly: true,
    async read(request) {
      return withCacheAndAudit(this, request, async () => {
        const id = request.entityRefs?.customerId;
        if (!id) {
          return createEmptyProjection(
            "customer_registry",
            "customer",
            "Customer id not provided — no customer projection loaded",
          );
        }
        try {
          const contact = getEcmContact(id);
          if (!contact) {
            return createEmptyProjection(
              "customer_registry",
              "customer",
              `Customer not found for ref ${id}`,
            );
          }
          return createProjection({
            connectorId: "customer_registry",
            domain: "customer",
            fields: {
              displayName: contact.name,
              city: contact.city ?? "",
              state: contact.state ?? "",
              status: contact.status,
              employmentType: contact.employmentType ?? "",
              ownerName: contact.ownerName ?? "",
              // Masked mobile only — never full identity docs
              mobileMasked: contact.mobilePrimary
                ? `******${contact.mobilePrimary.slice(-4)}`
                : "",
            },
            refs: [{ registry: "ecm_contact", entityId: contact.id, label: contact.name }],
            summary: `Customer ${contact.name} (${contact.city ?? "city not specified"})`,
          });
        } catch {
          return createEmptyProjection(
            "customer_registry",
            "customer",
            "Customer registry read failed safely",
          );
        }
      });
    },
  };
}

function loanConnector(): EaiReadConnector {
  return {
    connectorId: "loan_registry",
    domain: "loan",
    connectorVersion: "1.0.0-ai4",
    readOnly: true,
    async read(request) {
      return withCacheAndAudit(this, request, async () => {
        const opportunityId = request.entityRefs?.opportunityId;
        if (!opportunityId) {
          return createEmptyProjection(
            "loan_registry",
            "loan",
            "Opportunity id not provided — loan projection skipped",
          );
        }
        // Prefer opaque ref projection without inventing amounts (CAD-2026-001).
        // Full API fetch is optional; when unavailable we still return a safe stub projection.
        try {
          const { enterpriseOpportunityApiClient } = await import(
            "@/lib/enterprise-opportunity/opportunity-api-client"
          );
          const opp = await enterpriseOpportunityApiClient.getOpportunity(opportunityId);
          if (!opp) {
            return createProjection({
              connectorId: "loan_registry",
              domain: "loan",
              fields: { opportunityId },
              refs: [{ registry: "opportunity", entityId: opportunityId }],
              summary: `Opportunity ${opportunityId} (details unavailable)`,
              resolved: false,
            });
          }
          const record = opp as Record<string, unknown>;
          const productLabel =
            (typeof record.productName === "string" && record.productName) ||
            (typeof record.productLabel === "string" && record.productLabel) ||
            (typeof record.product === "string" && record.product) ||
            "Not Specified";
          const stage =
            (typeof record.stage === "string" && record.stage) ||
            (typeof record.lifecycleStatus === "string" && record.lifecycleStatus) ||
            "Not Specified";
          const amount =
            record.requiredAmount != null
              ? String(record.requiredAmount)
              : "Not Specified";
          return createProjection({
            connectorId: "loan_registry",
            domain: "loan",
            fields: {
              opportunityId,
              productLabel: String(productLabel),
              stage: String(stage),
              requiredAmount: String(amount),
            },
            refs: [
              {
                registry: "opportunity",
                entityId: opportunityId,
                label: String(productLabel),
              },
            ],
            summary: `Opportunity ${opportunityId} · ${productLabel} · ${stage}`,
          });
        } catch {
          return createProjection({
            connectorId: "loan_registry",
            domain: "loan",
            fields: { opportunityId },
            refs: [{ registry: "opportunity", entityId: opportunityId }],
            summary: `Opportunity ${opportunityId} (read deferred — connector safe fallback)`,
            resolved: false,
          });
        }
      });
    },
  };
}

function productConnector(): EaiReadConnector {
  return {
    connectorId: "product_registry",
    domain: "product",
    connectorVersion: "1.0.0-ai4",
    readOnly: true,
    async read(request) {
      return withCacheAndAudit(this, request, async () => {
        try {
          const productId = request.entityRefs?.productId;
          if (productId) {
            const def = getProductById(productId);
            if (def) {
              return createProjection({
                connectorId: "product_registry",
                domain: "product",
                fields: {
                  productCode: def.productCode,
                  productName: def.productName,
                  description: (def.shortDescription || def.description || "").slice(0, 400),
                  lifecycleStatus: def.lifecycleStatus,
                },
                refs: [
                  {
                    registry: "product",
                    entityId: def.productId,
                    label: def.productName,
                  },
                ],
                summary: `Product ${def.productName} (${def.productCode})`,
              });
            }
          }

          const hint = (request.requestHint ?? "").trim();
          const results = hint ? searchProductRegistry(hint).slice(0, 3) : [];
          if (results.length === 0) {
            return createEmptyProjection(
              "product_registry",
              "product",
              "No product matches for current hint",
            );
          }
          const top = results[0];
          return createProjection({
            connectorId: "product_registry",
            domain: "product",
            fields: {
              productCode: top.productCode,
              productName: top.productName,
              categoryName: top.categoryName,
              lifecycleStatus: top.lifecycleStatus,
              matchCount: String(results.length),
            },
            refs: results.map((r) => ({
              registry: "product",
              entityId: r.productId,
              label: r.productName,
            })),
            summary: `Top product match: ${top.productName}`,
          });
        } catch {
          return createEmptyProjection(
            "product_registry",
            "product",
            "Product registry read failed safely",
          );
        }
      });
    },
  };
}

function partnerConnector(): EaiReadConnector {
  return {
    connectorId: "partner_registry",
    domain: "partner",
    connectorVersion: "1.0.0-ai4",
    readOnly: true,
    async read(request) {
      return withCacheAndAudit(this, request, async () => {
        const partnerId = request.entityRefs?.partnerId;
        if (!partnerId) {
          return createEmptyProjection(
            "partner_registry",
            "partner",
            "Partner id not provided — partner projection skipped",
          );
        }
        try {
          const { wealthPartnerApiClient } = await import(
            "@/lib/enterprise-wealth-partner-registry"
          );
          const partner = await wealthPartnerApiClient.getPartner(partnerId);
          if (!partner) {
            return createEmptyProjection(
              "partner_registry",
              "partner",
              `Partner not found for ref ${partnerId}`,
            );
          }
          const name = partner.displayName || partner.identityLabel || "Not Specified";
          const status = partner.lifecycleStatus || partner.status || "Not Specified";
          return createProjection({
            connectorId: "partner_registry",
            domain: "partner",
            fields: {
              partnerName: String(name),
              status: String(status),
              city: partner.cityLabel ?? "",
            },
            refs: [{ registry: "wealth_partner", entityId: partnerId, label: String(name) }],
            summary: `Partner ${name} · ${status}`,
          });
        } catch {
          return createEmptyProjection(
            "partner_registry",
            "partner",
            "Partner registry read failed safely",
          );
        }
      });
    },
  };
}

function knowledgeConnector(): EaiReadConnector {
  return {
    connectorId: "knowledge_registry",
    domain: "knowledge",
    connectorVersion: "1.0.0-ai4",
    readOnly: true,
    async read(request) {
      return withCacheAndAudit(this, request, async () => {
        try {
          const entries = resolveChanakyaGuideEntries({
            platform: "catalyst_one",
            workspaceId: "strategic_workspace",
            section: "default",
          });
          const hint = (request.requestHint ?? "").toLowerCase();
          const matched = hint
            ? entries.filter(
                (e) =>
                  e.guidanceTitle.toLowerCase().includes(hint.slice(0, 40)) ||
                  e.mentorMessage.toLowerCase().includes(hint.slice(0, 40)) ||
                  /\bbalance transfer\b/i.test(hint),
              )
            : entries.slice(0, 3);
          const pick = (matched.length > 0 ? matched : entries).slice(0, 3);
          if (pick.length === 0) {
            return createEmptyProjection(
              "knowledge_registry",
              "knowledge",
              "No guide entries available",
            );
          }
          const fields: Record<string, string> = {};
          pick.forEach((e, i) => {
            fields[`guide_${i + 1}_title`] = e.guidanceTitle;
            fields[`guide_${i + 1}_mentor`] = e.mentorMessage.slice(0, 400);
          });
          return createProjection({
            connectorId: "knowledge_registry",
            domain: "knowledge",
            fields,
            refs: pick.map((e) => ({
              registry: "chanakya_guide",
              entityId: e.id,
              label: e.guidanceTitle,
            })),
            summary: `Knowledge: ${pick.map((e) => e.guidanceTitle).join(" · ")}`,
          });
        } catch {
          return createEmptyProjection(
            "knowledge_registry",
            "knowledge",
            "Knowledge registry read failed safely",
          );
        }
      });
    },
  };
}

function policyConnector(): EaiReadConnector {
  return {
    connectorId: "policy_registry",
    domain: "policy",
    connectorVersion: "1.0.0-ai4",
    readOnly: true,
    async read(request) {
      return withCacheAndAudit(this, request, async () => {
        try {
          const policies = listEpdePolicies().slice(0, 5);
          if (policies.length === 0) {
            return createEmptyProjection(
              "policy_registry",
              "policy",
              "No published EPDE policies in local registry",
            );
          }
          const fields: Record<string, string> = {};
          policies.forEach((p, i) => {
            fields[`policy_${i + 1}_code`] = p.policyCode;
            fields[`policy_${i + 1}_name`] = p.policyName;
          });
          const maybeCode = (request.requestHint ?? "").match(/\b[A-Z]{2,}[-_][A-Z0-9]+\b/);
          if (maybeCode) {
            const found = getEpdePolicyByCode(maybeCode[0]);
            if (found) {
              fields.matchedPolicyCode = found.policyCode;
              fields.matchedPolicyName = found.policyName;
            }
          }
          return createProjection({
            connectorId: "policy_registry",
            domain: "policy",
            fields,
            refs: policies.map((p) => ({
              registry: "epde_policy",
              entityId: p.id,
              label: p.policyName,
            })),
            summary: `Policy catalogue (${policies.length} entries projected)`,
          });
        } catch {
          return createEmptyProjection(
            "policy_registry",
            "policy",
            "Policy registry read failed safely",
          );
        }
      });
    },
  };
}

function workflowConnector(): EaiReadConnector {
  return {
    connectorId: "workflow_registry",
    domain: "workflow",
    connectorVersion: "1.0.0-ai4",
    readOnly: true,
    async read(request) {
      return withCacheAndAudit(this, request, async () => {
        try {
          const stages = listChanakyaLoanJourneyStages();
          const progress = getChanakyaLoanJourneyProgress(0);
          return createProjection({
            connectorId: "workflow_registry",
            domain: "workflow",
            fields: {
              stageCount: String(stages.length),
              currentStage: progress.current.name,
              nextObjective: progress.nextObjective,
              firstStage: stages[0]?.name ?? "Not Specified",
            },
            refs: stages.slice(0, 5).map((s) => ({
              registry: "journey_stage",
              entityId: s.id,
              label: s.name,
            })),
            summary: `Journey stages available: ${stages.length}`,
          });
        } catch {
          return createEmptyProjection(
            "workflow_registry",
            "workflow",
            "Workflow registry read failed safely",
          );
        }
      });
    },
  };
}

function documentConnector(): EaiReadConnector {
  return {
    connectorId: "document_registry",
    domain: "document",
    connectorVersion: "1.0.0-ai4",
    readOnly: true,
    async read(request) {
      return withCacheAndAudit(this, request, async () => {
        const opportunityId =
          request.entityRefs?.documentScopeId || request.entityRefs?.opportunityId;
        if (!opportunityId) {
          return createEmptyProjection(
            "document_registry",
            "document",
            "Document scope / opportunity id not provided",
          );
        }
        try {
          const state = getDocumentRequestState(opportunityId);
          const items = state?.lodItems ?? [];
          const readiness = deriveOpportunityDocumentReadiness(items);
          return createProjection({
            connectorId: "document_registry",
            domain: "document",
            fields: {
              state: String(readiness.state ?? "unknown"),
              completionPct: String(readiness.completionPct ?? 0),
              itemCount: String(items.length),
            },
            refs: [{ registry: "document_requests", entityId: opportunityId }],
            summary: `Document readiness ${readiness.completionPct ?? 0}% (${readiness.state})`,
          });
        } catch {
          return createEmptyProjection(
            "document_registry",
            "document",
            "Document registry read failed safely",
          );
        }
      });
    },
  };
}

function financialConnector(): EaiReadConnector {
  return {
    connectorId: "financial_registry",
    domain: "financial",
    connectorVersion: "1.0.0-ai4",
    readOnly: true,
    async read(request) {
      return withCacheAndAudit(this, request, async () => {
        try {
          const profile = resolveLoanInitiationFinancialProfile({
            customerType: "individual",
            employmentType: "salaried",
          });
          return createProjection({
            connectorId: "financial_registry",
            domain: "financial",
            fields: {
              profileKind: profile,
              note: "Financial calculations remain owned by enterprise engines",
              hint: (request.requestHint ?? "").slice(0, 120),
            },
            summary: "Financial profile visibility projected — engines own calculations",
            resolved: true,
          });
        } catch {
          return createProjection({
            connectorId: "financial_registry",
            domain: "financial",
            fields: {
              note: "Financial engines remain SSOT — projection unavailable",
            },
            summary: "Financial projection fallback (safe)",
            resolved: false,
          });
        }
      });
    },
  };
}

export function createDefaultEaiReadConnectors(): EaiReadConnector[] {
  return [
    customerConnector(),
    loanConnector(),
    partnerConnector(),
    productConnector(),
    workflowConnector(),
    documentConnector(),
    knowledgeConnector(),
    financialConnector(),
    policyConnector(),
  ];
}
