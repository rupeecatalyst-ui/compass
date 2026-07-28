"use client";

import { useEffect, useMemo, useState } from "react";
import { ECM_COMPANY_RELATION_ROLE_LABELS } from "@/constants/enterprise-company-master";
import { isCompanyPrimaryBorrower } from "@/constants/opportunity-primary-borrower";
import { listCompanyLinks } from "@/lib/enterprise-company-master";
import { filterCompanyRepresentativeLinks } from "@/lib/enterprise-company-master/company-representatives";
import { findOperationalEcmContactById } from "@/lib/enterprise-registry";
import { borrowerDisplayNameOrDash } from "@/lib/enterprise-borrower-identity";
import {
  readOpportunityParticipantsFromExtension,
} from "@/lib/lead-opportunity-journey/opportunity-loan-structure";
import { LOAN_PARTICIPANT_ROLE_LABELS } from "@/types/loan-participant";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { OwGlassPanel, OwSectionLabel } from "./workspace-design";

const BORROWER_ROLES = new Set(["primary_applicant", "co_applicant", "guarantor"]);

/**
 * CO-DOM-001 — Separate Borrower Structure, Representatives, and Communication Contacts.
 */
export function WorkspaceBorrowerPartySections({
  opportunity,
}: {
  opportunity: EnterpriseOpportunityApiRecord | null;
}) {
  const [repLinks, setRepLinks] = useState(
    () => [] as ReturnType<typeof filterCompanyRepresentativeLinks>,
  );

  const participants = useMemo(
    () => readOpportunityParticipantsFromExtension(opportunity?.lendingExtension),
    [opportunity?.lendingExtension],
  );

  const borrowerStructure = useMemo(
    () =>
      participants.filter(
        (p) => p.status !== "inactive" && p.role && BORROWER_ROLES.has(p.role),
      ),
    [participants],
  );

  const companyBorrower = opportunity && isCompanyPrimaryBorrower(opportunity);

  useEffect(() => {
    if (!opportunity?.companyId) {
      setRepLinks([]);
      return;
    }
    setRepLinks(
      filterCompanyRepresentativeLinks(listCompanyLinks(opportunity.companyId)),
    );
  }, [opportunity?.companyId, opportunity?.updatedAt]);

  const resolvedPrimaryLabel = borrowerDisplayNameOrDash(opportunity);
  const primaryLabel = companyBorrower
    ? resolvedPrimaryLabel === "—"
      ? "Company"
      : resolvedPrimaryLabel
    : resolvedPrimaryLabel === "—"
      ? "Individual"
      : resolvedPrimaryLabel;

  return (
    <div className="space-y-4">
      <OwGlassPanel>
        <OwSectionLabel>Borrower Structure</OwSectionLabel>
        <p className="mt-1 text-xs text-zinc-400">
          Only borrowers, co-borrowers, and guarantors participate in underwriting.
        </p>
        <ul className="mt-3 space-y-2">
          {borrowerStructure.length === 0 ? (
            <li className="text-sm text-zinc-500">
              {companyBorrower
                ? `${primaryLabel} — primary company borrower. Add co-borrowers and guarantors via Loan Structure.`
                : "No loan structure participants yet. Use Loan Structure to assign roles."}
            </li>
          ) : (
            borrowerStructure.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-50">{p.name}</p>
                  <p className="text-[11px] capitalize text-zinc-400">
                    {p.entityType} ·{" "}
                    {p.role ? LOAN_PARTICIPANT_ROLE_LABELS[p.role] : "Participant"}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </OwGlassPanel>

      <OwGlassPanel>
        <OwSectionLabel>Representatives</OwSectionLabel>
        <p className="mt-1 text-xs text-zinc-400">
          Operational contacts linked to the company — not part of the loan structure.
        </p>
        {!opportunity?.companyId ? (
          <p className="mt-3 text-sm text-zinc-500">
            No company linked. Representatives are managed from the Company Registry.
          </p>
        ) : repLinks.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No representatives yet. Add Employees or Authorised Signatories from Company Workspace.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {repLinks.map((link) => {
              const person = findOperationalEcmContactById(link.contactId);
              return (
                <li
                  key={link.id}
                  className="rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2"
                >
                  <p className="text-sm font-medium text-zinc-50">
                    {person?.name ?? "Contact"}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {ECM_COMPANY_RELATION_ROLE_LABELS[link.relationRole] ?? link.relationRole}
                    {link.designation ? ` · ${link.designation}` : ""}
                    {link.department ? ` · ${link.department}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </OwGlassPanel>

      <OwGlassPanel>
        <OwSectionLabel>Communication Contacts</OwSectionLabel>
        <p className="mt-1 text-xs text-zinc-400">
          Outreach targets for this opportunity — representatives only; never auto-assigned as borrowers.
        </p>
        {!opportunity?.companyId || repLinks.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            Communication contacts appear when company representatives are registered.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {repLinks.map((link) => {
              const person = findOperationalEcmContactById(link.contactId);
              const email =
                person?.officialEmail?.trim() || person?.personalEmail?.trim() || "—";
              return (
                <li
                  key={`comm-${link.id}`}
                  className="rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-zinc-50">{person?.name ?? "Contact"}</p>
                  <p className="text-[11px] text-zinc-400">
                    {person?.mobilePrimary ?? "—"} · {email}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </OwGlassPanel>
    </div>
  );
}
