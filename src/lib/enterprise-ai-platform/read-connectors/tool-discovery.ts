/**
 * Tool Discovery — Behaviour Packs request categories; Policy Gate permits (CO-AI-104).
 */

import { EAI_READ_TOOL_DEFINITIONS } from "@/constants/enterprise-ai-platform/read-connectors";
import { ensureEaiBehaviourPackScaffolds, loadEaiBehaviourPack } from "../behaviour-packs";
import { evaluateEaiPolicy } from "../policy-gate";
import { listEaiTools } from "../tool-bus";
import type {
  EaiDiscoveredTool,
  EaiToolDiscoveryRequest,
} from "@/types/enterprise-ai-read-connectors";

/**
 * Discover read tools for requested categories after Policy Gate evaluation.
 */
export function discoverEaiReadTools(
  request: EaiToolDiscoveryRequest,
): EaiDiscoveredTool[] {
  ensureEaiBehaviourPackScaffolds();
  const pack = loadEaiBehaviourPack(request.personaPackId);
  const registered = new Set(listEaiTools().map((t) => t.toolId));

  const candidates = EAI_READ_TOOL_DEFINITIONS.filter((d) =>
    request.requestedCategories.includes(d.category),
  );

  const policy = evaluateEaiPolicy({
    sessionId: request.sessionId,
    conversationId: request.conversationId,
    personaPackId: request.personaPackId,
    requestedToolIds: candidates.map((c) => c.toolId),
    requestedDataScopes: [],
    requestedToolCategories: request.requestedCategories,
  });

  return candidates.map((c) => {
    const denyReasons: string[] = [];
    if (!registered.has(c.toolId)) {
      denyReasons.push("Tool not registered on Tool Bus");
    }
    if (pack && !pack.configuration.allowedToolCategories.includes(c.category)) {
      denyReasons.push(`Category ${c.category} not allowed for pack ${pack.packId}`);
    }
    if (!policy.allowedToolIds.includes(c.toolId)) {
      denyReasons.push(
        ...policy.blockedReasons.filter((r) => r.includes(c.toolId) || r.includes(c.category)),
      );
      if (denyReasons.length === 0) denyReasons.push("Denied by Policy Gate");
    }
    return {
      toolId: c.toolId,
      category: c.category,
      name: c.name,
      description: c.description,
      allowedByPolicy: denyReasons.length === 0,
      denyReasons,
    };
  });
}
