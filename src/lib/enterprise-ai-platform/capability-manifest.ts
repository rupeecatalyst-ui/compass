/**
 * Capability Manifest helpers (CO-AI-102).
 */

import {
  EAI_CAPABILITY_MANIFEST_VERSION,
  getEaiCapabilityDefinition,
} from "@/constants/enterprise-ai-platform";
import type {
  EaiCapabilityId,
  EaiCapabilityManifest,
} from "@/types/enterprise-ai-capability-layer";

export function createEaiCapabilityManifest(
  capabilities: EaiCapabilityId[],
  deniedCapabilities: EaiCapabilityId[] = [],
): EaiCapabilityManifest {
  return {
    manifestVersion: EAI_CAPABILITY_MANIFEST_VERSION,
    capabilities: [...new Set(capabilities)],
    deniedCapabilities: [...new Set(deniedCapabilities)],
  };
}

export function eaiManifestIncludesCapability(
  manifest: EaiCapabilityManifest,
  capabilityId: EaiCapabilityId,
): boolean {
  if (manifest.deniedCapabilities?.includes(capabilityId)) return false;
  return manifest.capabilities.includes(capabilityId);
}

export function listUnknownEaiCapabilities(
  capabilityIds: EaiCapabilityId[],
): EaiCapabilityId[] {
  return capabilityIds.filter((id) => !getEaiCapabilityDefinition(id));
}

export function validateEaiCapabilityManifestShape(manifest: EaiCapabilityManifest): string[] {
  const errors: string[] = [];
  if (!manifest.manifestVersion) {
    errors.push("Capability Manifest missing manifestVersion");
  }
  if (!Array.isArray(manifest.capabilities)) {
    errors.push("Capability Manifest capabilities must be an array");
    return errors;
  }
  for (const id of manifest.capabilities) {
    if (!getEaiCapabilityDefinition(id)) {
      errors.push(`Unknown capability in manifest: ${id}`);
    }
  }
  for (const id of manifest.deniedCapabilities ?? []) {
    if (!getEaiCapabilityDefinition(id)) {
      errors.push(`Unknown denied capability in manifest: ${id}`);
    }
  }
  const overlap = (manifest.deniedCapabilities ?? []).filter((id) =>
    manifest.capabilities.includes(id),
  );
  if (overlap.length > 0) {
    errors.push(
      `Capabilities both allowed and denied in manifest: ${overlap.join(", ")}`,
    );
  }
  return errors;
}
