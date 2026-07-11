/**
 * EEIE replay manager — event replay with eligibility validation.
 */

import type { EeieEventEnvelope, EeieEventReplay } from "@/types/enterprise-event-integration-engine";
import { recordEeieEventAudit } from "./audit-integration";
import { getEeiePorts } from "./composition";
import { routeEeieEnvelope } from "./event-bus";
import { validateEeieReplayEligibility, validateEeieSubscriber } from "./validation-engine";

export function replayEeieEvent(input: {
  sourceEnvelopeId: string;
  actorId: string;
  targetSubscriberId?: string;
  replayCode?: string;
}): EeieEventReplay {
  const source = getEeiePorts().envelopes.findById(input.sourceEnvelopeId);
  if (!source) {
    throw new Error(`EEIE: envelope "${input.sourceEnvelopeId}" not found.`);
  }

  validateEeieReplayEligibility(source);

  if (input.targetSubscriberId) {
    validateEeieSubscriber(input.targetSubscriberId);
  }

  const replay: EeieEventReplay = {
    id: crypto.randomUUID(),
    replayCode: input.replayCode ?? `REPLAY-${source.eventCode}-${Date.now()}`,
    sourceEnvelopeId: source.id,
    targetSubscriberId: input.targetSubscriberId,
    status: "running",
    createdBy: input.actorId,
    createdOn: new Date().toISOString(),
  };

  getEeiePorts().replays.save(replay);

  try {
    const replayedEnvelope: EeieEventEnvelope = {
      ...source,
      id: crypto.randomUUID(),
      publishedOn: new Date().toISOString(),
      publishedBy: input.actorId,
      replayed: true,
      originalEnvelopeId: source.id,
      causationId: source.id,
      correlationId: source.correlationId,
    };

    getEeiePorts().envelopes.append(replayedEnvelope);
    routeEeieEnvelope(replayedEnvelope);

    const completed: EeieEventReplay = {
      ...replay,
      status: "completed",
      replayedEnvelopeId: replayedEnvelope.id,
      completedOn: new Date().toISOString(),
    };

    getEeiePorts().replays.save(completed);

    recordEeieEventAudit({
      entityId: completed.id,
      entityType: "replay",
      action: "replayed",
      actorId: input.actorId,
      remarks: `Replayed envelope ${source.id}`,
    });

    return completed;
  } catch (err) {
    const failed: EeieEventReplay = {
      ...replay,
      status: "failed",
      failureReason: err instanceof Error ? err.message : String(err),
      completedOn: new Date().toISOString(),
    };
    getEeiePorts().replays.save(failed);
    throw err;
  }
}

export function listEeieReplays(): EeieEventReplay[] {
  return getEeiePorts().replays.list();
}
