/**
 * EIAE deletion governance and session foundation constants.
 */

import { EIAE_PERSONA_CODES } from "./personas";
import type {
  EiaeDeletionGovernancePermission,
  EiaeMfaMetadataPlaceholder,
} from "@/types/enterprise-identity-access-engine";

export const EIAE_DELETION_PERMISSION_CODES = {
  MOVE_TO_RECYCLE_BIN: "move_to_recycle_bin",
  RESTORE_FROM_RECYCLE_BIN: "restore_from_recycle_bin",
  PERMANENT_PURGE: "permanent_purge",
} as const;

export const EIAE_DEFAULT_DELETION_GOVERNANCE: EiaeDeletionGovernancePermission[] = [
  {
    id: "eiae-del-move",
    permissionCode: "move_to_recycle_bin",
    label: "Move to Recycle Bin",
    description: "Soft-delete records to recycle bin. Users may perform this action.",
    authorizedPersonaCodes: [
      EIAE_PERSONA_CODES.SUPER_ADMIN,
      EIAE_PERSONA_CODES.MANAGEMENT,
      EIAE_PERSONA_CODES.EMPLOYEE,
      EIAE_PERSONA_CODES.BRANCH_MANAGER,
    ],
    enabled: true,
  },
  {
    id: "eiae-del-restore",
    permissionCode: "restore_from_recycle_bin",
    label: "Restore from Recycle Bin",
    description: "Restore soft-deleted records from recycle bin.",
    authorizedPersonaCodes: [
      EIAE_PERSONA_CODES.SUPER_ADMIN,
      EIAE_PERSONA_CODES.MANAGEMENT,
      EIAE_PERSONA_CODES.BRANCH_MANAGER,
    ],
    enabled: true,
  },
  {
    id: "eiae-del-purge",
    permissionCode: "permanent_purge",
    label: "Permanent Purge",
    description: "Permanently purge records. Super Admin only — governed operation.",
    authorizedPersonaCodes: [EIAE_PERSONA_CODES.SUPER_ADMIN],
    enabled: true,
  },
];

export const EIAE_DEFAULT_MFA_PLACEHOLDERS: EiaeMfaMetadataPlaceholder[] = [
  { id: "eiae-mfa-totp", mfaMethodCode: "totp", label: "TOTP", description: "Time-based one-time password — future sprint.", enabled: false },
  { id: "eiae-mfa-sms", mfaMethodCode: "sms_otp", label: "SMS OTP", description: "SMS-based OTP — future sprint.", enabled: false },
  { id: "eiae-mfa-biometric", mfaMethodCode: "biometric", label: "Biometric", description: "Biometric verification — future sprint.", enabled: false },
];

/** Sprint 3A hardening release — immutable Enterprise Identity ID governance. */
export const EIAE_FRAMEWORK_HARDENING_VERSION = "3.1.0";

export const EIAE_FRAMEWORK_VERSION = "3.0.0";
