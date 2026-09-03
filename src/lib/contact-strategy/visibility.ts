/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * Contact Strategy visibility = existing Role ∪ Hierarchy ∪ assignment SSOT.
 */

import {
  actorCanSeeCase,
  hasOrgWideCaseVisibility,
  type CaseVisibilityActor,
} from "@/lib/enterprise-case-visibility";

export function contactStrategyActorMaySee(input: {
  actor: CaseVisibilityActor;
  downlineUserIds?: string[] | null;
  ownerId?: string | null;
  ownerName?: string | null;
  assignedUserIds?: string[] | null;
}): boolean {
  if (hasOrgWideCaseVisibility(input.actor.role)) return true;
  return actorCanSeeCase(
    input.actor,
    {
      primaryOwnerUserId: input.ownerId,
      relationshipManagerUserId: input.ownerId,
      relationshipManagerName: input.ownerName,
      assignedUserIds: input.assignedUserIds ?? (input.ownerId ? [input.ownerId] : []),
    },
    {
      scope: "my_team",
      downlineUserIds:
        input.downlineUserIds ?? (input.actor.userId ? [input.actor.userId] : []),
    },
  );
}
