/** Organization Registry seed — BT institutions (CRC-019). Future: Organization Workspace master. */

export type OrganizationRegistryType = "bank" | "hfc" | "nbfc";

export interface OrganizationRegistryEntry {
  id: string;
  name: string;
  type: OrganizationRegistryType;
}

export const ORGANIZATION_REGISTRY: OrganizationRegistryEntry[] = [
  { id: "org-hdfc", name: "HDFC Bank", type: "bank" },
  { id: "org-icici", name: "ICICI Bank", type: "bank" },
  { id: "org-axis", name: "Axis Bank", type: "bank" },
  { id: "org-sbi", name: "State Bank of India", type: "bank" },
  { id: "org-kotak", name: "Kotak Mahindra Bank", type: "bank" },
  { id: "org-indusind", name: "IndusInd Bank", type: "bank" },
  { id: "org-federal", name: "Federal Bank", type: "bank" },
  { id: "org-idfc", name: "IDFC First Bank", type: "bank" },
  { id: "org-pnb-housing", name: "PNB Housing Finance", type: "hfc" },
  { id: "org-lic-housing", name: "LIC Housing Finance", type: "hfc" },
  { id: "org-bajaj", name: "Bajaj Finserv", type: "nbfc" },
  { id: "org-tata-capital", name: "Tata Capital", type: "nbfc" },
  { id: "org-mahindra", name: "Mahindra Finance", type: "nbfc" },
  { id: "org-cholamandalam", name: "Cholamandalam Finance", type: "nbfc" },
];

export function searchOrganizationRegistry(query: string): OrganizationRegistryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return ORGANIZATION_REGISTRY;
  return ORGANIZATION_REGISTRY.filter(
    (o) =>
      o.name.toLowerCase().includes(q) ||
      o.type.toLowerCase().includes(q),
  );
}

export function getOrganizationById(id: string): OrganizationRegistryEntry | undefined {
  return ORGANIZATION_REGISTRY.find((o) => o.id === id);
}
