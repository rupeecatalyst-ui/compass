/**
 * CF-CHANAKYA-008 — UGJ registry snapshot.
 */

import {
  UGJ_ENTERPRISE_PRINCIPLE,
  UGJ_FRAMEWORK_VERSION,
  getEnabledUgjJourneys,
} from "@/constants/universal-guided-journey";
import type { UgjRegistrySnapshot } from "@/types/universal-guided-journey";

export function getUgjFrameworkVersion(): string {
  return UGJ_FRAMEWORK_VERSION;
}

export function getUgjRegistrySnapshot(): UgjRegistrySnapshot {
  const journeys = getEnabledUgjJourneys();
  return {
    frameworkVersion: UGJ_FRAMEWORK_VERSION,
    journeyCount: journeys.length,
    referenceJourney: "contact_creation",
    journeys,
    principle: UGJ_ENTERPRISE_PRINCIPLE,
  };
}
