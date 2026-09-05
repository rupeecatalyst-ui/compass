/**
 * CO-MARKETING-REDESIGN-009 — Separate permissions for edit / approve / schedule / run / pause / stop / retry.
 * Save / create never grants approve, schedule, run, stop, or retry.
 */

import type { MarketingCampaignAction } from "@/constants/enterprise-marketing-engine/lifecycle";
import {
  MARKETING_PERMISSIONS,
  type MarketingPermission,
} from "@/constants/enterprise-marketing-engine/permissions";
import {
  assertMarketingPermission,
  hasMarketingPermission,
  type MarketingPermissionActor,
} from "@/lib/enterprise-marketing-engine/permissions";

export const MARKETING_OPERATION_PERMISSIONS = {
  edit: MARKETING_PERMISSIONS.CAMPAIGN_CREATE,
  submit: MARKETING_PERMISSIONS.CAMPAIGN_SUBMIT,
  approve: MARKETING_PERMISSIONS.CAMPAIGN_APPROVE,
  schedule: MARKETING_PERMISSIONS.CAMPAIGN_SCHEDULE,
  run: MARKETING_PERMISSIONS.CAMPAIGN_RUN,
  pause: MARKETING_PERMISSIONS.CAMPAIGN_PAUSE,
  stop: MARKETING_PERMISSIONS.CAMPAIGN_STOP,
  retry: MARKETING_PERMISSIONS.CAMPAIGN_RETRY,
} as const;

export type MarketingSeparatedOperation = keyof typeof MARKETING_OPERATION_PERMISSIONS;

export function permissionForMarketingOperation(
  operation: MarketingSeparatedOperation,
): MarketingPermission {
  return MARKETING_OPERATION_PERMISSIONS[operation];
}

export function permissionForMarketingLifecycleAction(
  action: MarketingCampaignAction,
): MarketingPermission {
  switch (action) {
    case "SUBMIT_FOR_REVIEW":
      return MARKETING_OPERATION_PERMISSIONS.submit;
    case "APPROVE":
      return MARKETING_OPERATION_PERMISSIONS.approve;
    case "SCHEDULE":
      return MARKETING_OPERATION_PERMISSIONS.schedule;
    case "RUN":
      return MARKETING_OPERATION_PERMISSIONS.run;
    case "PAUSE":
    case "RESUME":
      return MARKETING_OPERATION_PERMISSIONS.pause;
    case "STOP":
      return MARKETING_OPERATION_PERMISSIONS.stop;
    default:
      return MARKETING_OPERATION_PERMISSIONS.edit;
  }
}

export function hasMarketingOperationPermission(
  actor: MarketingPermissionActor,
  operation: MarketingSeparatedOperation,
): boolean {
  return hasMarketingPermission(actor, permissionForMarketingOperation(operation));
}

export function assertMarketingOperationPermission(
  actor: MarketingPermissionActor,
  operation: MarketingSeparatedOperation,
): void {
  assertMarketingPermission(actor, permissionForMarketingOperation(operation));
}

export function marketingPermissionsAreSeparated(): boolean {
  const values = Object.values(MARKETING_OPERATION_PERMISSIONS);
  return new Set(values).size === values.length;
}
