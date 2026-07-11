/**
 * EOLE ownership registry — source owner and assignment management.
 */

import { EOLE_OWNER_TYPES } from "@/constants/enterprise-opportunity-lifecycle-engine";
import type { EoleOpportunityAssignment, EoleOpportunityOwner } from "@/types/enterprise-opportunity-lifecycle-engine";
import { recordEoleAudit } from "./audit-integration";
import { getEolePorts } from "./composition";
import { appendEoleTimelineEntry } from "./timeline-registry";
import { validateEoleAssignment, validateEoleOwner } from "./validation-engine";

export function assignEoleSourceOwner(input: {
  opportunityId: string;
  ownerRef: string;
  assignedBy: string;
}): EoleOpportunityOwner {
  const existing = getEolePorts().owners.findSourceOwner(input.opportunityId);
  if (existing) {
    throw new Error("EOLE: Source owner is immutable and cannot be changed.");
  }

  const owner: EoleOpportunityOwner = {
    id: crypto.randomUUID(),
    opportunityId: input.opportunityId,
    ownerRef: input.ownerRef,
    ownerType: EOLE_OWNER_TYPES.SOURCE_OWNER,
    isSourceOwner: true,
    immutable: true,
    enabled: true,
    assignedBy: input.assignedBy,
    assignedOn: new Date().toISOString(),
  };

  const validation = validateEoleOwner(owner, getEolePorts().owners.list());
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEolePorts().owners.save(owner);
  recordEoleAudit({
    entityId: owner.id,
    entityType: "owner",
    action: "assigned",
    actorId: input.assignedBy,
    remarks: `Source owner ${owner.ownerRef} assigned`,
  });
  appendEoleTimelineEntry({
    opportunityId: input.opportunityId,
    eventType: "assignment",
    title: "Source Owner Assigned",
    description: `Source owner ${owner.ownerRef} assigned (immutable)`,
    actorId: input.assignedBy,
  });

  return owner;
}

export function registerEoleOpportunityOwner(
  input: Omit<EoleOpportunityOwner, "id" | "immutable" | "enabled" | "assignedOn"> & { isSourceOwner?: boolean },
): EoleOpportunityOwner {
  if (input.isSourceOwner) {
    return assignEoleSourceOwner({
      opportunityId: input.opportunityId,
      ownerRef: input.ownerRef,
      assignedBy: input.assignedBy,
    });
  }

  const owner: EoleOpportunityOwner = {
    ...input,
    id: crypto.randomUUID(),
    isSourceOwner: false,
    immutable: false,
    enabled: true,
    assignedOn: new Date().toISOString(),
  };

  const validation = validateEoleOwner(owner, getEolePorts().owners.list());
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEolePorts().owners.save(owner);
  recordEoleAudit({
    entityId: owner.id,
    entityType: "owner",
    action: "assigned",
    actorId: input.assignedBy,
    remarks: `Owner ${owner.ownerRef} assigned`,
  });

  return owner;
}

export function registerEoleOpportunityAssignment(
  input: Omit<EoleOpportunityAssignment, "id" | "enabled" | "assignedOn">,
): EoleOpportunityAssignment {
  const assignment: EoleOpportunityAssignment = {
    ...input,
    id: crypto.randomUUID(),
    enabled: true,
    assignedOn: new Date().toISOString(),
  };

  const validation = validateEoleAssignment(assignment, getEolePorts().assignments.list());
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEolePorts().assignments.save(assignment);
  recordEoleAudit({
    entityId: assignment.id,
    entityType: "assignment",
    action: "assigned",
    actorId: input.assignedBy,
    remarks: `Assignment ${assignment.assignmentCode} to ${assignment.assigneeRef}`,
  });
  appendEoleTimelineEntry({
    opportunityId: input.opportunityId,
    eventType: "assignment",
    title: "Assignment Registered",
    description: `${assignment.assigneeType} ${assignment.assigneeRef} assigned`,
    actorId: input.assignedBy,
  });

  return assignment;
}

export function getEoleSourceOwner(opportunityId: string): EoleOpportunityOwner | undefined {
  return getEolePorts().owners.findSourceOwner(opportunityId);
}
