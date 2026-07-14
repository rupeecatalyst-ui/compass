/**
 * CF-CHANAKYA-002 — ECG bridge for Greeting Library configuration.
 * ECG domain/engine key: `chanakya`.
 */

import { createEcgEngineConfigAdapter } from "@/lib/enterprise-interface-configuration-grants";
import type { ChanakyaGreetingEngineConfig } from "@/types/chanakya-greeting";
import {
  configureChanakyaGreetingEngine,
  getChanakyaGreetingEngineConfig,
} from "./config";

/** Snapshot published into ECG configuration payloads. */
export function buildChanakyaGreetingEcgPayload(): {
  greetingEngine: ChanakyaGreetingEngineConfig;
  libraryVersion: string;
} {
  return {
    greetingEngine: getChanakyaGreetingEngineConfig(),
    libraryVersion: "1.0.0-cf-chanakya-002",
  };
}

/**
 * Apply published ECG greeting settings when available.
 * Safe no-op when ECG has not published chanakya greeting config yet.
 */
export function syncChanakyaGreetingEngineFromEcg(): {
  applied: boolean;
  source: "ecg" | "local_default";
} {
  try {
    const published = createEcgEngineConfigAdapter("chanakya").readPublishedConfig() as {
      greetingEngine?: Partial<ChanakyaGreetingEngineConfig>;
    } | null;
    if (published?.greetingEngine) {
      configureChanakyaGreetingEngine(published.greetingEngine);
      return { applied: true, source: "ecg" };
    }
  } catch {
    // ECG uninitialised or engine not published.
  }
  return { applied: false, source: "local_default" };
}
