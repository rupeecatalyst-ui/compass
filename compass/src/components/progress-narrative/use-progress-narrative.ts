"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LivingCompassState } from "@/components/living-compass";
import {
  PROGRESS_NARRATIVE_FLOWS,
  type ProgressNarrativeFlowId,
} from "@/config/progress-narrative";
import type { ProgressNarrativeStep } from "./progress-narrative.types";

type UseProgressNarrativeOptions = {
  onComplete?: () => void;
};

function resolveCompassState(activeIndex: number, isComplete: boolean): LivingCompassState {
  if (isComplete) return "ready";
  if (activeIndex === 0) return "listening";
  return "thinking";
}

function buildSteps(
  flowId: ProgressNarrativeFlowId | null,
  activeIndex: number,
  isComplete: boolean,
): ProgressNarrativeStep[] {
  if (!flowId) return [];
  const flow = PROGRESS_NARRATIVE_FLOWS[flowId];
  return flow.steps.map((step, index) => {
    let status: ProgressNarrativeStep["status"] = "pending";
    if (isComplete) status = "completed";
    else if (index < activeIndex) status = "completed";
    else if (index === activeIndex) status = "active";
    return { id: step.id, label: step.label, status };
  });
}

export function useProgressNarrative({ onComplete }: UseProgressNarrativeOptions = {}) {
  const [flowId, setFlowId] = useState<ProgressNarrativeFlowId | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const flow = flowId ? PROGRESS_NARRATIVE_FLOWS[flowId] : null;

  const steps = useMemo(
    () => buildSteps(flowId, activeIndex, isComplete),
    [flowId, activeIndex, isComplete],
  );

  const activeMessage = useMemo(() => {
    if (!flow) return "Select a journey to begin";
    if (isComplete) return flow.steps[flow.steps.length - 1]?.label ?? flow.headline;
    return flow.steps[activeIndex]?.label ?? flow.headline;
  }, [flow, activeIndex, isComplete]);

  const compassState = useMemo(
    () => resolveCompassState(activeIndex, isComplete),
    [activeIndex, isComplete],
  );

  const start = useCallback((nextFlowId: ProgressNarrativeFlowId) => {
    setFlowId(nextFlowId);
    setActiveIndex(0);
    setIsComplete(false);
    setIsRunning(true);
  }, []);

  const reset = useCallback(() => {
    setFlowId(null);
    setActiveIndex(0);
    setIsComplete(false);
    setIsRunning(false);
  }, []);

  useEffect(() => {
    if (!isRunning || !flow || isComplete) return;

    const intervalMs = flow.stepIntervalMs;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        if (current >= flow.steps.length - 1) {
          setIsComplete(true);
          setIsRunning(false);
          onCompleteRef.current?.();
          return current;
        }
        return current + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isRunning, flow, isComplete]);

  return {
    flowId,
    flow,
    steps,
    headline: flow?.headline ?? "SARATHI Advisory",
    activeMessage,
    activeIndex,
    isComplete,
    isRunning,
    compassState,
    direction: flow?.direction,
    start,
    reset,
  };
}
