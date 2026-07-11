/**
 * EAF Enterprise Engine Registry — foundation only, no engine logic.
 */

import type { EafEngineRegistration } from "@/types/enterprise-asset-framework-engines";
import { getEafPorts } from "./composition";

export function resetEafEngineRegistry(): void {
  getEafPorts().engines.reset();
}

export function listEafEngineRegistrations(): EafEngineRegistration[] {
  return getEafPorts().engines.list();
}

export function findEafEngineRegistration(engineCode: string): EafEngineRegistration | undefined {
  return getEafPorts().engines.find(engineCode);
}

export function registerEafEngine(registration: EafEngineRegistration): void {
  getEafPorts().engines.register(registration);
}

export function listEnabledEafEngines(): EafEngineRegistration[] {
  return listEafEngineRegistrations().filter((e) => e.enabled);
}
