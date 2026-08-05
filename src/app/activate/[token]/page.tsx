import { ActivateInvitationForm } from "@/components/catalyst-one/enterprise-invitation-engine/activate-invitation-form";

type PageProps = { params: Promise<{ token: string }> };

/** CO-INV-001 — Public activation landing (outside dashboard chrome). */
export default async function ActivateInvitationPage({ params }: PageProps) {
  const { token } = await params;
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-teal-50/40 px-4 py-10">
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm">
        <ActivateInvitationForm token={decodeURIComponent(token)} />
      </div>
    </main>
  );
}
