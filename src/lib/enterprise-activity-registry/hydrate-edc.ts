/**
 * CO-ORG-003 — Hydrate EDC in-memory projection from EAR (readers stay on EDC API shape).
 */

import { listEnterpriseActivity } from "@/lib/enterprise-activity-registry/api-client";
import { mapEarEventToEdcEntry } from "@/lib/enterprise-activity-registry/map-edc";
import { getEdcPorts } from "@/lib/enterprise-dialogue-center/composition";

export async function hydrateEdcFromEar(input?: {
  opportunityId?: string;
  dealId?: string;
  contactId?: string;
  eventKind?: string;
  since?: string;
  limit?: number;
}): Promise<number> {
  const items = await listEnterpriseActivity({
    opportunityId: input?.opportunityId,
    dealId: input?.dealId,
    contactId: input?.contactId,
    eventKind: input?.eventKind,
    since: input?.since,
    limit: input?.limit ?? 100,
  });
  const ports = getEdcPorts();
  const mapped = items.map(mapEarEventToEdcEntry);
  ports.timeline.replaceAll(mapped);
  return mapped.length;
}
