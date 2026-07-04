import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Disclaimer | Rupee Catalyst" },
      { name: "description", content: "Important disclosures for loan advisory and mutual fund distribution services offered by Rupee Catalyst." },
      { property: "og:title", content: "Disclaimer | Rupee Catalyst" },
      { property: "og:url", content: "/disclaimer" },
    ],
    links: [{ rel: "canonical", href: "/disclaimer" }],
  }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  return (
    <>
      <section className="bg-gradient-hero py-14 md:py-20 text-navy-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl font-extrabold md:text-5xl">Disclaimer</h1>
          <p className="mx-auto mt-3 max-w-2xl text-navy-foreground/85">
            Please read these important disclosures regarding our advisory and distribution services.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto max-w-3xl px-4 space-y-6 text-sm leading-relaxed text-navy/85">
          <Block title="General">
            <p>
              Rupee Catalyst is a financial services advisory facilitating loan applications and mutual
              fund investments through its network of bank, NBFC and AMC partners. We are not a bank or
              a lender. All loan products are issued by, and at the sole discretion of, the respective
              partner lender.
            </p>
          </Block>
          <Block title="Loan Products">
            <p>
              Interest rates, processing fees, eligibility criteria and other terms shown on this website
              are indicative and subject to change without notice. Final terms are governed by the partner
              lender's policy, your credit profile and prevailing regulations. Any pre-approval or indicative
              eligibility computed on this website is not a commitment to lend.
            </p>
          </Block>
          <Block title="Mutual Fund Investments">
            <p>
              Mutual fund investments are subject to market risks. Read all scheme-related documents
              carefully before investing. Past performance is not indicative of future returns. The NAVs
              of the schemes may go up or down depending on factors and forces affecting the securities
              market including fluctuations in interest rates. Returns shown anywhere on this website are
              illustrative only and do not constitute a guarantee.
            </p>
            <p>
              Rupee Catalyst acts as an AMFI-registered mutual fund distributor. We may receive
              commission from asset management companies on transactions executed through us.
              Investors are advised to consult their financial advisor before making any investment
              decision. ARN details available on request.
            </p>
          </Block>
          <Block title="Calculators">
            <p>
              EMI, eligibility, SIP, lumpsum, goal-planner and retirement calculators on this website are
              for illustrative purposes only. Actual figures will vary based on the lender's or AMC's
              terms, your individual profile and market conditions.
            </p>
          </Block>
          <Block title="No Investment / Lending Advice">
            <p>
              Nothing on this website constitutes investment advice or a recommendation to buy, sell or
              hold any security, or to borrow from any specific lender. Customers should evaluate all
              options carefully and consult qualified professionals before acting.
            </p>
          </Block>
          <Block title="Data &amp; Privacy">
            <p>
              Information you submit through enquiry forms is used solely to contact you and process
              your application with appropriate partners. See our Privacy Policy for full details.
            </p>
          </Block>
        </div>
      </section>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-white p-6 shadow-card">
      <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
