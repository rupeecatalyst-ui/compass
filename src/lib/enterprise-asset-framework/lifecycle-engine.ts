/**
 * EAF lifecycle engine — configuration-driven transitions.
 */

import {
  canTransitionEafLifecycle,
  getEafLifecycleTransitionsFrom,
  isEafLifecycleTerminal,
} from "@/constants/enterprise-asset-framework";
import type {
  EafBaseAsset,
  EafLifecycleDefinition,
  EafLifecycleStateCode,
} from "@/types/enterprise-asset-framework";
import { appendEafAuditEntry } from "./audit-engine";
import { getEafEventPublisher } from "./composition";

export function transitionEafLifecycle(input: {
  asset: EafBaseAsset;
  lifecycle: EafLifecycleDefinition;
  toState: EafLifecycleStateCode;
  actorId: string;
  remarks?: string;
}): { asset: EafBaseAsset; allowed: boolean } {
  const { asset, lifecycle, toState, actorId, remarks } = input;
  const fromState = asset.lifecycleState;

  if (!canTransitionEafLifecycle(lifecycle, fromState, toState)) {
    return { asset, allowed: false };
  }

  const terminal = isEafLifecycleTerminal(lifecycle, toState);
  const stateDef = lifecycle.states.find((s) => s.stateCode === toState);

  const updated: EafBaseAsset = {
    ...asset,
    lifecycleState: toState,
    activeFlag: stateDef?.allowsOperationalActive ?? asset.activeFlag,
    archiveFlag: terminal ? true : asset.archiveFlag,
    modifiedBy: actorId,
    modifiedOn: new Date().toISOString(),
    remarks: remarks ?? asset.remarks,
  };

  appendEafAuditEntry({
    assetId: asset.id,
    action: terminal ? "archived" : "lifecycle_changed",
    actorId,
    previousStateRef: fromState,
    newStateRef: toState,
    remarks,
  });

  getEafEventPublisher().publish({
    eventId: crypto.randomUUID(),
    eventType: "asset.lifecycle_changed",
    timestamp: updated.modifiedOn,
    actorId,
    assetId: asset.id,
    fromState,
    toState,
    asset: updated,
  });

  return { asset: updated, allowed: true };
}

export function getAllowedEafLifecycleTargets(
  lifecycle: EafLifecycleDefinition,
  currentState: EafLifecycleStateCode,
): EafLifecycleStateCode[] {
  return getEafLifecycleTransitionsFrom(lifecycle, currentState).map((t) => t.toStateCode);
}
