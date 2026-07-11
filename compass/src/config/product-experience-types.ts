import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  Building2,
  FileText,
  Layers,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

export type ProductLandingConfig = {
  hero: {
    eyebrow: string;
    headline: string;
    headlineAccent: string;
    subheadline: string;
    valueProps: readonly string[];
    primaryCta: string;
    primaryCtaShort: string;
    secondaryCta: string;
    badge?: string;
    empathyLine?: string;
  };
  metrics: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    items: readonly {
      id: string;
      icon: string;
      displayValue?: string;
      value?: number;
      prefix?: string;
      suffix?: string;
      label: string;
    }[];
  };
  why: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    pillars: readonly { id: string; title: string; description: string }[];
  };
  questions: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    items: readonly { id: string; question: string; answer: string }[];
  };
  finalCta: {
    headline: string;
    subheadline: string;
    cta: string;
    empathyLine?: string;
  };
  conversation?: {
    empathyLine?: string;
  };
};

export const productMetricIcons: Record<string, LucideIcon> = {
  bolt: Zap,
  target: Target,
  headset: Users,
  sparkles: Sparkles,
  network: Layers,
  banknote: Wallet,
  shield: Shield,
  home: Building2,
  chart: BarChart3,
  trending: TrendingUp,
  briefcase: Briefcase,
  building: Building2,
  file: FileText,
};

export const productPillarIcons: Record<string, LucideIcon> = {
  fast: Zap,
  flexible: Layers,
  modern: Sparkles,
  confidence: Shield,
  transparency: Target,
  decisions: TrendingUp,
  growth: TrendingUp,
  secure: Shield,
  strategic: Briefcase,
  liquidity: BarChart3,
  operational: Target,
  visionary: Building2,
  equity: Building2,
  executive: Briefcase,
};
