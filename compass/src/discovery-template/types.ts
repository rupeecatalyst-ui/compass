/**

 * Master discovery template — shared psychology and orchestration contract.

 * Product-specific configs (questions, copy, business rules) extend this shape.

 *

 * Platform architecture (frozen):

 * Level 1 — Platform (Homepage, Borrow, Invest)

 * Level 2 — Product Discovery (Goal → Product Journey)

 * Level 3 — Product Experience (Discovery → Sarathi → Application)

 */

import { COMMUNICATION_STANDARD, PLATFORM_LEVELS } from "@/config/platform-architecture";



export type DiscoveryTemplateStage =

  | "welcome"

  | "qualification"

  | "financial"

  | "personalisation"

  | "analysis"

  | "advantage"

  | "matches"

  | "advisor"

  | "application";



export type DiscoveryConfidenceGoal = "confidence" | "effort" | "progress";



export type DiscoveryScreenRule = {

  maxHeadingWords: number;

  maxHelperSentences: number;

  maxButtonWords: number;

  maxInsightWords: number;

};



export const DISCOVERY_SCREEN_RULES: DiscoveryScreenRule = {

  maxHeadingWords: COMMUNICATION_STANDARD.maxHeadingWords,

  maxHelperSentences: 1,

  maxButtonWords: 2,

  maxInsightWords: COMMUNICATION_STANDARD.maxInsightWords,

};



export const PLATFORM_ARCHITECTURE = PLATFORM_LEVELS;



/** Products inherit Home Loan orchestration; only questions, rules, and content change. */

export type DiscoveryProductTemplate = {

  productId: string;

  stages: readonly DiscoveryTemplateStage[];

  launchesVia: "overlay" | "navigate";

};



export const REFERENCE_IMPLEMENTATION_PRODUCT = "home-loan" as const;


