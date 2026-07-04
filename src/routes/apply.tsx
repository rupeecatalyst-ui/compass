import { createFileRoute } from "@tanstack/react-router";
import { LeadForm } from "@/components/site/LeadForm";

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Apply for a Loan or Investment | Rupee Catalyst" },
      { name: "description", content: "Apply for a Home Loan, Personal Loan, Business Loan, Balance Transfer, LAP or start a SIP. 100+ lenders, best rates, end-to-end assistance." },
      { property: "og:title", content: "Apply Now | Rupee Catalyst" },
      { property: "og:url", content: "/apply" },
    ],
    links: [{ rel: "canonical", href: "/apply" }],
  }),
  component: ApplyPage,
});

function ApplyPage() {
  return (
    <>
      <section className="bg-gradient-hero py-12 md:py-16 text-navy-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-3xl font-extrabold md:text-5xl">Apply in under 2 minutes</h1>
          <p className="mx-auto mt-3 max-w-2xl text-navy-foreground/85">
            Tell us a bit about you and we'll match you with the best lender for your needs.
          </p>
        </div>
      </section>
      <section className="py-12 md:py-16">
        <div className="container mx-auto max-w-2xl px-4">
          <LeadForm title="Get your best offer" subtitle="No paperwork, no obligation, no fees." />
        </div>
      </section>
    </>
  );
}
