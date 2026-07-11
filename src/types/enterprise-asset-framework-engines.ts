/**
 * EAF Sprint 1A — Enterprise Engine Registry types (foundation only).
 */

import type { EafCapabilityCode } from "./enterprise-asset-framework-capabilities";

export type EafEngineCode = string;

/** Engine registration — metadata only; no engine logic. */
export interface EafEngineRegistration {
  engineCode: EafEngineCode;
  displayName: string;
  description: string;
  version: string;
  providedCapabilities: EafCapabilityCode[];
  enabled: boolean;
  sortOrder: number;
}
