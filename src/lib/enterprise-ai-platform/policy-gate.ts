/**
 * Policy Gate — enterprise governance for every AI request (CO-AI-101 … CO-AI-104A).
 * Deny-by-default for tools, data scopes, and Behaviour Pack capabilities.
 * Capability Manifest + Permission Matrix are the only permission sources.
 * AI-4A: Domain Boundary Engine is mandatory before LLM reasoning when utterance present.
 */

import { EAI_DATA_SCOPES, EAI_POLICY_VERSION } from "@/constants/enterprise-ai-platform";
import { loadEaiBehaviourPack } from "./behaviour-packs";
import { getEaiPorts } from "./composition";
import { evaluateEaiDomainBoundary } from "./domain-governance/domain-boundary";
import { evaluateEaiCapabilityPermission } from "./permission-matrix";
import { isEaiToolCategoryAllowedForPack } from "./tool-categories";
import type {
  EaiCapabilityId,
  EaiToolCategoryId,
} from "@/types/enterprise-ai-capability-layer";
import type {
  EaiPolicyDecision,
  EaiPolicyRequest,
  EaiToolDefinition,
} from "@/types/enterprise-ai-platform";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function isKnownDataScope(scope: string): boolean {
  return (EAI_DATA_SCOPES as readonly string[]).includes(scope);
}

/**
 * Evaluate tools, data scopes, capabilities, and domain boundary for this request.
 * Action Proposal is required whenever propose/mutate intent or capability requires it.
 * Domain Boundary runs before LLM reasoning — the LLM does not decide domain alone.
 */
export function evaluateEaiPolicy(request: EaiPolicyRequest): EaiPolicyDecision {
  const ports = getEaiPorts();
  const allowedToolIds: string[] = [];
  const deniedToolIds: string[] = [];
  const blockedReasons: string[] = [];
  const allowedCapabilityIds: EaiCapabilityId[] = [];
  const deniedCapabilityIds: EaiCapabilityId[] = [];
  const deniedToolCategories: EaiToolCategoryId[] = [];

  let requireActionProposal = false;
  let capabilityBlocked = false;

  const pack = loadEaiBehaviourPack(request.personaPackId);
  if (!pack) {
    blockedReasons.push(`Behaviour Pack not loaded: ${request.personaPackId}`);
    capabilityBlocked = true;
  }

  // —— AI-4A Domain Boundary (platform-enforced, pre-LLM) ——
  const utterance = (request.utterance ?? request.intentHint ?? "").trim();
  const domainBoundary = evaluateEaiDomainBoundary({
    utterance,
    personaPackId: request.personaPackId,
    enforce: request.enforceDomainBoundary,
  });
  let domainBlocked = false;
  if (domainBoundary.policyDeny) {
    domainBlocked = true;
    capabilityBlocked = true;
    blockedReasons.push(
      ...domainBoundary.reasons.map((r) => `Domain boundary: ${r}`),
    );
  }

  for (const capabilityId of request.requestedCapabilityIds ?? []) {
    const evaluation = evaluateEaiCapabilityPermission(capabilityId, pack);
    if (evaluation.allowed) {
      allowedCapabilityIds.push(capabilityId);
      if (evaluation.requireActionProposal) requireActionProposal = true;
    } else {
      deniedCapabilityIds.push(capabilityId);
      capabilityBlocked = true;
      blockedReasons.push(
        ...evaluation.reasons.map((r) => `Capability ${capabilityId}: ${r}`),
      );
    }
  }

  for (const categoryId of request.requestedToolCategories ?? []) {
    if (!pack || !isEaiToolCategoryAllowedForPack(pack, categoryId)) {
      deniedToolCategories.push(categoryId);
      capabilityBlocked = true;
      blockedReasons.push(
        `Tool category not allowed for pack ${request.personaPackId}: ${categoryId}`,
      );
    }
  }

  for (const toolId of request.requestedToolIds) {
    const tool: EaiToolDefinition | undefined = ports.tools.findById(toolId);
    if (!tool) {
      deniedToolIds.push(toolId);
      blockedReasons.push(`Unknown tool: ${toolId}`);
      continue;
    }
    if (domainBlocked) {
      deniedToolIds.push(toolId);
      blockedReasons.push(
        `Tool ${toolId} denied — domain boundary blocked LLM / tool path`,
      );
      continue;
    }
    if (tool.sideEffectClass === "mutate") {
      deniedToolIds.push(toolId);
      blockedReasons.push(
        `Direct mutate tool denied (${toolId}). Use Action Proposal framework.`,
      );
      requireActionProposal = true;
      continue;
    }
    if (tool.sideEffectClass === "propose") {
      deniedToolIds.push(toolId);
      blockedReasons.push(
        `Propose-class tools do not execute via Tool Bus (${toolId}). Create an Action Proposal.`,
      );
      requireActionProposal = true;
      continue;
    }
    if (tool.category && pack && !isEaiToolCategoryAllowedForPack(pack, tool.category)) {
      deniedToolIds.push(toolId);
      deniedToolCategories.push(tool.category);
      blockedReasons.push(
        `Tool ${toolId} category ${tool.category} not allowed for pack ${pack.packId}`,
      );
      continue;
    }
    allowedToolIds.push(toolId);
  }

  const allowedDataScopes = request.requestedDataScopes.filter((scope) => {
    if (!isKnownDataScope(scope)) {
      blockedReasons.push(`Unknown data scope denied: ${scope}`);
      return false;
    }
    return true;
  });

  const intent = (request.intentHint ?? "").toLowerCase();
  if (
    intent.includes("lead") ||
    intent.includes("opportunity") ||
    intent.includes("callback") ||
    intent.includes("document") ||
    intent.includes("assign")
  ) {
    requireActionProposal = true;
  }

  const hasUnknown = request.requestedToolIds.some((id) => !ports.tools.findById(id));

  return {
    decisionId: newId("eai_pol"),
    allowed: !hasUnknown && !capabilityBlocked,
    allowedToolIds: domainBlocked ? [] : allowedToolIds,
    deniedToolIds,
    allowedDataScopes: domainBlocked ? [] : allowedDataScopes,
    requireActionProposal,
    blockedReasons,
    decidedAt: nowIso(),
    policyVersion: EAI_POLICY_VERSION,
    allowedCapabilityIds: domainBlocked ? [] : allowedCapabilityIds,
    deniedCapabilityIds,
    deniedToolCategories: [...new Set(deniedToolCategories)],
    domainBoundary,
    safeRefusalText: domainBoundary.safeRefusalText,
  };
}

