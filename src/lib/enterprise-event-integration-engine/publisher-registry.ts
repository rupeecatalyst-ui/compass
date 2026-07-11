/**
 * EEIE publisher registry.
 */

import type { EeieEventPublisher } from "@/types/enterprise-event-integration-engine";
import { recordEeieEventAudit } from "./audit-integration";
import { getEeiePorts } from "./composition";

type CreatePublisherInput = Omit<EeieEventPublisher, "id" | "createdOn" | "enabled"> &
  Partial<Pick<EeieEventPublisher, "enabled">>;

export function registerEeiePublisher(input: CreatePublisherInput): EeieEventPublisher {
  const duplicate = getEeiePorts().publishers.findByCode(input.publisherCode);
  if (duplicate) {
    throw new Error(`EEIE: publisher code "${input.publisherCode}" already exists.`);
  }

  const publisher: EeieEventPublisher = {
    id: crypto.randomUUID(),
    publisherCode: input.publisherCode,
    publisherName: input.publisherName,
    description: input.description,
    engineRef: input.engineRef,
    enabled: input.enabled ?? true,
    createdBy: input.createdBy,
    createdOn: new Date().toISOString(),
  };

  getEeiePorts().publishers.save(publisher);
  recordEeieEventAudit({
    entityId: publisher.id,
    entityType: "publisher",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered publisher ${publisher.publisherCode}`,
  });

  return publisher;
}

export function getEeiePublisherById(id: string): EeieEventPublisher | undefined {
  return getEeiePorts().publishers.findById(id);
}

export function listEeiePublishers(): EeieEventPublisher[] {
  return getEeiePorts().publishers.list();
}
