/** Production URL — set NEXT_PUBLIC_COMPASS_URL on Vercel (e.g. https://www.rupeecatalyst.com). */
const productionDefaultUrl = "https://www.rupeecatalyst.com";

export const siteConfig = {
  name: "COMPASS",
  tagline: "Funding Growth. Building Wealth.",
  companyTagline: "Funding Growth. Building Wealth.",
  description:
    "The intelligent financial platform from Rupee Catalyst — guiding you to borrow better, invest smarter, and build lasting financial confidence.",
  company: "Rupee Catalyst",
  url: process.env.NEXT_PUBLIC_COMPASS_URL ?? productionDefaultUrl,
  contactEmail: "champion@rupeecatalyst.com",
  contactPhone: "+91 98219 84181",
  officeAddress:
    "B724, Jaswanti Allied Business Centre, Malad West, Mumbai – 400064",
} as const;
