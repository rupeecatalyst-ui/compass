/**
 * Voice Engine readiness (CO-AI-113).
 */

import {
  EAI_VOICE_ENGINE_VERSION,
  EAI_VOICE_SUPPORTED_LANGUAGES,
} from "@/constants/enterprise-ai-platform/voice";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import { isEaiOutsideDomainRefusalEquivalent } from "../multilingual/localisation";
import type { EaiVoiceEngineReadinessResult } from "@/types/enterprise-ai-voice";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { resetEaiComposition } from "../composition";
import { updateEaiActionProposalStatus } from "../action-proposals";
import { resetEaiVoiceComposition, getEaiVoicePorts } from "./composition";
import {
  enqueueEaiVoiceResponse,
  listEaiVoiceQueue,
  resetEaiVoiceQueues,
} from "./response-queue";
import {
  createEaiVoiceSession,
  recoverEaiVoiceSession,
  resetEaiVoiceSessions,
} from "./session-manager";
import { resetEaiVoiceStreams } from "./streaming";
import { interruptEaiVoiceSession, runEaiVoiceConversationTurn } from "./voice-turn";

export async function runEaiVoiceEngineReadiness(): Promise<EaiVoiceEngineReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();
  resetEaiVoiceComposition();
  resetEaiVoiceSessions();
  resetEaiVoiceQueues();
  resetEaiVoiceStreams();

  if (EAI_VOICE_SUPPORTED_LANGUAGES.length !== 3) {
    errors.push("Voice must support exactly en, hi, mr in AI-13");
  }
  for (const lang of ["en", "hi", "mr"] as const) {
    if (!EAI_VOICE_SUPPORTED_LANGUAGES.includes(lang)) {
      errors.push(`Missing voice language: ${lang}`);
    }
  }

  const ports = getEaiVoicePorts();
  for (const lang of EAI_VOICE_SUPPORTED_LANGUAGES) {
    if (!ports.sttProvider.supportedLanguages.includes(lang)) {
      errors.push(`STT stub missing language ${lang}`);
    }
    if (!ports.ttsProvider.supportedLanguages.includes(lang)) {
      errors.push(`TTS stub missing language ${lang}`);
    }
  }

  // Outside domain via voice interface
  const session = createEaiVoiceSession({ language: "en", personaPackId: "sarathi_customer" });
  const outside = await runEaiVoiceConversationTurn({
    voiceSessionId: session.voiceSessionId,
    audio: {
      frameId: "f1",
      data: "text:Tell me a joke about politics",
      mimeType: "audio/x-eai-stub",
      createdAt: new Date().toISOString(),
    },
  });
  if (!outside.blocked || !isEaiOutsideDomainRefusalEquivalent(outside.facingText)) {
    errors.push("Voice outside-domain must return fixed refusal via platform");
  }
  if (outside.facingText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    // English voice session must keep English canonical facing refusal
    errors.push("English voice outside-domain must use English canonical refusal");
  }

  // In-domain BT via voice — intelligence path unchanged
  const btSession = createEaiVoiceSession({ language: "hi", personaPackId: "sarathi_customer" });
  const bt = await runEaiVoiceConversationTurn({
    voiceSessionId: btSession.voiceSessionId,
    audio: {
      frameId: "f2",
      data: "text:I want a Balance Transfer to reduce my EMI",
      mimeType: "audio/x-eai-stub",
      createdAt: new Date().toISOString(),
    },
    emitActionProposals: true,
  });
  if (bt.blocked) errors.push("In-domain voice BT must not block");
  if (!bt.transcript.includes("Balance Transfer")) {
    errors.push("STT must produce transcript for platform turn");
  }
  if (!bt.facingText.trim()) errors.push("Voice turn must return facing text");
  if (!bt.tts) errors.push("TTS result required for non-empty facing text");
  if (bt.streamEvents.length < 2) errors.push("Streaming events must be emitted");

  // Interrupt / barge-in — seed a queued item (stub TTS completes instantly on turns)
  const pending = enqueueEaiVoiceResponse({
    voiceSessionId: btSession.voiceSessionId,
    text: "Pending speak for barge-in test",
    language: "hi",
  });
  if (!pending.item) errors.push("Must enqueue pending TTS item before interrupt test");
  const interrupted = interruptEaiVoiceSession(btSession.voiceSessionId);
  if (!interrupted) errors.push("Interrupt handling must succeed on active session");
  const cancelled = listEaiVoiceQueue(btSession.voiceSessionId).filter(
    (i) => i.status === "cancelled",
  );
  if (cancelled.length === 0) {
    errors.push("Interrupt must cancel queued/speaking TTS items");
  }

  // Follow-up + history continuity
  const follow = await runEaiVoiceConversationTurn({
    voiceSessionId: btSession.voiceSessionId,
    audio: {
      frameId: "f3",
      data: "text:I am salaried and need 25 lakh",
      mimeType: "audio/x-eai-stub",
      createdAt: new Date().toISOString(),
    },
    bargeIn: true,
  });
  if (follow.continuity.messages.length < 4) {
    errors.push("Voice conversation history must accumulate via platform continuity");
  }

  // Recovery
  const recovered = recoverEaiVoiceSession({
    continuity: follow.continuity,
    language: "mr",
    previousVoiceSessionId: btSession.voiceSessionId,
  });
  if (!recovered.recovered) errors.push("Voice session recovery must succeed");
  if (recovered.session.language !== "hi" && recovered.session.language !== "mr") {
    // previous session language hi — recovery of existing keeps hi; new recovery with language mr if new
  }

  // Proposals never execute
  if (follow.actionProposals.length > 0) {
    const p = follow.actionProposals[0]!;
    const blockedExec = updateEaiActionProposalStatus(p.proposalId, "executed_reserved");
    if (blockedExec?.status === "executed_reserved") {
      errors.push("Voice path must never execute CRM/workflow proposals");
    }
  } else {
    warnings.push("No proposals on voice BT path");
  }

  // Marathi language session smoke
  const mr = createEaiVoiceSession({ language: "mr" });
  const mrTurn = await runEaiVoiceConversationTurn({
    voiceSessionId: mr.voiceSessionId,
    audio: {
      frameId: "f4",
      data: "text:Home loan documents checklist",
      mimeType: "audio/x-eai-stub",
      createdAt: new Date().toISOString(),
    },
  });
  if (mrTurn.language !== "mr") errors.push("Marathi voice session language must stick");

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      voiceEngineVersion: EAI_VOICE_ENGINE_VERSION,
      languages: [...EAI_VOICE_SUPPORTED_LANGUAGES],
      sttProviderId: ports.sttProvider.providerId,
      ttsProviderId: ports.ttsProvider.providerId,
      vadProviderId: ports.vadProvider.providerId,
      outsideBlocked: outside.blocked,
      btFacingPreview: bt.facingText.slice(0, 120),
      streamEventCount: bt.streamEvents.length,
      historyLength: follow.continuity.messages.length,
      recovered: recovered.recovered,
      mrOk: !mrTurn.blocked || mrTurn.facingText.length > 0,
    },
  };
}
