import type { ProductId } from "@/config/product-moods";

/**
 * Product Discovery Standard — internal framework for future products.
 * Answer these before designing any Product Experience UI.
 */
export interface ProductDiscoveryDocument {
  productId: ProductId;
  customerPsychology: string;
  financialIntent: string;
  marketPerspective: string;
  bankingPerspective: string;
  rupeeCatalystValue: string;
  customerJourney: readonly string[];
  productMood: readonly string[];
}

export const productDiscoveryRegistry: Partial<Record<ProductId, ProductDiscoveryDocument>> = {
  "home-loan": {
    productId: "home-loan",
    customerPsychology:
      "Building a dream. Largest financial decision. Already invested significant savings. Needs reassurance.",
    financialIntent: "Purchase, construction, or balance transfer with optimal lender fit and structure.",
    marketPerspective: "Crowded rate-comparison market; customers fear hidden costs and wrong lender choice.",
    bankingPerspective: "Lender appetite varies by profile, property type, and income documentation.",
    rupeeCatalystValue: "Advantage Wallet, strategy-first guidance, expert lender selection.",
    customerJourney: ["Understand affordability", "Match lender", "Structure loan", "Execute with confidence"],
    productMood: ["Premium", "Trust", "Calm", "Sophisticated"],
  },
  "personal-loan": {
    productId: "personal-loan",
    customerPsychology: "Need funds quickly. Simple. Immediate. Stress-free.",
    financialIntent: "Short-tenure borrowing for life goals with clear repayment path.",
    marketPerspective: "Instant approval marketing creates pressure; true cost often obscured.",
    bankingPerspective: "Unsecured — profile, employer, and bureau score drive lender fit.",
    rupeeCatalystValue: "Instant strategy, smart lender match, fast-track human support.",
    customerJourney: ["Clarify intent", "Assess eligibility", "Match lender", "Apply with clarity"],
    productMood: ["Fast", "Modern", "Energetic"],
  },
  "loan-against-property": {
    productId: "loan-against-property",
    customerPsychology: "Unlocking an existing asset. Responsible borrowing. Long-term thinking.",
    financialIntent: "Leverage property equity without selling; fund business or personal goals.",
    marketPerspective: "Customers underestimate LTV variance and valuation risk.",
    bankingPerspective: "Property type, location, and end-use shape lender appetite and tenure.",
    rupeeCatalystValue: "Property funding strategy, equity unlock analysis, best lender match.",
    customerJourney: ["Assess equity", "Structure tenure", "Match lender", "Execute responsibly"],
    productMood: ["Strong", "Premium", "Secure"],
  },
  "business-loan": {
    productId: "business-loan",
    customerPsychology: "Growth. Expansion. Opportunity. Confidence.",
    financialIntent: "Fund expansion, equipment, or blended facilities aligned to cash flows.",
    marketPerspective: "Generic products pushed without understanding business cycles.",
    bankingPerspective: "Cash flow, GST, financials, and sector risk drive approval.",
    rupeeCatalystValue: "Growth strategy, cash flow insights, relationship manager support.",
    customerJourney: ["Define growth intent", "Assess capacity", "Match facility", "Execute with RM"],
    productMood: ["Executive", "Corporate", "Strategic"],
  },
  "working-capital": {
    productId: "working-capital",
    customerPsychology: "Business continuity. Cash flow. Liquidity. Business momentum.",
    financialIntent: "Short-term liquidity for operations, seasonality, or receivables gaps.",
    marketPerspective: "Panic borrowing when squeeze hits; wrong facility type chosen.",
    bankingPerspective: "Bank credits, receivable cycles, and limit utilisation matter most.",
    rupeeCatalystValue: "Liquidity strategy, funding structure, cash flow optimisation.",
    customerJourney: ["Diagnose squeeze", "Choose facility", "Optimise limits", "Maintain momentum"],
    productMood: ["Operational Intelligence", "Dynamic", "Professional"],
  },
  "construction-finance": {
    productId: "construction-finance",
    customerPsychology: "Vision becoming reality. Project execution. Long-term planning.",
    financialIntent: "Stage-wise funding aligned to construction milestones.",
    marketPerspective: "Customers confuse construction finance with standard home loans.",
    bankingPerspective: "Disbursement tied to progress; cost overrun and delay risk.",
    rupeeCatalystValue: "Construction funding strategy, stage alignment, project lender match.",
    customerJourney: ["Plan stages", "Align disbursement", "Match lender", "Execute with discipline"],
    productMood: ["Architectural", "Premium", "Visionary"],
  },
};
