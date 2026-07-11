import type { Metadata } from "next";
import { LogoApprovalPreview } from "@/components/branding/logo-approval-preview";

export const metadata: Metadata = {
  title: "Logo Approval Preview",
  description: "Internal review — Rupee Catalyst dark theme brand asset for COMPASS.",
  robots: { index: false, follow: false },
};

export default function LogoApprovalPreviewPage() {
  return <LogoApprovalPreview />;
}
