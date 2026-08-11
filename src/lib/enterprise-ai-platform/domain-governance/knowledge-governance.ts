/**
 * Knowledge Governance — classify knowledge sources into Knowledge Zones (CO-AI-104A).
 */

import { EAI_DEFAULT_KNOWLEDGE_SOURCES } from "@/constants/enterprise-ai-platform/domain-governance";
import type {
  EaiKnowledgeSourceRegistration,
  EaiKnowledgeZoneId,
} from "@/types/enterprise-ai-domain-governance";

const sources = new Map<string, EaiKnowledgeSourceRegistration>();
let seeded = false;

function nowIso(): string {
  return new Date().toISOString();
}

export function ensureEaiKnowledgeSourcesSeeded(): void {
  if (seeded && sources.size > 0) return;
  for (const s of EAI_DEFAULT_KNOWLEDGE_SOURCES) {
    sources.set(s.sourceId, {
      sourceId: s.sourceId,
      displayName: s.displayName,
      zone: s.zone,
      description: s.description,
      registeredAt: nowIso(),
    });
  }
  seeded = true;
}

export function resetEaiKnowledgeSources(): void {
  sources.clear();
  seeded = false;
}

/**
 * Register a knowledge source. Zone classification is mandatory.
 * Zone 3 sources are rejected — outside knowledge must not enter SARATHI.
 */
export function registerEaiKnowledgeSource(input: {
  sourceId: string;
  displayName: string;
  zone: EaiKnowledgeZoneId;
  description?: string;
}): EaiKnowledgeSourceRegistration {
  if (!input.sourceId.trim()) {
    throw new Error("Knowledge source id is required");
  }
  if (input.zone === "zone_3_outside") {
    throw new Error(
      "Knowledge sources cannot be registered in Zone 3 (Outside Domain)",
    );
  }
  const record: EaiKnowledgeSourceRegistration = {
    sourceId: input.sourceId.trim(),
    displayName: input.displayName.trim(),
    zone: input.zone,
    description: input.description,
    registeredAt: nowIso(),
  };
  sources.set(record.sourceId, record);
  seeded = true;
  return record;
}

export function getEaiKnowledgeSource(
  sourceId: string,
): EaiKnowledgeSourceRegistration | undefined {
  ensureEaiKnowledgeSourcesSeeded();
  return sources.get(sourceId);
}

export function listEaiKnowledgeSources(): EaiKnowledgeSourceRegistration[] {
  ensureEaiKnowledgeSourcesSeeded();
  return [...sources.values()];
}

export function assertEaiKnowledgeSourceZoneAllowed(
  sourceId: string,
): { ok: true; zone: EaiKnowledgeZoneId } | { ok: false; reason: string } {
  const source = getEaiKnowledgeSource(sourceId);
  if (!source) {
    return { ok: false, reason: `Unknown knowledge source: ${sourceId}` };
  }
  if (source.zone === "zone_3_outside") {
    return { ok: false, reason: `Source ${sourceId} is outside domain` };
  }
  return { ok: true, zone: source.zone };
}
