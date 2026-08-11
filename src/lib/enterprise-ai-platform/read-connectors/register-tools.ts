/**
 * Register Tool Bus READ tools backed by Enterprise Read Connectors (CO-AI-104).
 * SARATHI Bible SB-04 — READ ONLY. Domain Boundary gates outside-domain tool reads.
 */

import { EAI_READ_TOOL_DEFINITIONS } from "@/constants/enterprise-ai-platform/read-connectors";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import { registerEaiTool, resetEaiToolHandlers } from "../tool-bus";
import type { EaiEntityRefs } from "@/types/enterprise-ai-read-connectors";
import { projectionToSanitizedFacts } from "@/types/enterprise-ai-read-connectors";
import type { EaiPersonaPackId } from "@/types/enterprise-ai-platform";
import { evaluateEaiDomainBoundary } from "../domain-governance/domain-boundary";
import { recordEaiReadAudit } from "./audit";
import { getEaiReadConnector } from "./registry";

let toolsWired = false;

export function resetEaiReadToolsWiredFlag(): void {
  toolsWired = false;
}

/**
 * Register all AI-4 read tools. Safe to call multiple times (idempotent replace).
 * Conversation summary tool uses input.summary fields — no connector mutation.
 */
export function registerEaiEnterpriseReadTools(): void {
  if (toolsWired) {
    // Re-register to refresh handlers after composition reset
  }
  for (const def of EAI_READ_TOOL_DEFINITIONS) {
    registerEaiTool(
      {
        toolId: def.toolId,
        name: def.name,
        description: def.description,
        sideEffectClass: "read",
        targetEngine: def.connectorId,
        category: def.category,
      },
      async (req) => {
        const personaPackId =
          (req.input.personaPackId as EaiPersonaPackId) ?? "platform_none";
        const requestHint =
          typeof req.input.requestHint === "string" ? req.input.requestHint : undefined;

        if (requestHint?.trim()) {
          const boundary = evaluateEaiDomainBoundary({
            utterance: requestHint,
            personaPackId,
          });
          if (boundary.blocksKnowledge) {
            return {
              toolId: req.toolId,
              ok: false,
              payload: {
                readOnly: true,
                refusal: boundary.safeRefusalText ?? EAI_OUTSIDE_DOMAIN_REFUSAL,
              },
              errorCode: "domain_boundary_blocked",
              errorMessage: boundary.safeRefusalText ?? EAI_OUTSIDE_DOMAIN_REFUSAL,
            };
          }
        }

        if (def.toolId === "eai.read.conversation_summary") {
          const summary =
            typeof req.input.summary === "string"
              ? req.input.summary
              : typeof req.input.conversationSummary === "string"
                ? req.input.conversationSummary
                : "No conversation summary provided";
          return {
            toolId: req.toolId,
            ok: true,
            payload: {
              registry: "conversation_memory",
              entityId: req.conversationId,
              summary: String(summary).slice(0, 800),
              readOnly: true,
            },
          };
        }

        const connector = getEaiReadConnector(def.connectorId);
        if (!connector) {
          return {
            toolId: req.toolId,
            ok: false,
            payload: {},
            errorCode: "connector_missing",
            errorMessage: `Read connector missing: ${def.connectorId}`,
          };
        }

        const entityRefs = (req.input.entityRefs ?? {}) as EaiEntityRefs;
        const projection = await connector.read({
          sessionId: req.sessionId,
          conversationId: req.conversationId,
          personaPackId,
          requestHint,
          entityRefs,
        });

        recordEaiReadAudit({
          toolId: def.toolId,
          connectorId: connector.connectorId,
          personaPackId,
          sessionId: req.sessionId,
          conversationId: req.conversationId,
          domain: def.domain,
          projectionId: projection.projectionId,
          resolved: projection.resolved,
          summary: projection.summary,
          purpose: `tool_bus_read:${def.toolId}`,
        });

        return {
          toolId: req.toolId,
          ok: true,
          payload: {
            registry: def.connectorId,
            entityId: projection.refs[0]?.entityId ?? projection.projectionId,
            projectionId: projection.projectionId,
            summary: projection.summary,
            fields: projection.fields,
            facts: projectionToSanitizedFacts(projection),
            readOnly: true,
          },
        };
      },
    );
  }
  toolsWired = true;
}

/** Full reset helper for validation. */
export function resetAndRegisterEaiEnterpriseReadTools(): void {
  resetEaiToolHandlers();
  resetEaiReadToolsWiredFlag();
  registerEaiEnterpriseReadTools();
}
