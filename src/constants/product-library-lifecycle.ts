import type {
  ProductLifecycleStatus,
  ProductOperationalStatus,
} from "@/types/product-library";

export const PRODUCT_LIFECYCLE_ORDER: ProductLifecycleStatus[] = [
  "draft",
  "review",
  "approved",
  "published",
  "deprecated",
  "archived",
];

export const PRODUCT_LIFECYCLE_LABELS: Record<ProductLifecycleStatus, string> = {
  draft: "Draft",
  review: "Review",
  approved: "Approved",
  published: "Published",
  deprecated: "Deprecated",
  archived: "Archived",
};

export const PRODUCT_OPERATIONAL_STATUS_LABELS: Record<ProductOperationalStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  pilot: "Pilot",
  coming_soon: "Coming Soon",
  retired: "Retired",
};

type PillVariant = "default" | "success" | "warning" | "error" | "info" | "muted";

export const PRODUCT_LIFECYCLE_PILL_VARIANT: Record<ProductLifecycleStatus, PillVariant> = {
  draft: "muted",
  review: "warning",
  approved: "default",
  published: "success",
  deprecated: "warning",
  archived: "muted",
};

export const PRODUCT_OPERATIONAL_PILL_VARIANT: Record<ProductOperationalStatus, PillVariant> = {
  active: "success",
  inactive: "muted",
  pilot: "info",
  coming_soon: "warning",
  retired: "muted",
};

export function formatProductVersion(major: number, minor: number): string {
  return `v${major}.${minor}`;
}

export function isProductPublished(lifecycle: ProductLifecycleStatus): boolean {
  return lifecycle === "published";
}

export function canTransitionProductLifecycle(
  from: ProductLifecycleStatus,
  to: ProductLifecycleStatus,
): boolean {
  if (from === to) return true;
  if (from === "archived" || to === "archived") return to === "archived";
  const order = PRODUCT_LIFECYCLE_ORDER;
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx === fromIdx + 1;
}

export const PRODUCT_LIBRARY_EXTENSIONS = [
  { id: "enterprise_asset_library", label: "Enterprise Asset Library", status: "reserved" as const },
  { id: "pricing_engine", label: "Pricing Engine", status: "reserved" as const },
  { id: "eligibility_calculator", label: "Eligibility Calculator", status: "reserved" as const },
  { id: "marketing_catalog", label: "Marketing Catalog", status: "reserved" as const },
  { id: "customer_journey", label: "Customer Journey", status: "reserved" as const },
  { id: "ai_recommendations", label: "AI Recommendations", status: "reserved" as const },
] as const;
