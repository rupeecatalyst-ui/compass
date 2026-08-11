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
  limit?: number;
}): Promise<number> {
  const items = await listEnterpriseActivity({
    opportunityId: input?.opportunityId,
    dealId: input?.dealId,
    contactId: input?.contactId,
    limit: input?.limit ?? 100,
  });
  const ports = getEdcPorts();
  let n = 0;
  for (const event of items) {
    const entry = mapEarEventToEdcEntry(event);
    ports.timeline.save(entry);
    n += 1;
  }
  return n;
}
