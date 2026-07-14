import {
  CEI_ARCHITECTURE_FREEZE_NOTE,
  CEI_CERTIFICATION_FINDING,
  CEI_ENTERPRISE_PRINCIPLE,
  CEI_FROZEN_AT,
  CEI_INTELLIGENCE_LAYER,
  CEI_PRESENTATION_LAYER,
  CEI_AVATAR_PACK_REGISTRY,
} from "@/constants/chanakya-enterprise-identity";
import type { ChanakyaIdentityRegistrySnapshot } from "@/types/chanakya-enterprise-identity";
import { getActiveChanakyaAvatarPack, getChanakyaIdentityConfig } from "./config";

export function getChanakyaIdentityRegistrySnapshot(): ChanakyaIdentityRegistrySnapshot {
  const config = getChanakyaIdentityConfig();
  const activeAvatarPack = getActiveChanakyaAvatarPack();

  return {
    frameworkVersion: config.frameworkVersion,
    certificationFinding: CEI_CERTIFICATION_FINDING,
    frozenAt: CEI_FROZEN_AT,
    officialTitle: config.officialTitle,
    officialSubtitle: config.officialSubtitle,
    enterprisePrinciple: CEI_ENTERPRISE_PRINCIPLE,
    activeAvatarPack,
    avatarPackCount: CEI_AVATAR_PACK_REGISTRY.length,
    personalityRoles: config.personalityRoles,
    forbiddenPersonas: config.forbiddenPersonas,
    intelligenceEngines: CEI_INTELLIGENCE_LAYER,
    presentationChannels: CEI_PRESENTATION_LAYER,
    experienceConsoleConfigurable: config.experienceConsoleConfigurable,
    architectureFreezeNote: CEI_ARCHITECTURE_FREEZE_NOTE,
  };
}
