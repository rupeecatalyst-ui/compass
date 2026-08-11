/**
 * Wire Context Providers to Enterprise Read Connectors (CO-AI-104).
 * SARATHI Bible SB-04/SB-05 — projections only; Domain Boundary gates knowledge reads.
 */

import { EAI_DOMAIN_TO_CONNECTOR } from "@/constants/enterprise-ai-platform/read-connectors";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type {
  EaiContextDomain,
  EaiContextProvider,
  EaiContextProviderRequest,
  EaiContextProviderResult,
} from "@/types/enterprise-ai-context-intelligence";
import { projectionToSanitizedFacts } from "@/types/enterprise-ai-read-connectors";
import { evaluateEaiDomainBoundary } from "../domain-governance/domain-boundary";
import { recordEaiReadAudit } from "./audit";
import { getEaiReadConnector } from "./registry";
import { registerEaiContextProvider } from "../context-intelligence/providers";

function createConnectorBackedProvider(domain: EaiContextDomain): EaiContextProvider {
  const connectorId =
    domain === "conversation" ? null : EAI_DOMAIN_TO_CONNECTOR[domain];
  const providerId = `eai.ctx.connector.${domain}`;

  return {
    providerId,
    domain,
    providerVersion: "1.1.0-ai4",
    implemented: true,
    async provide(request: EaiContextProviderRequest): Promise<EaiContextProviderResult> {
      if (!connectorId) {
        return {
          domain,
          providerId,
          providerVersion: "1.1.0-ai4",
          facts: [],
          refs: [],
          summary: "Conversation domain uses conversation memory, not a registry connector",
          implemented: true,
        };
      }

      const utterance = (request.requestHint ?? "").trim();
      if (utterance) {
        const boundary = evaluateEaiDomainBoundary({
          utterance,
          personaPackId: request.personaPackId,
        });
        if (boundary.blocksKnowledge) {
          return {
            domain,
            providerId,
            providerVersion: "1.1.0-ai4",
            facts: [],
            refs: [],
            summary: boundary.safeRefusalText ?? EAI_OUTSIDE_DOMAIN_REFUSAL,
            implemented: true,
          };
        }
      }

      const connector = getEaiReadConnector(connectorId);
      if (!connector) {
        return {
          domain,
          providerId,
          providerVersion: "1.1.0-ai4",
          facts: [],
          refs: [],
          summary: `Connector missing for ${connectorId}`,
          implemented: false,
        };
      }

      const projection = await connector.read({
        sessionId: request.sessionId,
        conversationId: request.conversationId,
        personaPackId: request.personaPackId,
        requestHint: request.requestHint,
        entityRefs: request.entityRefs,
      });

      recordEaiReadAudit({
        connectorId: connector.connectorId,
        providerId,
        personaPackId: request.personaPackId,
        sessionId: request.sessionId,
        conversationId: request.conversationId,
        domain,
        projectionId: projection.projectionId,
        resolved: projection.resolved,
        summary: projection.summary,
        purpose: `context_provider:${domain}`,
      });

      return {
        domain,
        providerId,
        providerVersion: "1.1.0-ai4",
        facts: projectionToSanitizedFacts(projection),
        refs: projection.refs,
        summary: projection.summary,
        implemented: true,
      };
    },
  };
}

/** Replace CIE stubs with connector-backed providers for all non-conversation domains. */
export function wireEaiContextProvidersToReadConnectors(): void {
  const domains = Object.keys(EAI_DOMAIN_TO_CONNECTOR) as Array<
    keyof typeof EAI_DOMAIN_TO_CONNECTOR
  >;
  for (const domain of domains) {
    registerEaiContextProvider(createConnectorBackedProvider(domain));
  }
}
