"use client";

import { useMemo } from "react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { selectChanakyaGreeting } from "@/lib/chanakya-greeting-engine";
import type {
  ChanakyaGreetingContext,
  ChanakyaGreetingSelection,
} from "@/types/chanakya-greeting";

const IDLE: ChanakyaGreetingSelection = {
  greetingId: "idle",
  text: "Hi there.",
  moment: "morning",
  context: "generic",
  pattern: "Hi {name}.",
};

/**
 * CF-CHANAKYA-002 — personalized CHANAKYA greeting for UI surfaces.
 */
export function useChanakyaGreeting(options?: {
  context?: ChanakyaGreetingContext;
  surfaceKey?: string;
  forceRefresh?: boolean;
  /** When false, returns a lightweight idle greeting without session writes. */
  enabled?: boolean;
  /** Override when caller already resolved a display name. */
  firstName?: string;
}): ChanakyaGreetingSelection {
  const { user } = useAuthContext();
  const firstName = options?.firstName ?? user?.firstName ?? "there";
  const context = options?.context ?? "generic";
  const surfaceKey = options?.surfaceKey;
  const enabled = options?.enabled ?? true;

  return useMemo(() => {
    if (!enabled) {
      const name = firstName.trim() || "there";
      return {
        ...IDLE,
        text: `Hi ${name}.`,
      };
    }
    return selectChanakyaGreeting({
      firstName,
      context,
      surfaceKey,
    });
  }, [firstName, context, surfaceKey, enabled]);
}
