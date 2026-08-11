"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { EnterpriseWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-workspace-shell";
import { Button } from "@/components/ui/button";
import { EAI_SARATHI_WELCOME } from "@/constants/enterprise-ai-platform/conversation-experience";
import { SARATHI_VOICE_STATUS } from "@/constants/sarathi-voice";
import {
  awaitSarathiNaturalThinkFloor,
  buildSarathiNaturalThinkPlan,
  classifySarathiThinkComplexity,
  clearEaiSarathiContinuityStorage,
  detectSarathiProductContext,
  deriveSarathiConsultationConfidence,
  extractUxFactsFromUtterance,
  loadEaiSarathiContinuityFromStorage,
  mapConsultationFactsToSummary,
  runEaiSarathiConversationTurn,
  saveEaiSarathiContinuityToStorage,
  startSarathiProgressiveThinking,
  streamSarathiFacingText,
  type SarathiProductContextId,
  type SarathiUxPhase,
} from "@/lib/enterprise-ai-platform/conversation-experience";
import { activateEaiWealthPartnerBehaviourPack } from "@/lib/enterprise-ai-platform/wealth-partner-behaviour";
import {
  cancelSarathiSpeech,
  speakSarathiFacingText,
  type SarathiTtsHandle,
} from "@/lib/sarathi-voice";
import type {
  EaiConversationContinuityState,
  EaiConversationMessage,
} from "@/types/enterprise-ai-conversation-experience";
import type { EaiActionProposal, EaiPersonaPackId } from "@/types/enterprise-ai-platform";
import type { EaiVoiceLanguageCode } from "@/types/enterprise-ai-voice";
import { ActionProposalCards } from "./action-proposal-cards";
import { ConversationComposer } from "./conversation-composer";
import { ConversationMessageList } from "./conversation-message-list";
import { TypingIndicator } from "./typing-indicator";

function optimisticUserMessage(text: string): EaiConversationMessage {
  return {
    messageId: `eai_msg_local_${crypto.randomUUID()}`,
    role: "user",
    text,
    createdAt: new Date().toISOString(),
  };
}

/**
 * SARATHI — Natural financial consultation (CO-SARATHI-VISION-001 WAVE-1).
 * Questionnaire UX retired: no chips, no summary form gate, free-flow conversation.
 */
