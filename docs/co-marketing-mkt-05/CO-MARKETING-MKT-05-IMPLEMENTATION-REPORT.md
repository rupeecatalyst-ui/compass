# CO-MARKETING-MKT-05 — Implementation Report

**Sprint:** CO-MARKETING-MKT-05  
**Title:** Campaign Lifecycle + Preview + Approval  
**Status:** Implementation complete — ready for BAT  
**Authority:** CO-MARKETING-ARCH-001 · MKT-01–MKT-04 approved  
**Date:** 2026-08-12

---

## 1. Objective

Implement campaign lifecycle governance: legal state transitions, approval permission gate, pre-publish validation, registry status labels, and audit trail — **without** live delivery.

---

## 2. States

Durable resting states (ARCH-001):

`DRAFT` → `PREVIEW` → `READY_FOR_REVIEW` → `APPROVED` → `SCHEDULED` → `RUNNING` → `PAUSED` → `COMPLETED`

Also: `STOPPED` · `CANCELLED` · `FAILED`

**`RESUMED` is an action** (`PAUSED → RUNNING`), not a durable status — matches ADR / Logical Model.

---

## 3. Legal transitions

SSOT: `src/constants/enterprise-marketing-engine/transitions.ts`

Invalid transitions throw `ILLEGAL_LIFECYCLE_TRANSITION`.

### Edit policy

| Status | Behaviour |
|--------|-----------|
| DRAFT / PREVIEW | Content + metadata editable |
| READY_FOR_REVIEW | Locked pending approval / reopen |
| APPROVED / SCHEDULED | Content locked (version frozen on approve) |
| RUNNING / PAUSED | Operational controls only |
| COMPLETED / STOPPED / CANCELLED | Read-only |
| FAILED | Recovery via `REOPEN_DRAFT` or `STOP` |

---

## 4. Approval vs Save

- **`action=save`** persists draft only. API rejects any `status` on save (`SAVE_CANNOT_PUBLISH`).
- **`action=transition` + `lifecycleAction=APPROVE`** is the only approve path.
- Approve requires `admin.marketing.campaign.approve`.
  - `SUPER_ADMIN`: all marketing permissions
  - `ADMIN`: create/edit/submit by default — **not** approve unless explicitly granted

---

## 5. Pre-publish checks

`runMarketingPrePublishChecks` (no send):

| Check | Severity |
|-------|----------|
| Audience configured | error |
| Content present | error |
| Sender configured | error |
| Unsubscribe / compliance | error |
| CTA / links | error |
| Scheduling validity | error if enabled without notes; else warning |
| Routing policy | warning |
| Notification configuration | warning |
| Deliverability prep | warning |

Blocking errors prevent `APPROVE`.

---

## 6. Registry labels

| Status | Label |
|--------|-------|
| DRAFT | Draft |
| READY_FOR_REVIEW | In Review |
| APPROVED | Approved |
| SCHEDULED | Scheduled |
| RUNNING | Running |
| PAUSED | Paused |
| COMPLETED | Completed |
| STOPPED | Stopped |
| FAILED | Failed |
| (+ PREVIEW, CANCELLED) | Preview / Cancelled |

---

## 7. Audit / governance

Per campaign:

- `governance`: createdBy · modifiedBy · submittedBy · approvedBy · scheduledBy + timestamps  
- `stateHistory`: from → to · action · actor · timestamp  

Module audit events: `campaign.transition`, `campaign.approve`, `campaign.submit_for_review`, schedule/run/pause/resume/stop/complete/cancel.

---

## 8. Safety

No email / WhatsApp / digital providers.  
`SCHEDULE` / `RUN` advance **state only**.  
`ENTERPRISE_MARKETING_EXECUTION_ENABLED = false`.  
Test Send remains disabled in UI.

---

## 9. Key paths

| Concern | Path |
|---------|------|
| Transitions | `src/constants/enterprise-marketing-engine/transitions.ts` |
| Pre-publish | `src/lib/enterprise-marketing-engine/pre-publish.ts` |
| Permissions | `src/lib/enterprise-marketing-engine/permissions.ts` |
| Service | `server/services/enterprise-marketing-engine/campaign.service.ts` |
| API | `/api/admin/marketing/campaigns` |
| UI | `marketing-campaigns-panel.tsx` |
| Verify | `npm run verify:co-marketing-mkt-05` |

---

## 10. Verification

| Check | Result |
|-------|--------|
| `verify:co-marketing-mkt-05` | ✅ PASS |
| TypeScript `tsc --noEmit` (8GB) | ✅ PASS |
| ESLint (scoped) | ✅ PASS |
| `npm run build` | ✅ PASS |
| MKT-01 → MKT-04 regression | ✅ PASS |

Covered: illegal transitions · ADMIN deny approve · SUPER_ADMIN approve · SAVE ≠ publish · freeze · content lock · schedule/run/pause/resume/complete (state only) · audit history · RESUMED action-only.

---

## 11. Out of scope (STOP)

- ESP / WhatsApp / digital send  
- Test send  
- Durable Prisma campaign rows  
- MKT-06+

---

## 12. Final status

**CO-MARKETING-MKT-05 implementation complete. STOP.**
