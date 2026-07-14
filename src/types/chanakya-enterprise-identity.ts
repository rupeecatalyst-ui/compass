/**
 * CHANAKYA Enterprise Identity Framework (CEI).
 * Intelligence thinks; presentation presents.
 */

export type ChanakyaIntelligenceEngineKey =
  | "decision_engine"
  | "memory_engine"
  | "knowledge_engine"
  | "learning_engine"
  | "coaching_engine";

export type ChanakyaPresentationChannelKey =
  | "avatar"
  | "greeting"
  | "cards"
  | "conversation"
  | "voice"
  | "expressions";

export type ChanakyaPersonalityRoleKey =
  | "chief_of_staff"
  | "executive_advisor"
  | "business_mentor"
  | "decision_coach"
  | "strategic_planner";

export type ChanakyaForbiddenPersonaKey =
  | "generic_chatbot"
  | "customer_support"
  | "sales_executive";

export type ChanakyaAvatarVariant = "male" | "female" | "neutral";

export type ChanakyaAvatarExpression = "calm" | "confident" | "wise";

export type ChanakyaAvatarThemeMode = "light" | "dark" | "auto";

export type ChanakyaPresentationSurface =
  | "briefing"
  | "business_journey"
  | "business_coaching"
  | "stage_coaching"
  | "guided_journey"
  | "advisory"
  | "completion"
  | "conversation";

export type ChanakyaAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export type ChanakyaAvatarShape = "circle" | "rounded";

export interface ChanakyaAvatarPack {
  packId: string;
  name: string;
  description: string;
  portraitSrc: string;
  variant: ChanakyaAvatarVariant;
  expression: ChanakyaAvatarExpression;
  themeMode: ChanakyaAvatarThemeMode;
  /** Future Experience Console brand accent */
  accentToken?: string;
  status: "active" | "inactive" | "preview";
}

export interface ChanakyaIdentityConfig {
  frameworkVersion: string;
  officialTitle: string;
  officialSubtitle: string;
  activeAvatarPackId: string;
  personalityRoles: ChanakyaPersonalityRoleKey[];
  forbiddenPersonas: ChanakyaForbiddenPersonaKey[];
  communicationTone: "professional_business";
  /** Future: Experience Console overrides */
  experienceConsoleConfigurable: boolean;
}

export interface ChanakyaArchitectureLayerEntry {
  key: ChanakyaIntelligenceEngineKey | ChanakyaPresentationChannelKey;
  name: string;
  description: string;
  layer: "intelligence" | "presentation";
  status: "active" | "planned";
}

export interface ChanakyaIdentityRegistrySnapshot {
  frameworkVersion: string;
  certificationFinding: string;
  frozenAt: string;
  officialTitle: string;
  officialSubtitle: string;
  enterprisePrinciple: string;
  activeAvatarPack: ChanakyaAvatarPack;
  avatarPackCount: number;
  personalityRoles: ChanakyaPersonalityRoleKey[];
  forbiddenPersonas: ChanakyaForbiddenPersonaKey[];
  intelligenceEngines: ChanakyaArchitectureLayerEntry[];
  presentationChannels: ChanakyaArchitectureLayerEntry[];
  experienceConsoleConfigurable: boolean;
  architectureFreezeNote: string;
}
