import { ROUTES } from "@/constants/routes";
import type { ChanakyaLiveIntelligenceWorkspace } from "@/types/chanakya-live-intelligence";

/**
 * Map the current route to a Live Intelligence workspace context.
 * EUX-007 — messages must be relevant to the current workspace.
 */
export function resolveChanakyaLiveIntelligenceWorkspace(
  pathname: string | null | undefined,
): ChanakyaLiveIntelligenceWorkspace {
  const path = pathname || "/";

  if (
    path === ROUTES.MISSION_CONTROL ||
    path.startsWith(`${ROUTES.MISSION_CONTROL}/`)
  ) {
    return "mission_control";
  }
  if (path === ROUTES.CHANAKYA_RADAR || path.startsWith(`${ROUTES.CHANAKYA_RADAR}/`)) {
    return "radar";
  }
  if (path === ROUTES.CONTACTS || path.startsWith(`${ROUTES.CONTACTS}/`)) {
    return "contacts";
  }
  if (
    path === ROUTES.OPPORTUNITY_WORKSPACE ||
    path.startsWith(`${ROUTES.OPPORTUNITY_WORKSPACE}/`)
  ) {
    return "opportunities";
  }
  if (path === ROUTES.LOAN_FILES || path.startsWith(`${ROUTES.LOAN_FILES}/`)) {
    return "loan_files";
  }
  if (
    path === ROUTES.DOCUMENT_CENTER ||
    path.startsWith(`${ROUTES.DOCUMENT_CENTER}/`) ||
    path === ROUTES.DOCUMENTS ||
    path.startsWith(`${ROUTES.DOCUMENTS}/`)
  ) {
    return "documents";
  }
  if (path === ROUTES.TASKS || path.startsWith(`${ROUTES.TASKS}/`)) {
    return "tasks";
  }
  if (path === ROUTES.LENDERS || path.startsWith(`${ROUTES.LENDERS}/`)) {
    return "lenders";
  }
  if (path === ROUTES.ACCOUNTING || path.startsWith(`${ROUTES.ACCOUNTING}/`)) {
    return "accounting";
  }
  if (path === ROUTES.HORIZON || path.startsWith(`${ROUTES.HORIZON}/`)) {
    return "horizon";
  }
  if (path === ROUTES.MY_DEALS || path.startsWith(`${ROUTES.MY_DEALS}/`)) {
    return "my_deals";
  }

  return "default";
}
