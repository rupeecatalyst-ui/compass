"use client";

import { useEffect, useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AssessmentPayload = {
  journeyKind?: string;
  journeyStatus?: string;
  calculationVersion?: string;
  rawAnswersJson?: Record<string, unknown>;
  normalisedAnswersJson?: Record<string, unknown>;
  lenderAssessmentsJson?: unknown[];
  recommendationSnapshotJson?: Record<string, unknown>;
  assistedOfferJson?: Record<string, unknown> | null;
  expertSlaState?: string | null;
  expertRequestedAt?: string | null;
  expertDeadlineAt?: string | null;
  assignedUserId?: string | null;
  assessedAt?: string | null;
  questionTimelineJson?: unknown[];
  slaEvents?: Array<{ id: string; eventKind: string; createdAt: string }>;
  expertSla?: { state: string; remainingWorkingMs: number; deadlineIso: string } | null;
  mobileVerifiedAt?: string | null;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-3 border-white/10 bg-zinc-950/40 p-4">
      <h3 className="text-sm font-semibold tracking-tight text-zinc-50">{title}</h3>
      {children}
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: unknown }) {
  if (value == null || value === "") return null;
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="text-zinc-100">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
    </div>
  );
}

export function WorkspaceCompassAssessmentPanel({ opportunityId }: { opportunityId: string }) {
  const [data, setData] = useState<AssessmentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await authenticatedJsonFetch(`/api/opportunities/${opportunityId}/compass-assessment`);
        const body = await res.json();
        if (!cancelled) setData(body.assessment ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load COMPASS Assessment.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  const recordOutcome = async (outcome: string) => {
    setBusy(true);
    try {
      await authenticatedJsonFetch(`/api/opportunities/${opportunityId}/compass-expert-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      const res = await authenticatedJsonFetch(`/api/opportunities/${opportunityId}/compass-assessment`);
      const body = await res.json();
      setData(body.assessment ?? null);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) {
    return (
      <p className="text-sm text-zinc-400">
        No COMPASS Assessment is attached to this Opportunity. This tab is for COMPASS-originated Home Loan journeys.
      </p>
    );
  }

  const answers = data.rawAnswersJson ?? {};
  const lenders = Array.isArray(data.lenderAssessmentsJson) ? data.lenderAssessmentsJson : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>COMPASS</Badge>
        <Badge variant="outline">{data.journeyKind}</Badge>
        {data.expertSlaState ? <Badge variant="secondary">{data.expertSlaState}</Badge> : null}
      </div>

      <Section title="Customer and Journey">
        <dl className="space-y-1">
          <Fact label="Name" value={answers.displayName} />
          <Fact label="Mobile" value={answers.mobile} />
          <Fact label="Mobile verified" value={data.mobileVerifiedAt ? "Verified" : "Not verified"} />
          <Fact label="Email" value={answers.personalEmail} />
          <Fact label="Journey" value={data.journeyKind} />
          <Fact label="Status" value={data.journeyStatus} />
          <Fact label="Assessed" value={data.assessedAt} />
        </dl>
      </Section>

      <Section title="Requirement">
        <dl className="space-y-1">
          <Fact label="Purpose" value={answers.loanPurpose} />
          <Fact label="Required amount" value={answers.loanAmount ?? answers.outstandingLoanAmount} />
          <Fact label="Top-up" value={answers.topUpChoice} />
          <Fact label="Property value" value={answers.propertyValue} />
          <Fact label="Location" value={answers.city} />
          <Fact label="Occupancy" value={answers.occupancy} />
          <Fact label="Construction" value={answers.constructionStatus} />
        </dl>
      </Section>

      {data.journeyKind?.includes("balance_transfer") ? (
        <Section title="Existing Loan — Balance Transfer">
          <dl className="space-y-1">
            <Fact label="Current lender" value={answers.currentLender} />
            <Fact label="Outstanding" value={answers.outstandingLoanAmount} />
            <Fact label="Current ROI" value={answers.currentRoi} />
            <Fact label="Current EMI" value={answers.currentEmi} />
            <Fact label="Remaining tenure" value={answers.remainingTenureMonths} />
            <Fact label="Repayment track" value={answers.repaymentTrack} />
          </dl>
        </Section>
      ) : null}

      <Section title="Applicant Profile">
        <dl className="space-y-1">
          <Fact label="Date of birth" value={answers.dateOfBirth} />
          <Fact label="Employment" value={answers.incomeType} />
          <Fact label="Residency" value={answers.residency} />
          <Fact label="CIBIL" value={answers.approxCibilScore} />
          <Fact label="Income" value={answers.monthlyIncome} />
          <Fact label="Existing EMIs" value={answers.existingEmi} />
        </dl>
      </Section>

      {answers.coApplicantDecision === "yes" ? (
        <Section title="Co-applicant">
          <dl className="space-y-1">
            <Fact label="Relationship" value={answers.coApplicantRelationship} />
            <Fact label="Date of birth" value={answers.coApplicantDob} />
            <Fact label="Employment" value={answers.coApplicantEmployment} />
            <Fact label="Income" value={answers.coApplicantIncome} />
            <Fact label="Existing EMIs" value={answers.coApplicantExistingEmi} />
          </dl>
        </Section>
      ) : null}

      <Section title="Calculated Eligibility">
        {lenders.length === 0 ? (
          <p className="text-sm text-zinc-400">No verified programme produced a lender card. Assisted Offer applies.</p>
        ) : (
          <div className="space-y-3">
            {lenders.map((row, index) => {
              const card = row as Record<string, unknown>;
              return (
                <div key={String(card.programmeId ?? index)} className="rounded-lg border border-white/10 p-3 text-sm">
                  <p className="font-medium text-zinc-50">{String(card.lenderName ?? "Lender")}</p>
                  <p className="text-zinc-400">{String(card.customerExplanation ?? "")}</p>
                  <p className="mt-1 text-zinc-300">
                    Tentative offer {String(card.tentativeOfferRupees ?? "unknown")} · Match {String(card.matchState ?? "")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Recommendation Snapshot">
        <dl className="space-y-1">
          <Fact label="Calculation version" value={data.calculationVersion} />
          <Fact label="Assisted offer" value={data.assistedOfferJson?.headline} />
          <Fact label="Snapshot" value={data.recommendationSnapshotJson} />
        </dl>
      </Section>

      <Section title="Talk to an Expert SLA">
        <dl className="space-y-1">
          <Fact label="State" value={data.expertSla?.state ?? data.expertSlaState} />
          <Fact label="Requested" value={data.expertRequestedAt} />
          <Fact label="Deadline" value={data.expertDeadlineAt} />
          <Fact label="Assigned user" value={data.assignedUserId} />
        </dl>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" disabled={busy} onClick={() => void recordOutcome("connected")}>
            Connected
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void recordOutcome("call_attempted_no_response")}>
            Call attempted — no response
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void recordOutcome("appointment_scheduled")}>
            Appointment scheduled
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void recordOutcome("customer_requested_callback")}>
            Customer requested callback
          </Button>
        </div>
      </Section>

      <details className="rounded-lg border border-white/10 p-3 text-xs text-zinc-400">
        <summary className="cursor-pointer text-sm text-zinc-200">Raw payload (support / audit)</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );
}
