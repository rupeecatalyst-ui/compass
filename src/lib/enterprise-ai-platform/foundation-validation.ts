/**
 * Foundation validation — Sprint AI-1 structural + behavioural smoke (CO-AI-101).
 * Exercises modules without SARATHI UI, voice, or CRM mutation.
 */

import {
  EAI_FRAMEWORK_VERSION,
  EAI_STUB_LLM_PROVIDER_ID,
} from "@/constants/enterprise-ai-platform";
import { createEaiActionProposal, updateEaiActionProposalStatus } from "./action-proposals";
import { recordEaiInteraction } from "./ai-registry";
import { resetEaiComposition } from "./composition";
import { compileEaiContext, listEaiContextSourceDescriptors } from "./context-compiler";
import { completeEaiLlm, getActiveEaiLlmProviderId } from "./llm-provider";
import { evaluateEaiPolicy } from "./policy-gate";
import { getEaiFrameworkVersion, getEaiRegistrySnapshot } from "./registry-snapshot";
import { composeEaiResponse } from "./response-composer";
import {
  appendEaiTurn,
  createEaiSession,
  listEaiTurns,
  updateEaiSessionStatus,
} from "./session-orchestrator";
import {
  invokeEaiTool,
  listEaiTools,
  registerEaiTool,
  resetEaiToolHandlers,
} from "./tool-bus";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "./behaviour-packs";

export async function runEaiFoundationValidation(): Promise<{
  passed: boolean;
  details: Record<string, unknown>;
}> {
  resetEaiComposition();
  resetEaiToolHandlers();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();

  const session = createEaiSession({
    personaPackId: "platform_none",
    channel: "api",
    continuityKey: "validation-continuity",
    deviceHint: { deviceId: "dev-validation", clientLabel: "foundation" },
  });

  const userTurn = appendEaiTurn({
    sessionId: session.sessionId,
    role: "user",
    text: "Foundation validation turn",
  });

  const context = compileEaiContext({
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    personaPackId: session.personaPackId,
    sanitizedFacts: [
      {
        key: "validation.mode",
        value: "framework_only",
        provenance: "system",
      },
    ],
    registryRefs: [{ registry: "customer_registry", entityId: "cust_validation" }],
  });

  registerEaiTool({
    toolId: "customer_registry.read",
    name: "Customer Registry Read",
    description: "Stub read tool for foundation validation",
    sideEffectClass: "read",
    targetEngine: "ecm",
  });

  registerEaiTool({
    toolId: "crm.mutate.forbidden",
    name: "Forbidden Mutate Stub",
    description: "Must be denied by Policy Gate",
    sideEffectClass: "mutate",
  });

  const policy = evaluateEaiPolicy({
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    personaPackId: session.personaPackId,
    requestedToolIds: ["customer_registry.read", "crm.mutate.forbidden"],
    requestedDataScopes: ["identity.public", "not.a.real.scope"],
    intentHint: "create lead",
  });

  const readResult = await invokeEaiTool(
    {
      toolId: "customer_registry.read",
      sessionId: session.sessionId,
      conversationId: session.conversationId,
      input: { entityId: "cust_validation" },
    },
    policy,
  );

  const mutateDenied = await invokeEaiTool(
    {
      toolId: "crm.mutate.forbidden",
      sessionId: session.sessionId,
      conversationId: session.conversationId,
      input: {},
    },
    policy,
  );

  const proposal = createEaiActionProposal({
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    kind: "create_lead",
    title: "Validation lead proposal",
    summary: "Framework-only proposal; must not execute CRM",
    payload: { source: "eai_foundation_validation" },
  });

  const executionBlocked = updateEaiActionProposalStatus(
    proposal.proposalId,
    "executed_reserved",
  );

  const llm = await completeEaiLlm({
    requestId: `req_${session.sessionId}`,
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    compiledContextId: context.contextId,
    messages: [
      { role: "system", content: "Enterprise AI Platform foundation stub." },
      { role: "user", content: "Foundation validation turn" },
    ],
  });

  const composed = composeEaiResponse({
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    personaPackId: session.personaPackId,
    llmOutput: llm.content,
    enterpriseResults: [readResult],
    policyDecision: policy,
    actionProposals: [proposal],
    confidence: "moderate",
  });

  const interaction = recordEaiInteraction({
    conversationId: session.conversationId,
    sessionId: session.sessionId,
    personaPackId: session.personaPackId,
    intentHint: "create lead",
    contextSnapshotRef: context.contextId,
    recommendation: composed.text.slice(0, 200),
    confidence: "moderate",
    actionProposalIds: [proposal.proposalId],
    outcome: "composed",
    actorId: "eai_foundation_validation",
    notes: ["AI-1 foundation validation"],
  });

  appendEaiTurn({
    sessionId: session.sessionId,
    role: "assistant",
    text: composed.text,
  });
  updateEaiSessionStatus(session.sessionId, "closed");

  const snapshot = getEaiRegistrySnapshot();
  const sources = listEaiContextSourceDescriptors();
  const tools = listEaiTools();
  const turns = listEaiTurns(session.sessionId);

  const passed =
    getEaiFrameworkVersion() === EAI_FRAMEWORK_VERSION &&
    getActiveEaiLlmProviderId() === EAI_STUB_LLM_PROVIDER_ID &&
    !!userTurn &&
    context.redactionNotes.length >= 3 &&
    sources.every((s) => s.implemented === false) &&
    policy.requireActionProposal === true &&
    policy.deniedToolIds.includes("crm.mutate.forbidden") &&
    policy.allowedToolIds.includes("customer_registry.read") &&
    !policy.allowedDataScopes.includes("not.a.real.scope") &&
    readResult.ok === true &&
    mutateDenied.ok === false &&
    mutateDenied.errorCode === "policy_denied" &&
    executionBlocked?.status === "pending_review" &&
    llm.content.includes("[stub]") &&
    composed.text.length > 0 &&
    interaction.interactionId.length > 0 &&
    tools.length >= 2 &&
    turns.length >= 2 &&
    snapshot.frameworkVersion === EAI_FRAMEWORK_VERSION &&
    snapshot.llmProviderId === EAI_STUB_LLM_PROVIDER_ID;

  return {
    passed,
    details: {
      frameworkVersion: getEaiFrameworkVersion(),
      sessionId: session.sessionId,
      conversationId: session.conversationId,
      contextId: context.contextId,
      policyDecisionId: policy.decisionId,
      requireActionProposal: policy.requireActionProposal,
      allowedToolIds: policy.allowedToolIds,
      deniedToolIds: policy.deniedToolIds,
      proposalId: proposal.proposalId,
      proposalStatusAfterExecuteAttempt: executionBlocked?.status,
      llmProviderId: getActiveEaiLlmProviderId(),
      interactionId: interaction.interactionId,
      toolCount: tools.length,
      contextSourceCount: sources.length,
      turnCount: turns.length,
      snapshot,
    },
  };
}
