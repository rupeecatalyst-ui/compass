/**
 * CF-CHANAKYA-002 — ECG-ready Greeting Engine configuration.
 */

import type { ChanakyaGreetingEngineConfig } from "@/types/chanakya-greeting";

export const DEFAULT_CHANAKYA_GREETING_ENGINE_CONFIG: ChanakyaGreetingEngineConfig = {
  enabled: true,
  timeAware: true,
  sessionAware: true,
  disabledGreetingIds: [],
  preferredTones: ["mentor", "professional", "warm"],
  fallbackPattern: "Hi {name}.",
};

let activeConfig: ChanakyaGreetingEngineConfig = {
  ...DEFAULT_CHANAKYA_GREETING_ENGINE_CONFIG,
  preferredTones: [...DEFAULT_CHANAKYA_GREETING_ENGINE_CONFIG.preferredTones],
  disabledGreetingIds: [],
};

/** Enterprise Configuration Center may call this to publish greeting behaviour. */
export function getChanakyaGreetingEngineConfig(): ChanakyaGreetingEngineConfig {
  return {
    ...activeConfig,
    preferredTones: [...activeConfig.preferredTones],
    disabledGreetingIds: [...activeConfig.disabledGreetingIds],
  };
}

export function configureChanakyaGreetingEngine(
  patch: Partial<ChanakyaGreetingEngineConfig>,
): ChanakyaGreetingEngineConfig {
  activeConfig = {
    ...activeConfig,
    ...patch,
    preferredTones: patch.preferredTones
      ? [...patch.preferredTones]
      : [...activeConfig.preferredTones],
    disabledGreetingIds: patch.disabledGreetingIds
      ? [...patch.disabledGreetingIds]
      : [...activeConfig.disabledGreetingIds],
  };
  return getChanakyaGreetingEngineConfig();
}

export function resetChanakyaGreetingEngineConfig(): void {
  activeConfig = {
    ...DEFAULT_CHANAKYA_GREETING_ENGINE_CONFIG,
    preferredTones: [...DEFAULT_CHANAKYA_GREETING_ENGINE_CONFIG.preferredTones],
    disabledGreetingIds: [],
  };
}
