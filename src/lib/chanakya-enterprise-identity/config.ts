import {
  CEI_AVATAR_PACK_REGISTRY,
  CEI_DEFAULT_AVATAR_PACK_ID,
  CEI_FORBIDDEN_PERSONA_KEYS,
  CEI_FRAMEWORK_VERSION,
  CEI_OFFICIAL_SUBTITLE,
  CEI_OFFICIAL_TITLE,
  CEI_PERSONALITY_ROLE_KEYS,
} from "@/constants/chanakya-enterprise-identity";
import type {
  ChanakyaAvatarPack,
  ChanakyaIdentityConfig,
} from "@/types/chanakya-enterprise-identity";

const DEFAULT_CONFIG: ChanakyaIdentityConfig = {
  frameworkVersion: CEI_FRAMEWORK_VERSION,
  officialTitle: CEI_OFFICIAL_TITLE,
  officialSubtitle: CEI_OFFICIAL_SUBTITLE,
  activeAvatarPackId: CEI_DEFAULT_AVATAR_PACK_ID,
  personalityRoles: CEI_PERSONALITY_ROLE_KEYS,
  forbiddenPersonas: CEI_FORBIDDEN_PERSONA_KEYS,
  communicationTone: "professional_business",
  experienceConsoleConfigurable: false,
};

let runtimeConfig: ChanakyaIdentityConfig = { ...DEFAULT_CONFIG };

export function getChanakyaIdentityConfig(): ChanakyaIdentityConfig {
  return runtimeConfig;
}

export function getActiveChanakyaAvatarPack(): ChanakyaAvatarPack {
  const config = getChanakyaIdentityConfig();
  return (
    CEI_AVATAR_PACK_REGISTRY.find((pack) => pack.packId === config.activeAvatarPackId) ??
    CEI_AVATAR_PACK_REGISTRY[0]
  );
}

/** Future Experience Console hook — architecture only for CF-CHANAKYA-009. */
export function applyChanakyaIdentityConfigPatch(
  patch: Partial<Pick<ChanakyaIdentityConfig, "activeAvatarPackId">>,
): ChanakyaIdentityConfig {
  runtimeConfig = { ...runtimeConfig, ...patch };
  return runtimeConfig;
}

export function resetChanakyaIdentityConfig(): ChanakyaIdentityConfig {
  runtimeConfig = { ...DEFAULT_CONFIG };
  return runtimeConfig;
}
