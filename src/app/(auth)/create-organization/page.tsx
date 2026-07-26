import type { Metadata } from "next";
import { AuthLayout } from "@/layouts/auth-layout";
import { CreateOrganizationForm } from "@/components/auth/create-organization-form";

export const metadata: Metadata = {
  title: "Create Organization · Catalyst One",
};

export default function CreateOrganizationPage() {
  return (
    <AuthLayout
      title="Create Organization"
      description="Register a new enterprise organization and Super Administrator."
      eyebrow="Organization Onboarding"
      wide
    >
      <CreateOrganizationForm />
    </AuthLayout>
  );
}
