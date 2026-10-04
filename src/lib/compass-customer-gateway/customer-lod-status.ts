import type { CompassLodItemDto } from "@/types/compass-customer-gateway";
import type { PartnerLodItemStatus } from "@/types/enterprise-partner-lod";

/** Partner "uploaded" means Catalyst One has verified the file. */
export function customerChecklistStatus(
  status: PartnerLodItemStatus,
): CompassLodItemDto["uploadStatus"] {
  switch (status) {
    case "uploaded":
      return "verified";
    case "pending_verification":
      return "pending_verification";
    case "rejected":
    case "re_upload_required":
      return "rejected";
    case "missing":
    default:
      return "missing";
  }
}