/** Assert a tool id is permitted before Tool Bus invocation. */
export function assertEaiToolAllowed(
  decision: EaiPolicyDecision,
  toolId: string,
): { ok: true } | { ok: false; reason: string } {
  if (decision.domainBoundary?.blocksLlm) {
    return {
      ok: false,
      reason:
        decision.domainBoundary.reasons[0] ??
        "Domain boundary blocked tool invocation",
    };
  }
  if (!decision.allowedToolIds.includes(toolId)) {
    return {
      ok: false,
      reason:
        decision.blockedReasons.find((r) => r.includes(toolId)) ??
        `Tool not allowed: ${toolId}`,
    };
  }
  return { ok: true };
}

/** Assert a capability was allowed by Policy Gate. */
export function assertEaiCapabilityAllowed(
  decision: EaiPolicyDecision,
  capabilityId: EaiCapabilityId,
): { ok: true } | { ok: false; reason: string } {
  if (!decision.allowedCapabilityIds.includes(capabilityId)) {
    return {
      ok: false,
      reason:
        decision.blockedReasons.find((r) => r.includes(capabilityId)) ??
        `Capability not allowed: ${capabilityId}`,
    };
  }
  return { ok: true };
}

/** Assert Domain Boundary permits LLM reasoning. */
export function assertEaiLlmReasoningAllowed(
  decision: EaiPolicyDecision,
): { ok: true } | { ok: false; reason: string; refusalText?: string } {
  if (decision.domainBoundary?.blocksLlm) {
    return {
      ok: false,
      reason:
        decision.domainBoundary.reasons[0] ?? "Domain boundary blocked LLM reasoning",
      refusalText: decision.safeRefusalText,
    };
  }
  return { ok: true };
}
