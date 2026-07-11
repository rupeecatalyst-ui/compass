/**
 * Product Mood System — emotional personality per product.
 * All themes remain premium dark; only colors and tone vary.
 * Brand signatures (nav, glass UI, typography, Sarathi) stay constant.
 */

export type ProductId =
  | "home-loan"
  | "personal-loan"
  | "loan-against-property"
  | "business-loan"
  | "working-capital"
  | "construction-finance";

export interface ProductMood {
  id: ProductId;
  label: string;
  emotion: string;
  mood: readonly string[];
  /** Whether Advantage Wallet is shown (Home Loan + Balance Transfer only). */
  hasAdvantageWallet: boolean;
  /** Primary CTA label — Home Loan uses "Advantage", others use "Strategy". */
  ctaLabel: string;
  theme: {
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
    ring: string;
    glow: string;
    /** Radial glow colors for hero / insight stage [primary, accent?] */
    heroGlow: readonly [string, string?];
    /** Needle gradient stops for interactive compass */
    needleFrom: string;
    needleTo: string;
  };
}

export const productMoods: Record<ProductId, ProductMood> = {
  "home-loan": {
    id: "home-loan",
    label: "Home Loan",
    emotion: "Building a dream. Largest financial decision. Needs reassurance.",
    mood: ["Premium", "Trust", "Calm", "Sophisticated"],
    hasAdvantageWallet: true,
    ctaLabel: "Discover My Advantage",
    theme: {
      primary: "#2dd4bf",
      primaryForeground: "#042f2e",
      accent: "#4ade80",
      accentForeground: "#052e16",
      ring: "#2dd4bf",
      glow: "rgba(45, 212, 191, 0.40)",
      heroGlow: ["rgba(45,212,191,0.14)", "rgba(74,222,128,0.08)"],
      needleFrom: "rgb(74 222 128)",
      needleTo: "rgb(45 212 191)",
    },
  },
  "personal-loan": {
    id: "personal-loan",
    label: "Personal Loan",
    emotion: "Need funds quickly. Simple. Immediate. Stress-free.",
    mood: ["Fast", "Modern", "Energetic"],
    hasAdvantageWallet: false,
    ctaLabel: "Discover My Strategy",
    theme: {
      primary: "#3b82f6",
      primaryForeground: "#041024",
      accent: "#22d3ee",
      accentForeground: "#031a22",
      ring: "#3b82f6",
      glow: "rgba(59, 130, 246, 0.40)",
      heroGlow: ["rgba(59,130,246,0.16)", "rgba(34,211,238,0.10)"],
      needleFrom: "rgb(34 211 238)",
      needleTo: "rgb(59 130 246)",
    },
  },
  "loan-against-property": {
    id: "loan-against-property",
    label: "Loan Against Property",
    emotion: "Unlocking an existing asset. Responsible borrowing. Long-term thinking.",
    mood: ["Strong", "Premium", "Secure"],
    hasAdvantageWallet: false,
    ctaLabel: "Discover My Strategy",
    theme: {
      primary: "#7c3aed",
      primaryForeground: "#1e0a3c",
      accent: "#b87333",
      accentForeground: "#1a0f05",
      ring: "#7c3aed",
      glow: "rgba(124, 58, 237, 0.38)",
      heroGlow: ["rgba(124,58,237,0.14)", "rgba(184,115,51,0.08)"],
      needleFrom: "rgb(184 115 51)",
      needleTo: "rgb(124 58 237)",
    },
  },
  "business-loan": {
    id: "business-loan",
    label: "Business Loan",
    emotion: "Growth. Expansion. Opportunity. Confidence.",
    mood: ["Executive", "Corporate", "Strategic"],
    hasAdvantageWallet: false,
    ctaLabel: "Discover My Strategy",
    theme: {
      primary: "#4f46e5",
      primaryForeground: "#0f0a2e",
      accent: "#d4af37",
      accentForeground: "#1a1505",
      ring: "#4f46e5",
      glow: "rgba(79, 70, 229, 0.38)",
      heroGlow: ["rgba(79,70,229,0.14)", "rgba(212,175,55,0.08)"],
      needleFrom: "rgb(212 175 55)",
      needleTo: "rgb(79 70 229)",
    },
  },
  "working-capital": {
    id: "working-capital",
    label: "Working Capital",
    emotion: "Business continuity. Cash flow. Liquidity. Business momentum.",
    mood: ["Operational Intelligence", "Dynamic", "Professional"],
    hasAdvantageWallet: false,
    ctaLabel: "Discover My Strategy",
    theme: {
      primary: "#4682b4",
      primaryForeground: "#0a1620",
      accent: "#00ffc8",
      accentForeground: "#021a14",
      ring: "#4682b4",
      glow: "rgba(70, 130, 180, 0.38)",
      heroGlow: ["rgba(26,46,26,0.20)", "rgba(0,255,200,0.08)"],
      needleFrom: "rgb(0 255 200)",
      needleTo: "rgb(70 130 180)",
    },
  },
  "construction-finance": {
    id: "construction-finance",
    label: "Construction Finance",
    emotion: "Vision becoming reality. Project execution. Long-term planning.",
    mood: ["Architectural", "Premium", "Visionary"],
    hasAdvantageWallet: false,
    ctaLabel: "Discover My Strategy",
    theme: {
      primary: "#8b4513",
      primaryForeground: "#1a0d05",
      accent: "#ffbf00",
      accentForeground: "#1a1400",
      ring: "#8b4513",
      glow: "rgba(139, 69, 19, 0.35)",
      heroGlow: ["rgba(45,55,72,0.22)", "rgba(255,191,0,0.08)"],
      needleFrom: "rgb(255 191 0)",
      needleTo: "rgb(139 69 19)",
    },
  },
} as const;

export function getProductMood(id: ProductId): ProductMood {
  return productMoods[id];
}
