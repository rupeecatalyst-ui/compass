/**
 * CO-UX-008 — Loading session: Level 1 hidden → Level 2 preparing → Level 3 rotate → complete.
 * Never artificially delays the user when loading ends.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CHANAKYA_LOADING_COMPLETION_MS,
  CHANAKYA_LOADING_LEVEL1_MS,
  CHANAKYA_LOADING_LEVEL2_MS,
  CHANAKYA_LOADING_PREPARING_DEFAULT,
  CHANAKYA_LOADING_ROTATION_MS,
} from "@/constants/chanakya-loading/timing";
import {
  composeChanakyaLoadingMessages,
  pickCompletionMessage,
} from "@/lib/chanakya-loading/compose-messages";
import { deriveChanakyaLoadingSignalsFromEbi } from "@/lib/chanakya-loading/derive-live-signals";
import type {
  ChanakyaLoadingLiveSignals,
  ChanakyaLoadingMessage,
  ChanakyaLoadingModule,
  ChanakyaLoadingSessionPhase,
} from "@/types/chanakya-loading";

export type UseChanakyaLoadingSessionOptions = {
  module: ChanakyaLoadingModule;
  /** When false, enter completion then done (never delay past load end). */
  loading?: boolean;
  signals?: ChanakyaLoadingLiveSignals | null;
  /** Auto-compose EBI signals when none provided. */
  useEbiSignals?: boolean;
  statusLabel?: string;
};

export type ChanakyaLoadingSessionState = {
  phase: ChanakyaLoadingSessionPhase;
  level: 1 | 2 | 3;
  /** Whether the loading chrome should paint (false during Level 1). */
  visible: boolean;
  displayText: string;
  currentMessage: ChanakyaLoadingMessage | null;
  isComplete: boolean;
};

export function useChanakyaLoadingSession(
  options: UseChanakyaLoadingSessionOptions,
): ChanakyaLoadingSessionState {
  const {
    module,
    loading = true,
    signals: signalsProp,
    useEbiSignals = true,
    statusLabel,
  } = options;

  const signals = useMemo(() => {
    if (signalsProp) return signalsProp;
    if (!useEbiSignals) return null;
    return deriveChanakyaLoadingSignalsFromEbi();
  }, [signalsProp, useEbiSignals]);

  const queue = useMemo(
    () => composeChanakyaLoadingMessages(module, signals),
    [module, signals],
  );

  const [elapsed, setElapsed] = useState(0);
  const [rotationIndex, setRotationIndex] = useState(0);
  const [phase, setPhase] = useState<ChanakyaLoadingSessionPhase>(
    loading ? "hidden" : "done",
  );

  // Elapsed clock while loading
  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    setPhase("hidden");
    setRotationIndex(0);
    const started = performance.now();
    const tick = window.setInterval(() => {
      setElapsed(performance.now() - started);
    }, 100);
    return () => window.clearInterval(tick);
  }, [loading, module]);

  // Phase transitions while loading
  useEffect(() => {
    if (!loading) return;
    if (elapsed < CHANAKYA_LOADING_LEVEL1_MS) {
      setPhase("hidden");
      return;
    }
    if (elapsed < CHANAKYA_LOADING_LEVEL2_MS) {
      setPhase("preparing");
      return;
    }
    setPhase("rotating");
  }, [elapsed, loading]);

  // Rotation (Level 3)
  useEffect(() => {
    if (!loading || phase !== "rotating" || queue.length === 0) return;
    const id = window.setInterval(() => {
      setRotationIndex((i) => (i + 1) % queue.length);
    }, CHANAKYA_LOADING_ROTATION_MS);
    return () => window.clearInterval(id);
  }, [loading, phase, queue.length]);

  // Completion — never wait for next rotation cycle
  useEffect(() => {
    if (loading) return;
    if (phase === "done") return;
    setPhase("complete");
    const id = window.setTimeout(() => setPhase("done"), CHANAKYA_LOADING_COMPLETION_MS);
    return () => window.clearTimeout(id);
  }, [loading, phase]);

  const level: 1 | 2 | 3 =
    phase === "hidden" || elapsed < CHANAKYA_LOADING_LEVEL1_MS
      ? 1
      : elapsed < CHANAKYA_LOADING_LEVEL2_MS
        ? 2
        : 3;

  const currentMessage =
    phase === "rotating" ? (queue[rotationIndex % Math.max(queue.length, 1)] ?? null) : null;

  let displayText = CHANAKYA_LOADING_PREPARING_DEFAULT;
  if (phase === "preparing") {
    displayText = statusLabel?.trim() || CHANAKYA_LOADING_PREPARING_DEFAULT;
  } else if (phase === "rotating") {
    displayText = currentMessage?.text ?? statusLabel ?? CHANAKYA_LOADING_PREPARING_DEFAULT;
  } else if (phase === "complete") {
    displayText = pickCompletionMessage(module, signals);
  }

  const visible =
    phase === "preparing" || phase === "rotating" || phase === "complete";

  return {
    phase,
    level,
    visible,
    displayText,
    currentMessage,
    isComplete: phase === "complete" || phase === "done",
  };
}
