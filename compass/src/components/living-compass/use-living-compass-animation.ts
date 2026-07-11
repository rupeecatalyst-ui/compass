"use client";

import { useEffect, useRef } from "react";
import { useAnimationControls, useReducedMotion } from "framer-motion";
import { LIVING_COMPASS_EASE, LIVING_COMPASS_TIMING } from "./living-compass.constants";
import { buildThinkingBearings, resolveFinancialDirectionBearing } from "./living-compass.directions";
import type { LivingCompassDirection, LivingCompassState } from "./living-compass.types";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface UseLivingCompassAnimationOptions {
  state: LivingCompassState;
  direction?: LivingCompassDirection;
  bearing?: number;
  onThinkingComplete?: () => void;
}

/**
 * Orchestrates needle, breath, and glow layers per advisory state.
 * Each state owns its loop — switching states cancels the previous choreography.
 */
export function useLivingCompassAnimation({
  state,
  direction,
  bearing,
  onThinkingComplete,
}: UseLivingCompassAnimationOptions) {
  const reduceMotion = useReducedMotion();
  const needleControls = useAnimationControls();
  const breathControls = useAnimationControls();
  const glowControls = useAnimationControls();
  const ringControls = useAnimationControls();
  const runIdRef = useRef(0);
  const onThinkingCompleteRef = useRef(onThinkingComplete);

  onThinkingCompleteRef.current = onThinkingComplete;

  const targetBearing = resolveFinancialDirectionBearing(direction, bearing);

  useEffect(() => {
    const runId = ++runIdRef.current;
    const isActive = () => runId === runIdRef.current;

    if (reduceMotion) {
      void needleControls.set({ rotate: state === "ready" ? targetBearing : 0 });
      void breathControls.set({ scale: 1 });
      void glowControls.set({ opacity: state === "ready" ? 0.3 : 0.1 });
      void ringControls.set({ scale: 1 });
      if (state === "thinking" && onThinkingCompleteRef.current) {
        onThinkingCompleteRef.current();
      }
      return;
    }

    const runIdle = async () => {
      void breathControls.start({
        scale: [1, LIVING_COMPASS_TIMING.idle.breathScaleMax, 1],
        transition: {
          duration: LIVING_COMPASS_TIMING.idle.breathDuration,
          ease: LIVING_COMPASS_EASE,
          repeat: Infinity,
        },
      });

      void glowControls.start({
        opacity: [0.08, 0.14, 0.08],
        transition: { duration: LIVING_COMPASS_TIMING.idle.breathDuration, repeat: Infinity, ease: "easeInOut" },
      });

      while (isActive()) {
        for (const degrees of LIVING_COMPASS_TIMING.idle.microNudgeDegrees) {
          if (!isActive()) return;
          await needleControls.start({
            rotate: degrees,
            transition: { duration: LIVING_COMPASS_TIMING.idle.microNudgeDuration, ease: LIVING_COMPASS_EASE },
          });
        }
        await sleep(LIVING_COMPASS_TIMING.idle.microNudgePause * 1000);
      }
    };

    const runListening = async () => {
      void breathControls.start({
        scale: [1, 1.012, 1],
        transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
      });
      void glowControls.start({
        opacity: [0.1, 0.2, 0.1],
        transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
      });

      while (isActive()) {
        for (const degrees of LIVING_COMPASS_TIMING.listening.swingDegrees) {
          if (!isActive()) return;
          await needleControls.start({
            rotate: degrees,
            transition: { duration: LIVING_COMPASS_TIMING.listening.segmentDuration, ease: LIVING_COMPASS_EASE },
          });
        }
      }
    };

    const runThinkingPass = async (bearings: readonly number[], completeAfterPass: boolean) => {
      void breathControls.start({ scale: 1 });
      void glowControls.start({
        opacity: [0.12, 0.22, 0.14],
        transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
      });

      do {
        for (let i = 0; i < bearings.length; i++) {
          if (!isActive()) return;
          const isFinalProbe = completeAfterPass && i === bearings.length - 1;
          await needleControls.start({
            rotate: bearings[i],
            transition: { duration: LIVING_COMPASS_TIMING.thinking.segmentDuration, ease: LIVING_COMPASS_EASE },
          });
          await sleep(isFinalProbe ? LIVING_COMPASS_TIMING.thinking.finalPauseMs : LIVING_COMPASS_TIMING.thinking.pauseMs);
        }

        if (completeAfterPass) {
          if (!isActive()) return;
          onThinkingCompleteRef.current?.();
          return;
        }
      } while (isActive());
    };

    const runThinking = async () => {
      const hasDirectionalTarget = direction !== undefined || bearing !== undefined;

      if (hasDirectionalTarget) {
        await runThinkingPass(buildThinkingBearings(targetBearing), true);
        return;
      }

      await runThinkingPass(LIVING_COMPASS_TIMING.thinking.bearings, false);
    };

    const runReady = async () => {
      await Promise.all([
        needleControls.start({
          rotate: targetBearing,
          transition: { duration: LIVING_COMPASS_TIMING.ready.settleDuration, ease: LIVING_COMPASS_EASE },
        }),
        breathControls.start({
          scale: 1,
          transition: { duration: LIVING_COMPASS_TIMING.stateTransition, ease: LIVING_COMPASS_EASE },
        }),
      ]);

      if (!isActive()) return;

      void ringControls.start({
        scale: [1, LIVING_COMPASS_TIMING.ready.ringPulseScale, 1],
        transition: { duration: LIVING_COMPASS_TIMING.ready.settleDuration, ease: LIVING_COMPASS_EASE },
      });

      void glowControls.start({
        opacity: [
          LIVING_COMPASS_TIMING.ready.glowOpacityMin,
          LIVING_COMPASS_TIMING.ready.glowOpacityMax,
          LIVING_COMPASS_TIMING.ready.glowOpacityMin * 1.4,
        ],
        transition: {
          duration: LIVING_COMPASS_TIMING.ready.glowDuration,
          repeat: Infinity,
          ease: "easeInOut",
        },
      });
    };

    const runners: Record<LivingCompassState, () => Promise<void>> = {
      idle: runIdle,
      listening: runListening,
      thinking: runThinking,
      ready: runReady,
    };

    void runners[state]();

    return () => {
      runIdRef.current += 1;
    };
  }, [state, direction, bearing, targetBearing, reduceMotion, needleControls, breathControls, glowControls, ringControls]);

  return { needleControls, breathControls, glowControls, ringControls, targetBearing };
}
