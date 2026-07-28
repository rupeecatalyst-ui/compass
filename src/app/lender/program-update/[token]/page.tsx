"use client";

/**
 * CO-LEND-001 — Secure lender program update portal (public opaque token).
 */
import { useParams } from "next/navigation";
import { LenderProgramUpdatePortal } from "@/components/catalyst-one/lender-program-portal";

export default function LenderProgramUpdatePage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  return <LenderProgramUpdatePortal token={token} />;
}
