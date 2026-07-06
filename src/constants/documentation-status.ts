import type { DocumentationStatus } from "@/types/enterprise-architecture";

export const DOCUMENTATION_STATUS_LABELS: Record<DocumentationStatus, string> = {
  no_documentation: "No Documentation",
  draft: "Draft",
  review: "Review",
  published: "Published",
  outdated: "Outdated",
};

export const DOCUMENTATION_STATUS_DESCRIPTIONS: Record<DocumentationStatus, string> = {
  no_documentation: "Artifact has no documentation artifact linked.",
  draft: "Documentation is in progress — not ready for review.",
  review: "Documentation is under architecture review.",
  published: "Documentation is published and current.",
  outdated: "Published documentation requires refresh.",
};

type PillVariant = "default" | "success" | "warning" | "error" | "info" | "muted";

export const DOCUMENTATION_STATUS_VARIANT: Record<DocumentationStatus, PillVariant> = {
  no_documentation: "error",
  draft: "muted",
  review: "warning",
  published: "success",
  outdated: "warning",
};

/** SAGE integration reserved — documentation readiness gate. */
export const SAGE_INTEGRATION_RESERVED = true;
