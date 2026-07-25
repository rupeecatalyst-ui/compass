"use client";

/**
 * CO-DOC-002 — Secure customer upload route.
 * Public opaque-token portal. Does not expose Opportunity IDs.
 */

import { useParams } from "next/navigation";
import { CustomerDocumentCollectionPortal } from "@/components/catalyst-one/customer-document-portal";

export default function CustomerDocumentUploadPortalPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  return <CustomerDocumentCollectionPortal token={token} />;
}
