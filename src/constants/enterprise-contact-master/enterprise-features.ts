/**
 * Enterprise Contact Master feature switches.
 * Wired for future Enterprise Configuration Center (ECG) control.
 */

export interface EcmEnterpriseFeatures {
  /**
   * When false (current certification default), only Resident Indians are supported.
   * Resident Status is system-defaulted and not collected from users.
   * When true, NRI / OCI / Foreign Resident options are exposed on Borrower Workspace.
   */
  residentStatusVariantsEnabled: boolean;
}

const DEFAULT_FEATURES: EcmEnterpriseFeatures = {
  residentStatusVariantsEnabled: false,
};

let features: EcmEnterpriseFeatures = { ...DEFAULT_FEATURES };

export function getEcmEnterpriseFeatures(): EcmEnterpriseFeatures {
  return { ...features };
}

/** Intended for Enterprise Configuration Center / tests — not user-facing UI yet. */
export function setEcmEnterpriseFeatures(patch: Partial<EcmEnterpriseFeatures>): EcmEnterpriseFeatures {
  features = { ...features, ...patch };
  return getEcmEnterpriseFeatures();
}

export function isEcmResidentStatusVariantsEnabled(): boolean {
  return getEcmEnterpriseFeatures().residentStatusVariantsEnabled;
}

/** System default while Resident Indian–only mode is active (CF-CON-041). */
export const ECM_DEFAULT_RESIDENT_STATUS_ID = "resident";
