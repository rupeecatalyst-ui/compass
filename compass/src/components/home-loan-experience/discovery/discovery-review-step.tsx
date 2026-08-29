"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { COMPASS_PRODUCT_LABELS, discoveryCopy } from "@/config/home-loan-discovery";
import { journeyConsent } from "@/config/legal";
import { Button } from "@/components/ui/button";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

function formatCurrency(value: number): string {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function DiscoveryReviewStep() {
  const {
    productCode,
    answers,
    intelligence,
    lod,
    opportunityRef,
    submitting,
    submissionError,
    submitApplication,
  } = useDiscovery();
  const reduceMotion = useReducedMotion();
  const c = discoveryCopy.review;
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentLender, setConsentLender] = useState(false);
  const [consentDeclarations, setConsentDeclarations] = useState(false);

  const canSubmit = consentPrivacy && consentLender && consentDeclarations && !submitting;

  const onSubmit = () => {
    void submitApplication({
      consentAccepted: consentPrivacy,
      lenderShareAccepted: consentLender,
      declarationsAccepted: consentDeclarations,
    });
  };

  return (
    <motion.div
      key="review"
      initial={reduceMotion ? false : { opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -16, filter: "blur(6px)" }}
      transition={{ duration: 0.5, ease: smoothEase }}
      className="flex flex-1 flex-col"
    >
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{c.heading}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{c.subtitle}</p>
      </div>

      <div className="mx-auto mt-8 w-full max-w-lg space-y-4 text-left">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {c.productLabel}
          </h3>
          <p className="mt-2 text-lg font-medium text-foreground">
            {COMPASS_PRODUCT_LABELS[productCode]}
          </p>
          {opportunityRef ? (
            <p className="mt-1 text-xs text-muted-foreground">Reference draft · {opportunityRef}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {c.answersLabel}
          </h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Loan amount</dt>
              <dd className="font-medium">{formatCurrency(answers.loanAmount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Property value</dt>
              <dd className="font-medium">{formatCurrency(answers.propertyValue)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">City</dt>
              <dd className="font-medium">{answers.city || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Mobile</dt>
              <dd className="font-medium">{answers.mobile}</dd>
            </div>
          </dl>
        </section>

        {intelligence?.advantage?.eligible ? (
          <section className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {c.advantageLabel}
            </h3>
            <p className="mt-2 text-xl font-semibold text-primary">
              {intelligence.advantage.amountFormatted || "Indicative"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{intelligence.advantage.disclaimer}</p>
          </section>
        ) : null}

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {c.recommendationsLabel}
          </h3>
          {intelligence?.lenders.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {intelligence.lenders.slice(0, 3).map((lender) => (
                <li key={lender.id} className="flex justify-between gap-3">
                  <span>{lender.name}</span>
                  <span className="text-muted-foreground">#{lender.rank}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {intelligence?.recommendationsMessage ||
                "Advisor guidance will be shared after submission."}
            </p>
          )}
        </section>

        {lod ? (
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {c.documentsLabel}
            </h3>
            <p className="mt-2 text-sm font-medium">{lod.completionPercent}% complete</p>
            {lod.mandatoryPending > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {lod.mandatoryPending} mandatory document(s) still pending — you may submit and
                upload later with your advisor.
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          {[
            { id: "privacy", checked: consentPrivacy, onChange: setConsentPrivacy, label: journeyConsent.privacy, href: "/privacy" },
            { id: "lender", checked: consentLender, onChange: setConsentLender, label: journeyConsent.lenderShare },
            { id: "declarations", checked: consentDeclarations, onChange: setConsentDeclarations, label: journeyConsent.declarations, href: "/terms" },
          ].map((item) => (
            <label
              key={item.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] p-3 transition",
                item.checked && "border-primary/25 bg-primary/[0.04]",
              )}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-primary"
                checked={item.checked}
                onChange={(e) => item.onChange(e.target.checked)}
              />
              <span className="text-sm leading-relaxed text-muted-foreground">
                {item.label}{" "}
                {item.href ? (
                  <Link href={item.href} className="text-primary underline-offset-2 hover:underline">
                    View policy
                  </Link>
                ) : null}
              </span>
            </label>
          ))}
        </section>

        {submissionError ? (
          <p className="text-center text-sm text-destructive">{submissionError}</p>
        ) : null}

        <Button size="lg" className="h-12 w-full" disabled={!canSubmit} onClick={onSubmit}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {c.submitting}
            </>
          ) : (
            <>
              {c.submitCta}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
