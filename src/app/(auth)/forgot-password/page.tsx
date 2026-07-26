import type { Metadata } from "next";
import { AuthLayout } from "@/layouts/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password · Catalyst One",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot Password"
      description="Enter your work email and we will send a secure reset link."
      eyebrow="Password Recovery"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
