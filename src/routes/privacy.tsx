import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Rupee Catalyst" },
      { name: "description", content: "How Rupee Catalyst collects, uses, stores and protects your personal information." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: () => (
    <section className="container mx-auto px-4 py-14 max-w-3xl prose prose-slate">
      <h1 className="font-display text-4xl font-extrabold text-navy">Privacy Policy</h1>
      <p className="mt-4 text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      <p className="mt-6">
        Rupee Catalyst ("we", "us", "our") respects your privacy. This policy explains what information
        we collect when you use our website and services, how we use it, and the choices you have.
      </p>
      <h2 className="mt-8 font-display text-2xl font-bold text-navy">Information we collect</h2>
      <ul className="mt-3 list-disc pl-6 text-sm text-muted-foreground space-y-1">
        <li>Contact details you submit through enquiry forms (name, mobile, email, city).</li>
        <li>Loan or investment requirements you share with us.</li>
        <li>Usage data (pages visited, device/browser type, referring URL).</li>
      </ul>
      <h2 className="mt-8 font-display text-2xl font-bold text-navy">How we use your information</h2>
      <ul className="mt-3 list-disc pl-6 text-sm text-muted-foreground space-y-1">
        <li>To match you with suitable lenders and respond to your enquiry.</li>
        <li>To send service-related communication via call, SMS, WhatsApp or email.</li>
        <li>To improve our services and website experience.</li>
      </ul>
      <p className="mt-6 text-sm text-muted-foreground">
        This is a placeholder privacy policy. Please replace with your final, legally reviewed version
        before going live.
      </p>
    </section>
  ),
});
