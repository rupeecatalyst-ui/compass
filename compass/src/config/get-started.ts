import { ROUTES } from "@/constants/routes";

/** Platform entry — Borrow or Invest selection only. */
export const getStartedConfig = {
  headline: "Where would you like to begin?",
  subtext: "Choose your path. We'll guide you from there.",
  borrow: {
    title: "Borrow",
    subtitle: "Borrowing products",
    description: "Explore loan categories and find the right product for your goal.",
    href: ROUTES.BORROW,
  },
  invest: {
    title: "Invest",
    subtitle: "Wealth building",
    description: "Goal-aligned investing — mutual funds, fixed income, and planning.",
    href: ROUTES.INVEST,
  },
} as const;
