/**
 * CF-CHANAKYA-015 — Registry snapshot for admin / ECG.
 */

import {
  CP5_ARCHITECTURE_FREEZE_NOTE,
  CP5_ARCHITECTURE_ROLES,
  CP5_CAPABILITIES,
  CP5_CERTIFICATION_FINDING,
  CP5_CHATGPT_CONTRACT,
  CP5_ENTERPRISE_PRINCIPLE,
  CP5_FRAMEWORK_VERSION,
  CP5_FROZEN_AT,
  CP5_NIGHTLY_REFLECTION_DEFAULT_LOCAL_TIME,
  CP5_NON_NEGOTIABLES,
} from "@/constants/chanakya-phase5-intelligence";
import type { ChanakyaPhase5RegistrySnapshot } from "@/types/chanakya-phase5-intelligence";
import { getChanakyaLearningFoundation } from "./learning-foundation";
import { getChanakyaProposalConfig } from "./proposal-intelligence";

export function getChanakyaPhase5RegistrySnapshot(): ChanakyaPhase5RegistrySnapshot {
  return {
    frameworkVersion: CP5_FRAMEWORK_VERSION,
    certificationFinding: CP5_CERTIFICATION_FINDING,
    frozenAt: CP5_FROZEN_AT,
    enterprisePrinciple: CP5_ENTERPRISE_PRINCIPLE,
    architectureRoles: CP5_ARCHITECTURE_ROLES,
    chatgptContract: CP5_CHATGPT_CONTRACT,
    nightlyReflectionDefaultLocalTime: CP5_NIGHTLY_REFLECTION_DEFAULT_LOCAL_TIME,
    proposalConfig: getChanakyaProposalConfig(),
    learningFoundation: getChanakyaLearningFoundation(),
    capabilities: [...CP5_CAPABILITIES],
    nonNegotiables: [...CP5_NON_NEGOTIABLES, CP5_ARCHITECTURE_FREEZE_NOTE],
  };
}
