/**
 * Capability Layer readiness validation (CO-AI-102).
 */

import {
  EAI_ALL_CAPABILITY_IDS,
  EAI_ALL_TOOL_CATEGORY_IDS,
  EAI_CAPABILITY_LAYER_VERSION,
  EAI_PLATFORM_PERMISSION_MATRIX,
  EAI_TOOL_CATEGORY_CATALOGUE,
  getEaiCapabilityDefinition,
  getEaiPlatformPermission,
} from "@/constants/enterprise-ai-platform";
import type { EaiCapabilityLayerReadinessResult } from "@/types/enterprise-ai-capability-layer";
import { validateEaiBehaviourConfiguration } from "./behaviour-config";
import {
  ensureEaiBehaviourPackScaffolds,
  listEaiBehaviourPacks,
  resetEaiBehaviourPackRegistry,
} from "./behaviour-packs";
import { validateEaiCapabilityManifestShape } from "./capability-manifest";
import { evaluateEaiCapabilityPermission } from "./permission-matrix";
import { evaluateEaiPolicy } from "./policy-gate";
import { registerEaiTool, resetEaiToolHandlers } from "./tool-bus";
import { resetEaiComposition } from "./composition";

export function runEaiCapabilityLayerReadiness(): EaiCapabilityLayerReadinessResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiToolHandlers();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();

  if (EAI_PLATFORM_PERMISSION_MATRIX.length !== EAI_ALL_CAPABILITY_IDS.length) {
    errors.push("Permission matrix size does not match capability catalogue");
  }
  for (const id of EAI_ALL_CAPABILITY_IDS) {
    if (!getEaiPlatformPermission(id)) {
      errors.push(`Missing platform permission for capability: ${id}`);
    }
  }

  if (EAI_TOOL_CATEGORY_CATALOGUE.some((c) => c.implemented)) {
    errors.push("AI-2 tool categories must remain unimplemented");
  }
  if (EAI_ALL_TOOL_CATEGORY_IDS.length !== EAI_TOOL_CATEGORY_CATALOGUE.length) {
    errors.push("Tool category id list mismatch");
  }

  const packs = listEaiBehaviourPacks();
  if (packs.length < 4) {
    errors.push(`Expected at least 4 scaffold Behaviour Packs, found ${packs.length}`);
  }

  for (const pack of packs) {
    errors.push(...validateEaiCapabilityManifestShape(pack.manifest).map((e) => `${pack.packId}: ${e}`));
    errors.push(
      ...validateEaiBehaviourConfiguration(pack.configuration).map((e) => `${pack.packId}: ${e}`),
    );
    if (pack.lifecycle === "active" && pack.packId !== "sarathi_wealth_partner") {
      warnings.push(`${pack.packId} is marked active — AI-2 expects scaffold/registered only`);
    }
  }

  // Permission consistency: create_opportunity and crm_mutation must deny
  const crm = evaluateEaiCapabilityPermission(
    "crm_mutation",
    packs.find((p) => p.packId === "sarathi_customer"),
  );
  const createOpp = evaluateEaiCapabilityPermission(
    "create_opportunity",
    packs.find((p) => p.packId === "sarathi_customer"),
  );
  const generateProposal = evaluateEaiCapabilityPermission(
    "generate_action_proposals",
    packs.find((p) => p.packId === "sarathi_customer"),
  );
  if (crm.allowed) errors.push("crm_mutation must be denied");
  if (createOpp.allowed) errors.push("create_opportunity must be denied in AI-2");
  if (!generateProposal.allowed) {
    errors.push("generate_action_proposals must be allowed for SARATHI Customer scaffold");
  }

  registerEaiTool({
    toolId: "customer_registry.read",
    name: "Customer Registry Read",
    description: "Stub",
    sideEffectClass: "read",
    category: "registry.customer",
  });

  const allowDecision = evaluateEaiPolicy({
    sessionId: "sess_readiness",
    conversationId: "conv_readiness",
    personaPackId: "sarathi_customer",
    requestedToolIds: ["customer_registry.read"],
    requestedDataScopes: ["identity.public"],
    requestedCapabilityIds: ["read_customer_context", "generate_action_proposals"],
    requestedToolCategories: ["registry.customer"],
  });
  if (!allowDecision.allowed) {
    errors.push(`Expected SARATHI Customer policy allow, got: ${allowDecision.blockedReasons.join("; ")}`);
  }
  if (!allowDecision.requireActionProposal) {
    errors.push("generate_action_proposals must force requireActionProposal");
  }

  const denyDecision = evaluateEaiPolicy({
    sessionId: "sess_readiness",
    conversationId: "conv_readiness",
    personaPackId: "sarathi_customer",
    requestedToolIds: [],
    requestedDataScopes: [],
    requestedCapabilityIds: ["crm_mutation", "create_opportunity", "workflow_execution"],
  });
  if (denyDecision.allowed) {
    errors.push("Expected deny for reserved/disabled capabilities");
  }
  if (denyDecision.deniedCapabilityIds.length < 3) {
    errors.push("Expected CRM / create_opportunity / workflow_execution denied");
  }

  const voiceDecision = evaluateEaiPolicy({
    sessionId: "sess_readiness",
    conversationId: "conv_readiness",
    personaPackId: "sarathi_customer",
    requestedToolIds: [],
    requestedDataScopes: [],
    requestedCapabilityIds: ["voice"],
  });
  if (!voiceDecision.allowedCapabilityIds.includes("voice")) {
    errors.push("AI-13: voice capability must be allowed for SARATHI Customer");
  }

  const financialDenied = evaluateEaiPolicy({
    sessionId: "sess_readiness",
    conversationId: "conv_readiness",
    personaPackId: "sarathi_customer",
    requestedToolIds: [],
    requestedDataScopes: [],
    requestedToolCategories: ["financial.foir"],
  });
  if (financialDenied.allowed || !financialDenied.deniedToolCategories.includes("financial.foir")) {
    errors.push("SARATHI Customer scaffold must not allow financial.foir category yet");
  }

  for (const id of EAI_ALL_CAPABILITY_IDS) {
    if (!getEaiCapabilityDefinition(id)) {
      errors.push(`Catalogue missing definition for ${id}`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      capabilityLayerVersion: EAI_CAPABILITY_LAYER_VERSION,
      packCount: packs.length,
      capabilityCount: EAI_ALL_CAPABILITY_IDS.length,
      toolCategoryCount: EAI_ALL_TOOL_CATEGORY_IDS.length,
      permissionCount: EAI_PLATFORM_PERMISSION_MATRIX.length,
      sampleAllowDecisionId: allowDecision.decisionId,
      sampleDenyCapabilityIds: denyDecision.deniedCapabilityIds,
    },
  };
}
