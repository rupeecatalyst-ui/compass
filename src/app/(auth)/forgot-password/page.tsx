import type { Metadata } from "next";
import { AuthLayout } from "@/layouts/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot password?"
      description="Enter your email and we'll send you a reset link"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
