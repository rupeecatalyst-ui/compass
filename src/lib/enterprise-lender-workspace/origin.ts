import { ROUTES } from "@/constants/routes";
import { ELW_ORIGIN_LABELS } from "@/constants/enterprise-lender-workspace";
import type { ElwOriginContext, ElwOriginSurface } from "@/types/enterprise-lender-workspace";

const SURFACE_SET = new Set<string>(Object.keys(ELW_ORIGIN_LABELS));

function isOriginSurface(value: string | null): value is ElwOriginSurface {
  return Boolean(value && SURFACE_SET.has(value));
}

function defaultReturnTo(
  from: ElwOriginSurface,
  ctx: { loanFileId?: string; opportunityId?: string; contactId?: string },
): string {
  switch (from) {
    case "opportunity_workspace":
      return ROUTES.OPPORTUNITY_WORKSPACE;
    case "life":
      return ctx.loanFileId
        ? `${ROUTES.LENDERS}?loanFileId=${encodeURIComponent(ctx.loanFileId)}`
        : ROUTES.LENDERS;
    case "loan_files":
      return ctx.loanFileId
        ? `${ROUTES.LOAN_FILES}?file=${encodeURIComponent(ctx.loanFileId)}`
        : ROUTES.LOAN_FILES;
    case "dashboard":
      return ROUTES.DASHBOARD;
    case "lenders":
      return ROUTES.LENDERS;
    case "search":
      return ROUTES.MISSION_CONTROL_SEARCH;
    case "contacts":
      return ctx.contactId
        ? `${ROUTES.CONTACTS}?contact=${encodeURIComponent(ctx.contactId)}`
        : ROUTES.CONTACTS;
    case "pipeline":
      return ROUTES.CHANAKYA_RADAR;
    default:
      return ROUTES.LENDERS;
  }
}

/** Parse origin memory from ELW search params — never send users to Dashboard after Select. */
export function parseElwOriginFromSearchParams(
  params: URLSearchParams | { get: (key: string) => string | null },
): ElwOriginContext {
  const loanFileId = params.get("loanFileId") ?? params.get("file") ?? undefined;
  const opportunityId = params.get("opportunityId") ?? undefined;
  const contactId = params.get("contactId") ?? undefined;
  const rawFrom = params.get("from");
  const from: ElwOriginSurface = isOriginSurface(rawFrom) ? rawFrom : "unknown";
  const explicitReturn = params.get("returnTo");
  const returnTo =
    explicitReturn && explicitReturn.startsWith("/")
      ? explicitReturn
      : defaultReturnTo(from, { loanFileId, opportunityId, contactId });
  const selectionMode =
    params.get("select") === "1" ||
    from === "opportunity_workspace" ||
    from === "life" ||
    from === "loan_files";

  return {
    from,
    returnTo,
    loanFileId: loanFileId || undefined,
    opportunityId: opportunityId || undefined,
    contactId: contactId || undefined,
    selectionMode,
  };
}

export function getElwOriginLabel(from: ElwOriginSurface): string {
  return ELW_ORIGIN_LABELS[from];
}
