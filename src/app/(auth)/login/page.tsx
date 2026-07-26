import type { Metadata } from "next";
import { AuthLayout } from "@/layouts/auth-layout";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In · Catalyst One",
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign In"
      description="Access your Catalyst One workspace securely."
      eyebrow="Enterprise Authentication"
      hideAuthFooter
    >
      <LoginForm />
    </AuthLayout>
  );
}
