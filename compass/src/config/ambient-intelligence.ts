/** COMPASS Ambient Intelligence — master template message pools by context. */

export type AmbientContext =
  | "explore"
  | "before-income"
  | "after-income"
  | "construction"
  | "advantage"
  | "lenders"
  | "sarathi"
  | "application";

export const AMBIENT_DISPLAY_MS = 5500;
export const AMBIENT_FADE_MS = 800;

export const AMBIENT_MESSAGES: Record<AmbientContext, readonly string[]> = {
  explore: [
    "Every recommendation has a reason.",
    "Your journey. Your pace.",
    "We compare more than interest rates.",
    "Confidence before commitment.",
    "Good decisions begin with clarity.",
    "Every home deserves the right loan.",
    "The right lender depends on your profile.",
    "Guidance before paperwork.",
  ],
  "before-income": [
    "Every recommendation starts with understanding your goals.",
    "One calm question at a time.",
    "Your answers shape what comes next.",
    "We're building clarity — not a form.",
  ],
  "after-income": [
    "Affordability is about comfort, not just eligibility.",
    "Repayment comfort matters as much as approval.",
    "Your income picture helps us personalise.",
  ],
  construction: [
    "Construction-linked funding follows a different journey.",
    "Staged disbursement protects your cash flow.",
    "Your property type shapes every recommendation.",
  ],
  advantage: [
    "Your COMPASS Advantage is built specifically for you.",
    "Your COMPASS Advantage is personalised.",
    "This is your hero moment — take it in.",
    "One recommendation. Many calculations.",
  ],
  lenders: [
    "These recommendations are personalised using your profile.",
    "Every match has a reason behind it.",
    "Compare calmly — there's no rush.",
  ],
  sarathi: [
    "Sarathi already knows your journey.",
    "Ask anything — no repetition required.",
    "Guidance before paperwork.",
  ],
  application: [
    "Documentation is taken care of.",
    "We'll guide you through every document when it's needed.",
    "Your next step starts when you're ready.",
  ],
};

export function pickAmbientMessage(context: AmbientContext, index: number): string {
  const pool = AMBIENT_MESSAGES[context];
  return pool[index % pool.length] ?? pool[0];
}
