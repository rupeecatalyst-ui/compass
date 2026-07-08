export const siteConfig = {
  name: "COMPASS",
  tagline: "Borrow Better. Invest Smarter. Build Financial Confidence.",
  description:
    "The intelligent financial platform from Rupee Catalyst — guiding you to borrow better, invest smarter, and build lasting financial confidence.",
  company: "Rupee Catalyst",
  url: process.env.NEXT_PUBLIC_COMPASS_URL ?? "http://localhost:3001",
  contactEmail: "hello@rupeecatalyst.com",
  contactPhone: "+91 98765 43210",
} as const;
