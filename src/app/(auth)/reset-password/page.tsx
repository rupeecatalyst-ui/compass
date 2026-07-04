import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/layouts/auth-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { LoadingSkeleton } from "@/components/design-system/loading-skeleton";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Reset password" description="Enter your new password below">
      <Suspense fallback={<LoadingSkeleton rows={3} />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
