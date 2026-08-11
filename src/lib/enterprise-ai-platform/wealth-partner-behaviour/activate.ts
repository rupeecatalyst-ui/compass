/**
 * Activate Wealth Partner Behaviour Pack on the Enterprise AI Platform (CO-AI-112).
 */

import {
  EAI_CAPABILITY_MANIFEST_VERSION,
} from "@/constants/enterprise-ai-platform";
import {
  EAI_WEALTH_PARTNER_CAPABILITIES,
  EAI_WEALTH_PARTNER_CAPABILITY_THEMES,
  EAI_WEALTH_PARTNER_DENIED_CAPABILITIES,
  EAI_WEALTH_PARTNER_PACK_ID,
  EAI_WEALTH_PARTNER_TOOL_CATEGORIES,
} from "@/constants/enterprise-ai-platform/wealth-partner-behaviour";
import type { EaiBehaviourPack } from "@/types/enterprise-ai-capability-layer";
import type { EaiWealthPartnerActivationResult } from "@/types/enterprise-ai-wealth-partner-behaviour";
import {
  ensureEaiBehaviourPackScaffolds,
  loadEaiBehaviourPack,
  registerEaiBehaviourPack,
} from "../behaviour-packs";

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Build the activated Wealth Partner Behaviour Pack definition.
 * Reuses platform capability catalogue — does not invent a second AI.
 */
export function buildEaiWealthPartnerBehaviourPack(): EaiBehaviourPack {
  const ts = nowIso();
  return {
    packId: EAI_WEALTH_PARTNER_PACK_ID,
    displayName: "SARATHI Wealth Partner",
    description:
      "Activated Wealth Partner Behaviour Pack (AI-12) — professional advisory communication for partners. Reuses Enterprise AI Platform engines.",
    lifecycle: "active",
    manifest: {
      manifestVersion: EAI_CAPABILITY_MANIFEST_VERSION,
      capabilities: [...EAI_WEALTH_PARTNER_CAPABILITIES],
      deniedCapabilities: [...EAI_WEALTH_PARTNER_DENIED_CAPABILITIES],
    },
    configuration: {
      tone: "formal",
      communicationStyle: "advisory_reserved",
      responseStyle: "bullet_first",
      questionStyle: "batched",
      allowedToolCategories: [...EAI_WEALTH_PARTNER_TOOL_CATEGORIES],
      voiceStyle: "provider_independent",
      supportedLanguages: ["en", "hi", "mr"],
    },
    permissionOverrides: [
      {
        capabilityId: "crm_mutation",
        effect: "deny",
        reason: "Wealth Partner pack never mutates CRM",
      },
      {
        capabilityId: "create_opportunity",
        effect: "deny",
        reason: "Opportunity create remains Action Proposal only",
      },
      {
        capabilityId: "workflow_execution",
        effect: "deny",
        reason: "Workflow execution denied — proposals only",
      },
    ],
    registeredAt: ts,
    updatedAt: ts,
  };
}

/**
 * Ensure Wealth Partner Behaviour Pack is registered and active.
 * Idempotent — safe to call from conversation / readiness paths.
 */
export function activateEaiWealthPartnerBehaviourPack(): EaiWealthPartnerActivationResult {
  ensureEaiBehaviourPackScaffolds();
  const pack = buildEaiWealthPartnerBehaviourPack();
  registerEaiBehaviourPack(pack);
  // registerEaiBehaviourPack preserves "active" lifecycle (only upgrades scaffold → registered)
  const stored = loadEaiBehaviourPack(EAI_WEALTH_PARTNER_PACK_ID);
  if (stored && stored.lifecycle !== "active") {
    registerEaiBehaviourPack({ ...stored, lifecycle: "active" });
  }
  return {
    packId: EAI_WEALTH_PARTNER_PACK_ID,
    lifecycle: "active",
    audience: "partner",
    capabilityThemeCount: EAI_WEALTH_PARTNER_CAPABILITY_THEMES.length,
    activatedAt: nowIso(),
  };
}

export function getEaiWealthPartnerCapabilityThemes() {
  return [...EAI_WEALTH_PARTNER_CAPABILITY_THEMES];
}

export function isEaiWealthPartnerPackActive(): boolean {
  ensureEaiBehaviourPackScaffolds();
  activateEaiWealthPartnerBehaviourPack();
  const pack = loadEaiBehaviourPack(EAI_WEALTH_PARTNER_PACK_ID);
  return pack?.lifecycle === "active";
}
