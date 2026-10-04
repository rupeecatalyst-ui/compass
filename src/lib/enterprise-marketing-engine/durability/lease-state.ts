/**
 * CO-MARKETING-REDESIGN-001 — Worker lease pause/resume/stop validation.
 */

import type { MarketingLeasePauseState } from "@/types/enterprise-marketing-durability";
import { MARKETING_LEASE_PAUSE_STATES } from "@/types/enterprise-marketing-durability";

const LEGAL_LEASE_TRANSITIONS: Record<
  MarketingLeasePauseState,
  readonly MarketingLeasePauseState[]
> = {
  ACTIVE: ["PAUSED", "STOPPED"],
  PAUSED: ["ACTIVE", "STOPPED"],
  STOPPED: [],
};

export function assertMarketingLeasePauseState(
  value: string,
): asserts value is MarketingLeasePauseState {
  if (!(MARKETING_LEASE_PAUSE_STATES as readonly string[]).includes(value)) {
    throw Object.assign(new Error(`Unknown lease pause state: ${value}`), {
      statusCode: 400,
      code: "INVALID_LEASE_PAUSE_STATE",
    });
  }
}

export function assertMarketingLeasePauseTransition(
  from: MarketingLeasePauseState,
  to: MarketingLeasePauseState,
): void {
  if (from === to) return;
  if (!LEGAL_LEASE_TRANSITIONS[from].includes(to)) {
    throw Object.assign(
      new Error(`Illegal lease pause transition: ${from} → ${to}`),
      { statusCode: 400, code: "ILLEGAL_LEASE_PAUSE_TRANSITION" },
    );
  }
}
