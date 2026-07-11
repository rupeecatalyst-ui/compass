import { ROUTES } from "@/constants/routes";
import type { ProductLandingConfig } from "@/config/product-experience-types";
import { discoveryLaunchUrl } from "@/discovery-template/launch-discovery";

export const constructionFinanceLanding: ProductLandingConfig = {
  hero: {
    eyebrow: "Construction Finance Coach",
    headline: "Build in stages,",
    headlineAccent: "fund with discipline.",
    subheadline:
      "Answer a few project questions and we'll build your Construction Funding Strategy, align disbursement to your build stages, and match lenders who understand your vision.",
    valueProps: ["Architectural clarity. Visionary planning.", "Stage-wise disbursement", "Project-aligned lenders"],
    primaryCta: "Discover My Strategy",
    primaryCtaShort: "Discover Strategy",
    secondaryCta: "Talk To Us",
    badge: "Project aligned",
  },
  metrics: {
    eyebrow: "Built for builders",
    headline: "Visionary. Premium. Planned.",
    subheadline: "Stage-wise disbursement needs a guide who understands projects, not only rate sheets.",
    items: [
      { id: "stages", icon: "building", displayValue: "Staged", label: "Disbursement plan" },
      { id: "project", icon: "target", displayValue: "Project", label: "Aligned funding" },
      { id: "lenders", icon: "shield", displayValue: "Matched", label: "Construction lenders" },
      { id: "timeline", icon: "trending", displayValue: "Timeline", label: "Execution support" },
    ],
  },
  why: {
    eyebrow: "Why COMPASS",
    headline: "Architectural · Premium · Visionary",
    subheadline:
      "Construction finance is not a standard home loan. COMPASS understands stage-wise funding, project timelines, and lender disbursement norms.",
    pillars: [
      {
        id: "visionary",
        title: "Vision becoming reality",
        description:
          "We align funding to your build stages — so disbursement tracks progress, not arbitrary timelines.",
      },
      {
        id: "operational",
        title: "Project execution support",
        description:
          "From approvals to tranche releases — we guide you on what unlocks the next stage of funding.",
      },
      {
        id: "strategic",
        title: "Long-term planning",
        description:
          "Cost overruns and timeline slips happen. We help you understand how they change your facility before they become crises.",
      },
    ],
  },
  questions: {
    eyebrow: "Common questions",
    headline: "Questions builders and self-constructors ask",
    subheadline: "Tap a question for a clear answer — no pressure, no jargon.",
    items: [
      {
        id: "disbursement",
        question: "How should disbursement track project stages?",
        answer:
          "Lenders release funds against construction milestones — foundation, slab, finishing. We help you map your project to lender norms.",
      },
      {
        id: "approvals",
        question: "What approvals unlock the next tranche?",
        answer:
          "Architect certificates, progress photos, and statutory approvals vary by lender. We guide you on what matters for your project type.",
      },
      {
        id: "overruns",
        question: "How do cost overruns change the facility?",
        answer:
          "Overruns may require top-up approval or personal contribution. We help you plan buffer before construction begins.",
      },
      {
        id: "timelines",
        question: "What happens if timelines slip?",
        answer:
          "Delays can affect interest during construction and final disbursement. We help you understand lender tolerance and alternatives.",
      },
    ],
  },
  finalCta: {
    headline: "Ready for a disciplined construction finance conversation?",
    subheadline: "No long forms. Just a few questions with Sarathi.",
    cta: "Discover My Strategy",
  },
};

export const CONSTRUCTION_FINANCE_STRATEGY_HREF = discoveryLaunchUrl(ROUTES.CONSTRUCTION_FINANCE);
