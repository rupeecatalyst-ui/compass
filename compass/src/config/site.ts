import { buildPublicWhatsAppHref } from "@/lib/public-whatsapp";

/** Production URL — set NEXT_PUBLIC_COMPASS_URL on Vercel (e.g. https://www.rupeecatalyst.com). */
const productionDefaultUrl = "https://www.rupeecatalyst.com";

/**
 * Canonical public company / contact configuration for COMPASS.
 * All customer-facing surfaces must consume these values — do not hardcode copies.
 */
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
  telHref: "tel:+919821984181",
  mailtoHref: "mailto:champion@rupeecatalyst.com",
  whatsappCountryCode: "91",
  whatsappNationalNumber: "9821984181",
  whatsappLabel: "Chat with Rupee Catalyst",
  officeAddress:
    "B724, Jaswanti Allied Business Centre, Malad West, Mumbai – 400064",
  structuredAddress: {
    streetAddress: "B724, Jaswanti Allied Business Centre",
    addressLocality: "Malad West",
    addressRegion: "Mumbai",
    postalCode: "400064",
    addressCountry: "IN",
  },
} as const;

export const publicWhatsAppHref = buildPublicWhatsAppHref(
  siteConfig.whatsappCountryCode,
  siteConfig.whatsappNationalNumber,
);
