import type { ChanakyaAvatarPack } from "@/types/chanakya-enterprise-identity";

export const CEI_DEFAULT_AVATAR_PACK_ID = "executive-premium-v1";

/** Initial premium illustrated avatar — executive, calm, wise. */
export const CEI_DEFAULT_AVATAR_PACK: ChanakyaAvatarPack = {
  packId: CEI_DEFAULT_AVATAR_PACK_ID,
  name: "Executive Premium",
  description:
    "Premium illustrated avatar — executive appearance, calm expression, wise and confident. Dark and light theme compatible.",
  portraitSrc: "/images/chanakya-portrait.png",
  variant: "male",
  expression: "calm",
  themeMode: "auto",
  accentToken: "violet",
  status: "active",
};

/** Registry seed — future Experience Console avatar packs. */
export const CEI_AVATAR_PACK_REGISTRY: ChanakyaAvatarPack[] = [
  CEI_DEFAULT_AVATAR_PACK,
  {
    packId: "executive-premium-female-v1",
    name: "Executive Premium (Female)",
    description: "Future avatar pack — female executive variant with calm, professional expression.",
    portraitSrc: "/images/chanakya-portrait.png",
    variant: "female",
    expression: "confident",
    themeMode: "auto",
    accentToken: "violet",
    status: "preview",
  },
  {
    packId: "executive-premium-neutral-v1",
    name: "Executive Premium (Neutral)",
    description: "Future avatar pack — neutral executive variant for brand customization.",
    portraitSrc: "/images/chanakya-portrait.png",
    variant: "neutral",
    expression: "wise",
    themeMode: "auto",
    accentToken: "teal",
    status: "preview",
  },
];

export const CEI_FUTURE_AVATAR_CAPABILITIES = [
  "Avatar Packs",
  "Male / Female variants",
  "Expressions",
  "Themes",
  "Brand Customization",
] as const;
