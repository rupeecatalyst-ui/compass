import { siteConfig } from "@/config/site";

/**
 * Confirmed Organization fields only. No coordinates, social profiles, hours, or unverified identifiers.
 */
export function buildPublicOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.company,
    telephone: siteConfig.contactPhone,
    email: siteConfig.contactEmail,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.structuredAddress.streetAddress,
      addressLocality: siteConfig.structuredAddress.addressLocality,
      addressRegion: siteConfig.structuredAddress.addressRegion,
      postalCode: siteConfig.structuredAddress.postalCode,
      addressCountry: siteConfig.structuredAddress.addressCountry,
    },
  };
}
