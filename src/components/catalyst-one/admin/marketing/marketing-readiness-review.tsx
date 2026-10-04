"use client";

/**
 * CO-MARKETING-REDESIGN-009 — Spacious decision-ready final review.
 */

import type { MarketingReadinessReviewModel } from "@/lib/enterprise-marketing-engine/readiness-review";

export function MarketingReadinessReview({
  model,
  blockers,
}: {
  model: MarketingReadinessReviewModel;
  blockers: string[];
}) {
  return (
    <section className="mkt-readiness-review mkt-cc-panel space-y-6 p-6" aria-label="Final campaign review">
      <div>
        <h3 className="text-lg font-semibold">Final review</h3>
        <p className="mt-1 text-sm text-muted-foreground">{model.notice}</p>
      </div>
      <dl>
        {model.fields.map((field) => (
          <div key={field.label} className="contents">
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
      {blockers.length ? (
        <div role="alert">
          <h4 className="font-semibold text-destructive">Readiness blockers</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">
            {blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No unresolved readiness blockers.</p>
      )}
    </section>
  );
}
