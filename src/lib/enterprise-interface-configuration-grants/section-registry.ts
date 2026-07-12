/**
 * ECG section registry — framework definitions only.
 */

import type { EcgSectionDefinition } from "@/types/enterprise-interface-configuration-grants";
import { recordEcgAudit } from "./audit-integration";
import { getEcgPorts } from "./composition";

export function registerEcgSection(
  input: Omit<EcgSectionDefinition, "id" | "createdOn">,
): EcgSectionDefinition {
  const section: EcgSectionDefinition = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };
  getEcgPorts().sections.save(section);
  recordEcgAudit({
    entityId: section.id,
    entityType: "section",
    action: "created",
    actorId: input.createdBy,
    remarks: `ECG section ${section.sectionCode} (${section.kind})`,
  });
  return section;
}

export function listEcgSections(): EcgSectionDefinition[] {
  return getEcgPorts().sections.list();
}
