import type { ElwOriginSurface } from "@/types/enterprise-lender-workspace";
import { ROUTES } from "@/constants/routes";

export const ELW_ORIGIN_LABELS: Record<ElwOriginSurface, string> = {
  opportunity_workspace: "Opportunity Workspace",
  life: "LIFE · Link to Lender",
  loan_files: "Loan File",
  dashboard: "Dashboard",
  lenders: "Lender Master",
  search: "Search",
  contacts: "Contacts",
  pipeline: "CHANAKYA Radar",
  unknown: "Previous screen",
};

export const ELW_WORKSPACE_SECTIONS = [
  "Overview",
  "Products",
  "Product Policy",
  "Relationship Hierarchy",
] as const;

export { ELW_CERTIFICATION_FINDING, ELW_ENTERPRISE_PRINCIPLE, ELW_FRAMEWORK_VERSION, ELW_OFFICIAL_NAME } from "./lifecycle";
export {
  ELW_DEFAULT_PRODUCTS,
  ELW_HIERARCHY_RANKS,
  ELW_HIERARCHY_STORAGE_KEY,
  ELW_PRODUCT_POLICY_SECTIONS,
} from "./hierarchy";

/** Build ELW path with origin memory. */
export function buildElwWorkspaceHref(
  lenderId: string,
  options?: {
    from?: ElwOriginSurface;
    returnTo?: string;
    loanFileId?: string;
    opportunityId?: string;
    contactId?: string;
    selectionMode?: boolean;
  },
): string {
  const id = encodeURIComponent(normalizeLenderId(lenderId));
  const params = new URLSearchParams();
  if (options?.from) params.set("from", options.from);
  if (options?.returnTo) params.set("returnTo", options.returnTo);
  if (options?.loanFileId) params.set("loanFileId", options.loanFileId);
  if (options?.opportunityId) params.set("opportunityId", options.opportunityId);
  if (options?.contactId) params.set("contactId", options.contactId);
  if (options?.selectionMode) params.set("select", "1");
  const qs = params.toString();
  return `${ROUTES.LENDERS}/${id}/workspace${qs ? `?${qs}` : ""}`;
}

export function normalizeLenderId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^lender:/, "")
    .replace(/\s+/g, "-");
}

export function toLenderRef(lenderId: string): string {
  const id = normalizeLenderId(lenderId);
  return id.startsWith("lender:") ? id : `lender:${id}`;
}
