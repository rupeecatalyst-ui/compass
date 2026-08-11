/**
 * Behaviour Pack registry — dynamic load/register (CO-AI-102).
 * Framework only — scaffolds have no conversational business behaviour.
 */

import type { EaiBehaviourPack } from "@/types/enterprise-ai-capability-layer";
import type { EaiPersonaPackId } from "@/types/enterprise-ai-platform";
import { buildEaiScaffoldBehaviourPacks } from "./behaviour-pack-scaffolds";

const packs = new Map<EaiPersonaPackId, EaiBehaviourPack>();
let scaffoldEnsured = false;

export function ensureEaiBehaviourPackScaffolds(): void {
  if (scaffoldEnsured && packs.size > 0) return;
  for (const pack of buildEaiScaffoldBehaviourPacks()) {
    packs.set(pack.packId, pack);
  }
  scaffoldEnsured = true;
}

export function resetEaiBehaviourPackRegistry(): void {
  packs.clear();
  scaffoldEnsured = false;
}

export function registerEaiBehaviourPack(pack: EaiBehaviourPack): EaiBehaviourPack {
  const next: EaiBehaviourPack = {
    ...pack,
    lifecycle: pack.lifecycle === "scaffold" ? "registered" : pack.lifecycle,
    updatedAt: new Date().toISOString(),
  };
  packs.set(next.packId, next);
  return next;
}

export function loadEaiBehaviourPack(packId: EaiPersonaPackId): EaiBehaviourPack | undefined {
  ensureEaiBehaviourPackScaffolds();
  return packs.get(packId);
}

export function listEaiBehaviourPacks(): EaiBehaviourPack[] {
  ensureEaiBehaviourPackScaffolds();
  return [...packs.values()];
}

export function getEaiBehaviourPackOrThrow(packId: EaiPersonaPackId): EaiBehaviourPack {
  const pack = loadEaiBehaviourPack(packId);
  if (!pack) {
    throw new Error(`Behaviour Pack not registered: ${packId}`);
  }
  return pack;
}
