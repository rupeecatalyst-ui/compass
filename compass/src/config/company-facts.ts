/**
 * Approved public company facts for COMPASS.
 * Customer-visible statistics and legal identity must consume these values.
 */

export const LEGAL_OPERATOR = "Peakprofits Capital Services Private Limited";

export const LEGAL_OPERATOR_STATEMENT =
  "Rupee Catalyst is operated by Peakprofits Capital Services Private Limited.";

export const PRIMARY_TAGLINE = "Financial Fitness Champion";

export const CAMPAIGN_TAGLINE = "Funding Growth. Building Wealth.";

export const FOUNDED_YEAR = 2017;

export const NOT_A_LENDER_DISCLOSURE =
  "Rupee Catalyst is not a bank, NBFC, HFC or lender. Lending decisions remain with the respective financial institution.";

export const COMPANY_STATISTICS = [
  {
    id: "facilitated",
    value: "₹2,500+ Crore",
    label: "Business Facilitated",
    icon: "banknote",
  },
  {
    id: "clients",
    value: "1,000+",
    label: "Clients Served",
    icon: "home",
  },
  {
    id: "partners",
    value: "40+",
    label: "Lending Partners",
    icon: "network",
  },
  {
    id: "founded",
    value: "Since 2017",
    label: "Financial Advisory",
    icon: "shield",
  },
] as const;

export function formatCompanyStatistic(
  stat: (typeof COMPANY_STATISTICS)[number],
) {
  return `${stat.value} — ${stat.label}`;
}

export const COMPANY_STATISTIC_PHRASES = COMPANY_STATISTICS.map(formatCompanyStatistic);
