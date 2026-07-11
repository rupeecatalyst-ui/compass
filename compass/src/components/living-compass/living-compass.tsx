"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LIVING_COMPASS_DIRECTION_LABELS,
  LIVING_COMPASS_EASE,
  LIVING_COMPASS_SIZE,
  LIVING_COMPASS_STATE_LABELS,
  LIVING_COMPASS_TIMING,
} from "./living-compass.constants";
import { LivingCompassNeedle, LivingCompassSvg } from "./living-compass-svg";
import type { LivingCompassProps } from "./living-compass.types";
import { useLivingCompassAnimation } from "./use-living-compass-animation";

/**
 * Living Compass — SARATHI advisory journey indicator.
 *
 * A calm, intelligent presence — not a logo, not a loader.
 * States choreograph needle, breath, and glow to reflect advisory posture.
 */
export function LivingCompass({
  state = "idle",
  direction,
  bearing,
  size = LIVING_COMPASS_SIZE.default,
  className,
  "aria-label": ariaLabel,
  onThinkingComplete,
}: LivingCompassProps) {
  const instanceId = useId().replace(/:/g, "");
  const glowFilterId = `${instanceId}-needle-glow`;
  const clampedSize = Math.min(LIVING_COMPASS_SIZE.max, Math.max(LIVING_COMPASS_SIZE.min, size));

  const { needleControls, breathControls, glowControls, ringControls } = useLivingCompassAnimation({
    state,
    direction,
    bearing,
    onThinkingComplete,
  });

  const directionLabel = direction ? ` — ${LIVING_COMPASS_DIRECTION_LABELS[direction]}` : "";
  const label = ariaLabel ?? `Advisory compass — ${LIVING_COMPASS_STATE_LABELS[state]}${directionLabel}`;

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: clampedSize, height: clampedSize }}
      role="img"
      aria-label={label}
      aria-live="polite"
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-full bg-primary/20 blur-xl"
        animate={glowControls}
        initial={{ opacity: 0.08 }}
      />

      <motion.div
        className="relative h-full w-full"
        animate={breathControls}
        initial={{ scale: 1 }}
        style={{ transformOrigin: "50% 50%" }}
      >
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/15 bg-white/[0.03] shadow-[0_0_24px_-8px_var(--glow)] backdrop-blur-sm"
          animate={ringControls}
          initial={{ scale: 1 }}
          style={{ transformOrigin: "50% 50%" }}
        />

        <div className="absolute inset-[6%]">
          <LivingCompassSvg instanceId={instanceId} />
        </div>

        <motion.div
          className="absolute inset-[6%]"
          animate={needleControls}
          initial={{ rotate: 0 }}
          style={{ transformOrigin: "50% 50%" }}
          transition={{ duration: LIVING_COMPASS_TIMING.stateTransition, ease: LIVING_COMPASS_EASE }}
        >
          <svg viewBox="0 0 80 80" fill="none" className="h-full w-full" aria-hidden>
            <defs>
              <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <LivingCompassNeedle filterGlow={state === "ready"} glowFilterId={glowFilterId} />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}
