"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  AMBIENT_DISPLAY_MS,
  AMBIENT_FADE_MS,
  AMBIENT_MESSAGES,
  type AmbientContext,
  pickAmbientMessage,
} from "@/config/ambient-intelligence";

export function useAmbientCycle(context: AmbientContext, enabled = true) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  const poolSize = AMBIENT_MESSAGES[context].length;

  useEffect(() => {
    if (!enabled || reduceMotion) {
      setVisible(false);
      return;
    }

    setIndex(0);
    setVisible(false);

    let fadeInTimer: number;
    let displayTimer: number;
    let fadeOutTimer: number;
    let cycleTimer: number;
    let current = 0;

    const cycle = () => {
      setVisible(false);
      fadeInTimer = window.setTimeout(() => {
        setIndex(current);
        setVisible(true);
        displayTimer = window.setTimeout(() => {
          setVisible(false);
          fadeOutTimer = window.setTimeout(() => {
            current = (current + 1) % poolSize;
            cycleTimer = window.setTimeout(cycle, 400);
          }, AMBIENT_FADE_MS);
        }, AMBIENT_DISPLAY_MS);
      }, AMBIENT_FADE_MS);
    };

    cycle();

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(displayTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(cycleTimer);
    };
  }, [context, enabled, reduceMotion, poolSize]);

  const message = pickAmbientMessage(context, index);

  return { message, visible: reduceMotion ? false : visible };
}
