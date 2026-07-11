/**
 * EIAE session foundation — metadata only.
 */

import type {
  EiaeDeviceMetadata,
  EiaeLoginHistoryRecord,
  EiaeMfaMetadataPlaceholder,
  EiaeSessionMetadata,
} from "@/types/enterprise-identity-access-engine";
import { getEiaePorts } from "./composition";

export function listEiaeSessionMetadata(): EiaeSessionMetadata[] {
  return getEiaePorts().sessions.listSessions();
}

export function registerEiaeSessionMetadata(session: EiaeSessionMetadata): void {
  getEiaePorts().sessions.saveSession(session);
}

export function listEiaeDeviceMetadata(): EiaeDeviceMetadata[] {
  return getEiaePorts().sessions.listDevices();
}

export function registerEiaeDeviceMetadata(device: EiaeDeviceMetadata): void {
  getEiaePorts().sessions.saveDevice(device);
}

export function listEiaeLoginHistory(): EiaeLoginHistoryRecord[] {
  return getEiaePorts().sessions.listLoginHistory();
}

export function appendEiaeLoginHistory(record: EiaeLoginHistoryRecord): void {
  getEiaePorts().sessions.appendLoginHistory(record);
}

export function listEiaeMfaPlaceholders(): EiaeMfaMetadataPlaceholder[] {
  return getEiaePorts().sessions.listMfaPlaceholders();
}
