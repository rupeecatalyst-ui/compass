import { ROUTES } from "@/constants/routes";
import { discoveryLaunchUrl } from "@/discovery-template/launch-discovery";

/**
 * Frozen COMPASS platform architecture.
 * Home Loan is the reference implementation — products inherit this orchestration.
 */

export const PLATFORM_LEVELS = {
  platform: "Homepage · Borrow · Invest · About · Contact",
  productDiscovery: "Customer Goal → Relevant Product Journey",
  productExperience:
    "Discovery → Intelligence → Advantage → Recommendations → Sarathi → Application",
} as const;

export const COMMUNICATION_STANDARD = {
  maxHeadingWords: 3,
  maxInsightWords: 20,
  understandingSeconds: 5,
} as const;

export type BorrowGoalId =
  | "buy-home"
  | "unlock-property"
  | "grow-business"
  | "buy-vehicle"
  | "finance-equipment";

export type InvestGoalId = "mutual-funds" | "fixed-income" | "wealth-advisory" | "goal-planning";

export type BorrowGoal = {
  id: BorrowGoalId;
  title: string;
  insight: string;
  productRoute: (typeof ROUTES)[keyof typeof ROUTES];
  discoveryHref: string;
  icon: "home" | "building" | "briefcase" | "car" | "cog";
};

export type InvestGoal = {
  id: InvestGoalId;
  title: string;
  insight: string;
  href: string;
  icon: "chart" | "landmark" | "gem" | "target";
};

export const borrowTransition = {
  headline: "Choose your borrowing goal.",
  subtext:
    "We'll recommend the most suitable borrowing strategy before recommending a lender.",
} as const;

/** Goal cards launch the relevant product Discovery Journey. */
export const borrowGoals: readonly BorrowGoal[] = [
  {
    id: "buy-home",
    title: "Buy a Home",
    insight: "Home loan strategy matched to your property and profile.",
    productRoute: ROUTES.HOME_LOAN,
    discoveryHref: discoveryLaunchUrl(ROUTES.HOME_LOAN),
    icon: "home",
  },
  {
    id: "unlock-property",
    title: "Unlock Property Value",
    insight: "Loan against property with clarity on eligibility and fit.",
    productRoute: ROUTES.LOAN_AGAINST_PROPERTY,
    discoveryHref: discoveryLaunchUrl(ROUTES.LOAN_AGAINST_PROPERTY),
    icon: "building",
  },
  {
    id: "grow-business",
    title: "Grow My Business",
    insight: "Business borrowing aligned to growth stage and cash flow.",
    productRoute: ROUTES.BUSINESS_LOAN,
    discoveryHref: discoveryLaunchUrl(ROUTES.BUSINESS_LOAN),
    icon: "briefcase",
  },
  {
    id: "buy-vehicle",
    title: "Buy a Vehicle",
    insight: "Vehicle financing strategy before you compare lenders.",
    productRoute: ROUTES.PERSONAL_LOAN,
    discoveryHref: discoveryLaunchUrl(ROUTES.PERSONAL_LOAN),
    icon: "car",
  },
  {
    id: "finance-equipment",
    title: "Finance Equipment",
    insight: "Equipment funding matched to asset type and repayment capacity.",
    productRoute: ROUTES.WORKING_CAPITAL,
    discoveryHref: discoveryLaunchUrl(ROUTES.WORKING_CAPITAL),
    icon: "cog",
  },
] as const;

export const investTransition = {
  headline: "Choose your investment goal.",
  subtext:
    "We'll shape an investment strategy aligned to your horizon before recommending products.",
} as const;

/** Invest goals — journeys follow the same orchestration as Borrow (coming online). */
export const investGoals: readonly InvestGoal[] = [
  {
    id: "mutual-funds",
    title: "Mutual Funds",
    insight: "Goal-based fund strategy for disciplined wealth building.",
    href: `${ROUTES.RESOURCES}?goal=mutual-funds`,
    icon: "chart",
  },
  {
    id: "fixed-income",
    title: "Fixed Income",
    insight: "Stable returns aligned to your liquidity needs.",
    href: `${ROUTES.RESOURCES}?goal=fixed-income`,
    icon: "landmark",
  },
  {
    id: "wealth-advisory",
    title: "Wealth Advisory",
    insight: "Holistic portfolio guidance beyond product selection.",
    href: `${ROUTES.RESOURCES}?goal=wealth-advisory`,
    icon: "gem",
  },
  {
    id: "goal-planning",
    title: "Goal Planning",
    insight: "Map every rupee to a milestone that matters.",
    href: `${ROUTES.RESOURCES}?goal=goal-planning`,
    icon: "target",
  },
] as const;

/** Products with COMPASS Advantage (ready vs construction rules). */
export const ADVANTAGE_PRODUCTS = ["home-loan", "home-loan-balance-transfer"] as const;