export function SarathiConversationWorkspace({
  personaPackId = "sarathi_customer",
}: {
  personaPackId?: EaiPersonaPackId;
}) {
  const isPartner = personaPackId === "sarathi_wealth_partner";
  const [continuity, setContinuity] = useState<EaiConversationContinuityState | undefined>();
  const [proposals, setProposals] = useState<EaiActionProposal[]>([]);
  const [phase, setPhase] = useState<SarathiUxPhase>("welcome");
  const [, setProduct] = useState<SarathiProductContextId>("general");
  const [accumulatedFacts, setAccumulatedFacts] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [thinking, setThinking] = useState(false);
  const [thinkLabel, setThinkLabel] = useState<string>(SARATHI_VOICE_STATUS.processing);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [voiceLanguage, setVoiceLanguage] = useState<EaiVoiceLanguageCode>("en");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [micRecording, setMicRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  /** Soft unlock — proposals after enough understanding (no form confirm) */
  const proposalsUnlockedRef = useRef(false);
  const continuityRef = useRef(continuity);
  continuityRef.current = continuity;
  const accumulatedFactsRef = useRef(accumulatedFacts);
  accumulatedFactsRef.current = accumulatedFacts;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const streamAbortRef = useRef<AbortController | null>(null);
  const ttsRef = useRef<SarathiTtsHandle | null>(null);
  const ttsEnabledRef = useRef(ttsEnabled);
  ttsEnabledRef.current = ttsEnabled;
  const voiceLanguageRef = useRef(voiceLanguage);
  voiceLanguageRef.current = voiceLanguage;

  useEffect(() => {
    if (isPartner) activateEaiWealthPartnerBehaviourPack();
    const stored = loadEaiSarathiContinuityFromStorage(personaPackId);
    if (stored?.messages.length) {
      setContinuity(stored);
      setPhase("understanding");
      const corpus = stored.messages
        .filter((m) => m.role === "user")
        .map((m) => m.text)
        .join(" ");
      setProduct(detectSarathiProductContext(corpus));
    } else {
      setPhase("welcome");
    }
  }, [isPartner, personaPackId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [
    continuity?.messages.length,
    thinking,
    thinkLabel,
    streamingText,
    phase,
    proposals.length,
  ]);

  const busy = thinking || pending || streamingText != null;
  const showProposals = phase === "advising" && proposals.length > 0;

  const statusLabel = micRecording
    ? SARATHI_VOICE_STATUS.recording
    : speaking
      ? SARATHI_VOICE_STATUS.speaking
      : thinking
        ? thinkLabel
        : null;

  const send = (utterance: string, opts?: { emitProposals?: boolean }) => {
    setError(null);
    streamAbortRef.current?.abort();
    ttsRef.current?.cancel();
    ttsRef.current = null;
    cancelSarathiSpeech();
    setSpeaking(false);
    const emitProposals =
      opts?.emitProposals === true || proposalsUnlockedRef.current;
    const prior = continuityRef.current;
    const userOptimistic = optimisticUserMessage(utterance);

    setContinuity((c) => {
      if (!c) {
        return {
          continuityKey: `local_${personaPackId}`,
          conversationId: `local_conv_${personaPackId}`,
          personaPackId,
          messages: [userOptimistic],
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        ...c,
        messages: [...c.messages, userOptimistic],
        updatedAt: new Date().toISOString(),
      };
    });

    if (phaseRef.current === "welcome") setPhase("understanding");

    const complexity = classifySarathiThinkComplexity({
      utterance,
      phase: phaseRef.current,
      emitProposals,
      userTurnCount: (prior?.messages.filter((m) => m.role === "user").length ?? 0) + 1,
    });
    const plan = buildSarathiNaturalThinkPlan(complexity);

    setThinking(true);
    setThinkLabel(plan.progressiveLabels[0] ?? SARATHI_VOICE_STATUS.processing);
    setStreamingText(null);

    const progressiveAbort = new AbortController();
    startSarathiProgressiveThinking({
      labels: plan.progressiveLabels,
      onLabel: (label) => setThinkLabel(label),
      signal: progressiveAbort.signal,
    });

    const startedAt = Date.now();

    startTransition(async () => {
      try {
        const result = await runEaiSarathiConversationTurn({
          utterance,
          continuity: prior,
          personaPackId,
          emitActionProposals: emitProposals,
        });

        await awaitSarathiNaturalThinkFloor(startedAt, plan);
        progressiveAbort.abort();
        setThinking(false);
        setThinkLabel(SARATHI_VOICE_STATUS.typing);

        const withoutAssistant: EaiConversationContinuityState = {
          ...result.continuity,
          messages: result.continuity.messages.filter(
            (m) => m.messageId !== result.assistantMessage.messageId,
          ),
        };
        setContinuity(withoutAssistant);

        const streamAbort = new AbortController();
        streamAbortRef.current = streamAbort;
        await streamSarathiFacingText({
          text: result.facingText,
          chunkMs: plan.streamChunkMs,
          signal: streamAbort.signal,
          onUpdate: (partial) => setStreamingText(partial),
        });
        setStreamingText(null);

        setContinuity(result.continuity);
        saveEaiSarathiContinuityToStorage(result.continuity);

        if (ttsEnabledRef.current && !result.blocked && result.facingText.trim()) {
          ttsRef.current?.cancel();
          ttsRef.current = speakSarathiFacingText({
            text: result.facingText,
            language: voiceLanguageRef.current,
            onStart: () => setSpeaking(true),
            onEnd: () => setSpeaking(false),
            onError: () => setSpeaking(false),
          });
        }

        const userTexts = result.continuity.messages
          .filter((m) => m.role === "user")
          .map((m) => m.text);
        const detected = detectSarathiProductContext(userTexts.join(" "));
        setProduct(detected);

        if (result.blocked) {
          setProposals([]);
          setPhase("understanding");
          return;
        }

        const nextFacts = (() => {
          const map = new Map<string, string>();
          for (const f of accumulatedFactsRef.current) map.set(f.key, f.value);
          for (const f of result.consultationSnapshot?.keyFacts ?? []) {
            if (f.key && f.value?.trim()) map.set(f.key, f.value.trim());
          }
          for (const f of extractUxFactsFromUtterance(utterance, detected)) {
            if (f.key && f.value?.trim()) map.set(f.key, f.value.trim());
          }
          return Array.from(map.entries()).map(([key, value]) => ({ key, value }));
        })();
        setAccumulatedFacts(nextFacts);

        const conf = deriveSarathiConsultationConfidence({
          product: detected,
          facts: nextFacts,
          openMissingSlotIds: result.consultationSnapshot?.openMissingSlotIds,
          userTurnCount: userTexts.length,
          confidenceScoreHint: result.consultationSnapshot?.confidenceScoreHint,
        });
        const facts = mapConsultationFactsToSummary(nextFacts, detected);
        const ready = conf.readyForSummary && facts.length >= 3;

        // Soft unlock — no summary form; next turns may surface next steps
        if (ready) proposalsUnlockedRef.current = true;

        if (emitProposals || proposalsUnlockedRef.current) {
          if (result.actionProposals.length > 0) {
            setProposals(result.actionProposals);
            setPhase("advising");
          } else if (ready && !emitProposals) {
            // First unlock turn had no emit — stay in conversation; proposals next customer turn
            setPhase("understanding");
            setProposals([]);
          } else {
            setPhase(proposalsUnlockedRef.current ? "advising" : "understanding");
            setProposals(result.actionProposals);
          }
        } else {
          setProposals([]);
          setPhase("understanding");
        }
      } catch (e) {
        progressiveAbort.abort();
        setError(
          e instanceof Error
            ? e.message
            : "Something went wrong. Please try again in a moment.",
        );
        if (prior) setContinuity(prior);
        else setContinuity(undefined);
      } finally {
        progressiveAbort.abort();
        setThinking(false);
        setStreamingText(null);
      }
    });
  };

  const resetConversation = () => {
    streamAbortRef.current?.abort();
    ttsRef.current?.cancel();
    ttsRef.current = null;
    cancelSarathiSpeech();
    setSpeaking(false);
    setMicRecording(false);
    clearEaiSarathiContinuityStorage(personaPackId);
    proposalsUnlockedRef.current = false;
    setContinuity(undefined);
    setProposals([]);
    setAccumulatedFacts([]);
    setProduct("general");
    setPhase("welcome");
    setThinking(false);
    setStreamingText(null);
    setError(null);
  };

  const displayMessages = continuity?.messages ?? [];

  return (
    <EnterpriseWorkspaceShell
      scrollMode="document"
      chrome={
        <div className="border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-xl tracking-tight text-foreground sm:text-2xl">
                {EAI_SARATHI_WELCOME.brand}
              </h1>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                {isPartner ? "Partner advisory" : EAI_SARATHI_WELCOME.tagline}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground"
              onClick={resetConversation}
            >
              Start over
            </Button>
          </div>
        </div>
      }
      bodyClassName="px-3 pb-8 pt-3 sm:px-6 sm:pt-4"
    >
      <div className="mx-auto flex min-h-[min(70vh,40rem)] max-w-2xl flex-col gap-4">
        <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-border/40 bg-muted/20 px-3 py-4 sm:px-5 sm:py-5">
          <ConversationMessageList
            messages={displayMessages}
            welcomeVariant={isPartner ? "partner" : "customer"}
            streamingText={streamingText}
          />
          {statusLabel && (thinking || micRecording || speaking) ? (
            <TypingIndicator label={statusLabel} />
          ) : null}
          <div ref={bottomRef} />

          {showProposals ? <ActionProposalCards proposals={proposals} /> : null}
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <ConversationComposer
          disabled={busy}
          onSend={(t) => send(t)}
          language={voiceLanguage}
          onLanguageChange={setVoiceLanguage}
          ttsEnabled={ttsEnabled}
          onTtsEnabledChange={(enabled) => {
            setTtsEnabled(enabled);
            if (!enabled) {
              ttsRef.current?.cancel();
              ttsRef.current = null;
              cancelSarathiSpeech();
              setSpeaking(false);
            }
          }}
          onVoiceStatusChange={(status) => {
            setMicRecording(status === "recording");
            if (status === "recording") {
              ttsRef.current?.cancel();
              ttsRef.current = null;
              cancelSarathiSpeech();
              setSpeaking(false);
            }
          }}
        />
      </div>
    </EnterpriseWorkspaceShell>
  );
}
