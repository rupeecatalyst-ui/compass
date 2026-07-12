/**
 * ECG engine config adapters — architecture only.
 * Engines may call readPublishedConfig(); until migration, returns null and engines keep local defaults.
 */

import type {
  EcgEngineConfigAdapter,
  EcgEngineKey,
} from "@/types/enterprise-interface-configuration-grants";
import { getEcgPorts } from "./composition";

export function createEcgEngineConfigAdapter(engineKey: EcgEngineKey): EcgEngineConfigAdapter {
  return {
    engineKey,
    isReady: true,
    readPublishedConfig() {
      const registration = getEcgPorts().engines.findByKey(engineKey);
      if (!registration) return null;
      const published = getEcgPorts().packages.findPublished(registration.domainKey);
      if (!published) return null;
      // Architecture: payload ready for future migration — engines must not switch yet.
      if (published.payload?.placeholder === true) return null;
      return { ...published.payload };
    },
    readDraftConfig() {
      const registration = getEcgPorts().engines.findByKey(engineKey);
      if (!registration) return null;
      const draft = getEcgPorts().packages.findDraft(registration.domainKey);
      if (!draft) return null;
      if (draft.payload?.placeholder === true) return null;
      return { ...draft.payload };
    },
    getRegistration() {
      return getEcgPorts().engines.findByKey(engineKey);
    },
  };
}

/** Convenience map for known engines — plug-in point for future auto-registration. */
export function getEcgEngineAdapters(): Record<EcgEngineKey, EcgEngineConfigAdapter> {
  const keys = getEcgPorts().engines.list().map((e) => e.engineKey);
  const map = {} as Record<EcgEngineKey, EcgEngineConfigAdapter>;
  for (const key of keys) {
    map[key] = createEcgEngineConfigAdapter(key);
  }
  return map;
}
