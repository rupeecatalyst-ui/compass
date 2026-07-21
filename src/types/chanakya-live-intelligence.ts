/**
 * EUX-007 — CHANAKYA Live Intelligence Header
 * Shared message contract for the enterprise header ticker.
 */

export type ChanakyaLiveIntelligenceTone =
  | "danger"
  | "warning"
  | "success"
  | "info"
  | "default";

export interface ChanakyaLiveIntelligenceMessage {
  id: string;
  text: string;
  tone: ChanakyaLiveIntelligenceTone;
}

/** Workspace contexts that supply contextual operational intelligence. */
export type ChanakyaLiveIntelligenceWorkspace =
  | "mission_control"
  | "radar"
  | "contacts"
  | "opportunities"
  | "loan_files"
  | "documents"
  | "tasks"
  | "lenders"
  | "accounting"
  | "horizon"
  | "my_deals"
  | "default";
