# CO-BUG-001 — Invoice Party Validation Blocking Lender Pipeline

**Status:** Implementation complete · Awaiting Product Owner live BAT confirmation  
**Priority:** P1  
**Change control:** No migrations · No live transactional mutation · No Vercel deploy  

---

## 1. Exact files causing the validation (root causes)

| File | Failure mode |
|------|----------------|
| `src/components/catalyst-one/shared/business-completion/business-completion-dialog.tsx` | Hard-blocked Save & Continue with `INVOICE_PARTY_REQUIRED_MESSAGE` when `commercial_payee` was present |
| `src/lib/deal-workspace/deal-edit-validation.ts` | Could emit Invoice Party required message when `requireInvoiceParty: true` |
| `src/components/catalyst-one/shared/commercial-payee-field.tsx` | Auto-rendered `INVOICE_PARTY_REQUIRED_MESSAGE` when `required` |
| `src/constants/invoice-party.ts` → `requiresInvoiceParty(stage)` | Returned **true** from Logged In onward — drove stage-gated “Accounting” UX that BAT experienced as validation after Soft Approved |
| `src/lib/deal-workspace/deal-workflow-validation.ts` → `deriveDealReadiness` | Always evaluated Invoice Party and surfaced **Accounting Setup Pending** on Deal header strip after Soft Approved (looked like an Accounting error even though stage move succeeded) |
| `src/lib/loan-commercial-payee/index.ts` → `isInvoicePartyLocked` | Stage-locked Invoice Party field based on `requiresInvoiceParty` |

`transitionDeal` itself was already non-blocking (CO-DWS-001C) — that is why BAT saw **transition succeeds** then **Accounting error**.

---

## 2. Exact code removed / modified

| Path | Change |
|------|--------|
| `src/constants/invoice-party.ts` | `requiresInvoiceParty` → always `false` (CO-BUG-001) |
| `src/lib/loan-commercial-payee/index.ts` | `isInvoicePartyLocked` → always `false` |
| `business-completion-dialog.tsx` | Removed Invoice Party hard-gate nudge; `commercial_payee` never blocks Save & Continue |
| `deal-edit-validation.ts` | Removed Invoice Party validation path entirely (`requireInvoiceParty` ignored) |
| `commercial-payee-field.tsx` | Stopped auto-displaying `INVOICE_PARTY_REQUIRED_MESSAGE` |
| `deal-workflow-validation.ts` | Accounting readiness only when `includeAccountingReadiness: true` |
| `deal-action-center.tsx` | Passes `includeAccountingReadiness: true` (Action Center advisory only) |
| `deal-executive-header.tsx` | Header strip no longer runs accounting validation / toast CTA |
| `scripts/co-bug-001-verify.mjs` | New BAT evidence verify |
| `scripts/co-dws-001-verify.mjs` | Aligned with edit-validation change |
| `package.json` | `verify:co-bug-001` |

**Preserved:** `assertInvoicePartyForAccountingOperation` for Generate Invoice / Commission Booking / Payment Entry / Accounting Posting only.

---

## 3. Why previous fixes failed

1. **Wrong layer fixed first.** CO-DWS-001 / 001C correctly removed the `transitionDeal` assert, so the stage **API succeeded** — but residual UI/completion/readiness layers still **executed Invoice Party checks** and showed Accounting copy.  
2. **Stage-gated `requiresInvoiceParty(logged_in+)`** kept lighting Accounting readiness the moment Soft Approved landed — BAT interpreted that as “validation still runs”.  
3. **Business Completion Dialog** retained a dedicated Invoice Party hard error string independent of `loan-validation.ts`.  
4. **Static verifies** checked `transitionDeal` only — they did not fail when Business Completion / readiness still validated.

---

## 4. BAT evidence (automated)

```bash
npm run verify:co-bug-001
npm run verify:co-dws-001
npm run verify:co-dws-001c
```

Scripted evidence covers:

| Transition | Invoice Party validation on move |
|------------|----------------------------------|
| Logged In → Soft Approved | None |
| Soft Approved → Final Approved | None |
| Final Approved → Closure WIP | None |

---

## 5. Product Owner live BAT checklist (required to certify)

1. Open Deal Workspace with **no** Invoice Party.  
2. Drag / move: Logged In → Soft Approved → Final Approved → Closure WIP.  
3. Confirm: **no** toast/dialog/API error containing Invoice Party / Accounting Master required copy.  
4. Confirm Deal header readiness does **not** inject Accounting Setup Pending as a pipeline error.  
5. Open Action Center → advisory **Accounting Setup Pending** may still appear (non-blocking).  
6. Accounting action without party → hard gate still applies.

**Do not mark sprint Certified until Product Owner confirms live BAT.**

---

## Final status

🟡 Implementation ready · **Awaiting Product Owner BAT verification**
