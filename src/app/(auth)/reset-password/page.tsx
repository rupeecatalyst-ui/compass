import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/layouts/auth-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { LoadingSkeleton } from "@/components/design-system/loading-skeleton";

export const metadata: Metadata = {
  title: "Reset Password · Catalyst One",
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Create New Password"
      description="Choose a strong password to secure your Catalyst One account."
      eyebrow="Password Recovery"
    >
      <Suspense fallback={<LoadingSkeleton rows={3} />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
