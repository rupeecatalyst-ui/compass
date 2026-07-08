import type { Metadata } from "next";
import { AuthLayout } from "@/layouts/auth-layout";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" description="Sign in to your Catalyst One account">
      <LoginForm />
    </AuthLayout>
  );
}
