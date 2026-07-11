/**
 * EIAE persona registry.
 */

import type { EiaePersonaDefinition } from "@/types/enterprise-identity-access-engine";
import { getEiaePorts } from "./composition";

export function listEiaePersonas(): EiaePersonaDefinition[] {
  return getEiaePorts()
    .personas.list()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEiaePersona(personaCode: string): EiaePersonaDefinition | undefined {
  return getEiaePorts().personas.findByCode(personaCode);
}

export function registerEiaePersona(persona: EiaePersonaDefinition): void {
  const duplicate = getEiaePorts()
    .personas.list()
    .find((p) => p.personaCode === persona.personaCode && p.id !== persona.id);
  if (duplicate) {
    throw new Error(`EIAE: persona code "${persona.personaCode}" is already registered.`);
  }
  getEiaePorts().personas.save(persona);
}
