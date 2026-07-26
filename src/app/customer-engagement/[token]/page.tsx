"use client";

/**
 * CO-BIZ-004 — Secure customer engagement route.
 * Public opaque-token portal. Does not expose Opportunity IDs.
 */

import { useParams } from "next/navigation";
import { CustomerEngagementPortal } from "@/components/catalyst-one/customer-engagement-portal";

export default function CustomerEngagementPortalPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  return <CustomerEngagementPortal token={token} />;
}
