import type { Metadata } from "next";
import { AuthLayout } from "@/layouts/auth-layout";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const metadata: Metadata = {
  title: "Set Password",
};

export default function ChangePasswordPage() {
  return (
    <AuthLayout
      title="Set your password"
      description="Replace your temporary password to access Catalyst One."
    >
      <ChangePasswordForm />
    </AuthLayout>
  );
}
