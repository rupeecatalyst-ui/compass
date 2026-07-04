import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions | Rupee Catalyst" },
      { name: "description", content: "Terms and conditions governing use of the Rupee Catalyst website and services." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: () => (
    <section className="container mx-auto px-4 py-14 max-w-3xl">
      <h1 className="font-display text-4xl font-extrabold text-navy">Terms &amp; Conditions</h1>
      <p className="mt-4 text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      <div className="mt-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          By using rupeecatalyst.com you agree to these terms. Rupee Catalyst is a financial services
          intermediary; all loan and investment products are offered by our partner banks, NBFCs and
          asset management companies, subject to their eligibility criteria.
        </p>
        <p>
          Information on this website is for general reference. Interest rates, fees, and product
          features are indicative and subject to change without notice. Final terms are governed by
          the loan agreement or investment scheme document.
        </p>
        <p>
          Mutual fund investments are subject to market risks. Please read all scheme-related
          documents carefully before investing.
        </p>
        <p>This is a placeholder document. Replace with your final, legally reviewed terms before launch.</p>
      </div>
    </section>
  ),
});
