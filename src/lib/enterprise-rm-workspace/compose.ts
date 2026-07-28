/**
 * CO-BIZ-005 — Compose full RM Workspace snapshot (projection only).
 */

import { deriveRmDailyBriefing } from "./briefing";
import { projectRmCustomerSnapshots } from "./customer-snapshots";
import { resolveRmIdentity, type RmSessionUser } from "./identity";
import { projectRmPipeline } from "./pipeline";
import { deriveRmPriorities } from "./priority";
import { projectRmProductivity } from "./productivity";
import { projectRmQuickActions } from "./quick-actions";
import { projectRmTodayWork } from "./today-work";
import type { RmWorkspaceSnapshot } from "@/types/enterprise-rm-workspace";

export function composeRmWorkspaceSnapshot(user: RmSessionUser): RmWorkspaceSnapshot {
  const identity = resolveRmIdentity(user);
  const today = projectRmTodayWork(identity.assigneeRef);
  const pipeline = projectRmPipeline({
    displayName: identity.displayName,
    userId: identity.userId || undefined,
  });
  const priorities = deriveRmPriorities(today);
  const briefing = deriveRmDailyBriefing({
    assigneeRef: identity.assigneeRef,
    today,
    priorities,
  });
  const customers = projectRmCustomerSnapshots({
    assigneeRef: identity.assigneeRef,
    today,
  });
  const productivity = projectRmProductivity({
    assigneeRef: identity.assigneeRef,
    today,
    pipeline,
  });

  return {
    asOf: new Date().toISOString(),
    identity,
    today,
    pipeline,
    priorities,
    briefing,
    customers,
    productivity,
    quickActions: projectRmQuickActions(),
  };
}
