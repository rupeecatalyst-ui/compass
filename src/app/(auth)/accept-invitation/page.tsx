import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/layouts/auth-layout";
import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";

export const metadata: Metadata = {
  title: "Accept Invitation · Catalyst One",
};

export default function AcceptInvitationPage() {
  return (
    <AuthLayout
      title="Accept Invitation"
      description="Join your existing organization. Your role and permissions are preserved."
      eyebrow="Invitation Onboarding"
    >
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading invitation…</div>}>
        <AcceptInvitationForm />
      </Suspense>
    </AuthLayout>
  );
}
