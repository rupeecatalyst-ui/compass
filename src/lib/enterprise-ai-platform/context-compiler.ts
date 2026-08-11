/**
 * Context Compiler — projects sanitized facts into LLM-facing compiled context (CO-AI-101).
 *
 * CO-AI-103: The Context Intelligence Engine is the ONLY module allowed to *prepare*
 * enterprise AI context. Prefer `compileEaiContextFromPackage` after `buildEaiContextPackage`.
 * `compileEaiContext` remains for low-level / foundation tests with already-sanitized facts.
 */

import {
  EAI_CONTEXT_COMPILER_VERSION,
  EAI_DEFAULT_REDACTION_NOTES,
  EAI_RESERVED_TOOL_IDS,
} from "@/constants/enterprise-ai-platform";
import { getEaiPorts } from "./composition";
import type {
  EaiCompiledContext,
  EaiContextSourceDescriptor,
  EaiPersonaPackId,
  EaiRegistryRef,
  EaiSanitizedFact,
} from "@/types/enterprise-ai-platform";
import type { EaiContextPackage } from "@/types/enterprise-ai-context-intelligence";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** Framework catalogue — production connectors arrive in later sprints. */
export function listEaiContextSourceDescriptors(): EaiContextSourceDescriptor[] {
  return EAI_RESERVED_TOOL_IDS.map((toolId) => {
    const registry = toolId.split(".")[0] ?? toolId;
    return {
      sourceId: `ctxsrc.${toolId}`,
      registry,
      description: `Reserved connector for ${registry} (not implemented in AI-1)`,
      implemented: false,
    };
  });
}

export interface CompileEaiContextInput {
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  /** Optional caller-supplied sanitized facts only — never raw registry dumps. */
  sanitizedFacts?: EaiSanitizedFact[];
  registryRefs?: EaiRegistryRef[];
  extraRedactionNotes?: string[];
}

/**
 * Low-level compile from already-sanitized facts.
 * Production Behaviour Packs should use Context Intelligence → `compileEaiContextFromPackage`.
 */
export function compileEaiContext(input: CompileEaiContextInput): EaiCompiledContext {
  const facts = (input.sanitizedFacts ?? []).map((f) => ({
    key: f.key,
    value: String(f.value).slice(0, 500),
    provenance: f.provenance,
  }));

  const refs = (input.registryRefs ?? []).map((r) => ({
    registry: r.registry,
    entityId: r.entityId,
    label: r.label ? String(r.label).slice(0, 120) : undefined,
  }));

  const context: EaiCompiledContext = {
    contextId: newId("eai_ctx"),
    sessionId: input.sessionId,
    conversationId: input.conversationId,
    personaPackId: input.personaPackId,
    sanitizedFacts: facts,
    registryRefs: refs,
    redactionNotes: [
      ...EAI_DEFAULT_REDACTION_NOTES,
      ...(input.extraRedactionNotes ?? []),
      "AI-1: production registry connectors are not wired; framework compile only.",
    ],
    compiledAt: nowIso(),
    compilerVersion: EAI_CONTEXT_COMPILER_VERSION,
  };

  getEaiPorts().contexts.save(context);
  return context;
}

/**
 * Project a Context Intelligence Package into LLM-facing compiled context.
 * Does not call providers — receives an already-built package only.
 */
export function compileEaiContextFromPackage(
  pkg: EaiContextPackage,
): EaiCompiledContext {
  const sanitizedFacts: EaiSanitizedFact[] = [];
  const registryRefs: EaiRegistryRef[] = [];

  for (const section of pkg.sections) {
    if (!section.included) continue;
    for (const fact of section.facts) {
      sanitizedFacts.push({
        key: `${section.domain}.${fact.key}`,
        value: fact.value,
        provenance: fact.provenance,
      });
    }
    if (section.summary) {
      sanitizedFacts.push({
        key: `${section.domain}.summary`,
        value: section.summary,
        provenance: "system",
      });
    }
    for (const ref of section.refs) {
      registryRefs.push(ref);
    }
  }

  return compileEaiContext({
    sessionId: pkg.sessionId,
    conversationId: pkg.conversationId,
    personaPackId: pkg.personaPackId,
    sanitizedFacts,
    registryRefs,
    extraRedactionNotes: [
      ...pkg.sanitisationNotes,
      `Context Package ${pkg.packageId} (builder ${pkg.versioning.builderVersion})`,
      "Compiled via Context Intelligence Engine projection — no raw enterprise objects.",
    ],
  });
}

export function getEaiCompiledContext(contextId: string): EaiCompiledContext | undefined {
  return getEaiPorts().contexts.findById(contextId);
}
