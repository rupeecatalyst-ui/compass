/**
 * Permission Matrix — declarative capability permissions (CO-AI-102).
 * Policy Gate is the only enforcement boundary.
 */

import {
  EAI_PLATFORM_PERMISSION_MATRIX,
  getEaiCapabilityDefinition,
  getEaiPlatformPermission,
} from "@/constants/enterprise-ai-platform";
import type {
  EaiBehaviourPack,
  EaiCapabilityEvaluation,
  EaiCapabilityId,
  EaiCapabilityPermission,
  EaiPermissionEffect,
} from "@/types/enterprise-ai-capability-layer";
import { eaiManifestIncludesCapability } from "./capability-manifest";

export function listEaiPlatformPermissions(): readonly EaiCapabilityPermission[] {
  return EAI_PLATFORM_PERMISSION_MATRIX;
}

export function resolveEaiCapabilityEffect(
  capabilityId: EaiCapabilityId,
  pack?: EaiBehaviourPack,
): { effect: EaiPermissionEffect; reasons: string[] } {
  const reasons: string[] = [];
  const platform = getEaiPlatformPermission(capabilityId);
  if (!platform) {
    return { effect: "deny", reasons: [`No platform permission for ${capabilityId}`] };
  }

  if (platform.effect === "deny") {
    reasons.push(`Platform deny: ${platform.reason}`);
    return { effect: "deny", reasons };
  }

  const def = getEaiCapabilityDefinition(capabilityId);
  if (!def || def.status === "disabled") {
    reasons.push(`Capability disabled or unknown: ${capabilityId}`);
    return { effect: "deny", reasons };
  }

  if (!pack) {
    reasons.push("No Behaviour Pack loaded — deny by default");
    return { effect: "deny", reasons };
  }

  const override = pack.permissionOverrides?.find((p) => p.capabilityId === capabilityId);
  if (override?.effect === "deny") {
    reasons.push(`Pack override deny: ${override.reason}`);
    return { effect: "deny", reasons };
  }

  if (!eaiManifestIncludesCapability(pack.manifest, capabilityId)) {
    reasons.push(`Capability not declared in Behaviour Pack manifest: ${pack.packId}`);
    return { effect: "deny", reasons };
  }

  if (def.status === "reserved") {
    reasons.push(`Capability reserved (not activated): ${capabilityId}`);
    return { effect: "deny", reasons };
  }

  reasons.push(`Platform allow: ${platform.reason}`);
  if (override?.effect === "allow") {
    reasons.push(`Pack override allow: ${override.reason}`);
  }
  return { effect: "allow", reasons };
}

export function evaluateEaiCapabilityPermission(
  capabilityId: EaiCapabilityId,
  pack?: EaiBehaviourPack,
): EaiCapabilityEvaluation {
  const resolved = resolveEaiCapabilityEffect(capabilityId, pack);
  const def = getEaiCapabilityDefinition(capabilityId);
  return {
    capabilityId,
    allowed: resolved.effect === "allow",
    effect: resolved.effect,
    reasons: resolved.reasons,
    requireActionProposal: def?.requiresActionProposal ?? false,
  };
}
