import { buildPublicOrganizationJsonLd } from "@/lib/public-organization-json-ld";

export function OrganizationJsonLd() {
  const jsonLd = buildPublicOrganizationJsonLd();
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
