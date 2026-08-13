# CO-MARKETING-MKT-11 — Qualification + Catalyst One Handoff

**Sprint:** CO-MARKETING-MKT-11  
**Status:** Implementation complete · **STOP — awaiting Product Owner review**  
**Architecture:** CO-MARKETING-ARCH-001 §5–6 (qualification + routing)  
**Hard stop:** No mass conversion. No Lead entity. No deploy. Do not start later sprints.

---

## Summary

MKT-11 adds the **controlled boundary** between Enterprise Marketing Engine and Catalyst One operational CRM.

A raw marketing recipient **does not** become a Contact, Opportunity, or Lead.

Only an explicit **QUALIFIED** business response may hand off:

```text
Marketing Engine
  → Qualification record (EME)
  → Identity match (email, then phone)
  → ECM Contact (reuse or progressive create)
  → Dialogue Opportunity (identity only, existing Opportunity Registry)
```

Default identity/opportunity adapters are **fixture** (`ENTERPRISE_MARKETING_HANDOFF_MODE=fixture`) so verification does not write live ECM or Opportunity rows. Live adapters call existing ECM + Opportunity services without changing those architectures.

---

## Qualification states

Operator-facing business states (PO list), mapped to ARCH-001 process states:

| Business state | Meaning |
|----------------|---------|
| UNQUALIFIED | No meaningful intent |
| ENGAGED | Open/click only — never auto-handoff |
| RESPONSE_RECEIVED | Reply/enquiry without explicit requirement |
| QUALIFICATION_REQUIRED | Identity or operator confirm missing |
| QUALIFIED | Criteria satisfied — handoff allowed |
| NOT_INTERESTED | Declined |
| SUPPRESSED | Unsubscribe / suppression |
| HANDED_OFF | Handoff complete |

Process states (ARCH-001): `NEW` → `ROUTING` → `HANDOFF_IN_PROGRESS` → `HANDOFF_COMPLETE` / `HANDOFF_FAILED`.

Default policy: **no auto-qualify on open/click/reply**. Explicit intent + identity + operator confirm required.

---

## Matching

Before creating a Contact:

1. Match **email** (normalized)  
2. Else match **phone** (last 10 digits)  
3. Else progressive create (name + mobile) — fixture directory, or live `ecmContactService.register` when mode=live  

Duplicate email or phone reuses the existing Contact.

---

## Opportunity creation

Only on **qualified handoff**. Creates a **Dialogue** Opportunity (identity only) via the existing Opportunity Registry contract (`createAsDialogue: true`). Does **not** invent product or amount. Does **not** alter Opportunity lifecycle. `sourceCampaignLabel` stamps the source campaign on the existing field.

---

## Ownership

Configurable `MarketingRoutingPolicy`:

- `SINGLE_USER`  
- `ROUND_ROBIN`  
- `USER_POOL`  
- `RULE_BASED` (territory/city → member)  

Idempotent assignment: one `qualificationId` → one `assigneeUserId`. No hardcoded employee.

---

## Audit

`qualification.handoff.complete` records: campaign, fingerprint (redacted), qualification state, handoff time, Contact id, Opportunity id, assigned user, source campaign, `noLeadEntity: true`.

---

## Safety

| Flag | Value |
|------|--------|
| `ENTERPRISE_MARKETING_EXECUTION_ENABLED` | false |
| `ENTERPRISE_MARKETING_MASS_HANDOFF_ENABLED` | false |
| `ENTERPRISE_MARKETING_HANDOFF_ENABLED` | true (explicit QUALIFIED only) |
| `ENTERPRISE_MARKETING_HANDOFF_MODE` | `fixture` (default) |

Direct Contact/Opportunity create from Marketing remains blocked. Mass convert API action is refused. Unqualified handoff returns `NOT_QUALIFIED`.

---

## Components created

| Path | Purpose |
|------|---------|
| `src/types/enterprise-marketing-qualification.ts` | States, policy, records, handoff DTOs |
| `src/constants/enterprise-marketing-engine/qualification.ts` | Labels + default policy |
| `src/lib/enterprise-marketing-engine/qualification/*` | Evaluate + identity match |
| `server/services/enterprise-marketing-engine/qualification.service.ts` | Ingest / qualify / handoff |
| `server/services/enterprise-marketing-engine/routing.service.ts` | Configurable ownership |
| `server/services/enterprise-marketing-engine/adapters/fixture-*.ts` | Isolated identity + Dialogue stubs |
| `server/services/enterprise-marketing-engine/adapters/live-*.ts` | Existing ECM + Opportunity Registry |
| `src/app/api/admin/marketing/qualifications/route.ts` | Admin API |
| `src/components/catalyst-one/admin/marketing/marketing-responses-panel.tsx` | Qualification queue UI |

---

## Explicitly unchanged

- Opportunity lifecycle  
- Contact Registry architecture  
- Lender workflow  
- Deal architecture  
- No Lead entity introduced  

---

## Verification

```bash
npm run verify:co-marketing-mkt-11
```

Covered: existing Contact, new Contact, duplicate email, duplicate phone, unqualified refusal, qualified handoff, ownership assignment, Opportunity create, audit trail, mass conversion refused.

TypeScript (`tsc --noEmit`): ✅

---

## Out of scope (STOP)

- ❌ Automatic mass conversion  
- ❌ Vercel / production deploy  
- ❌ Live ECM writes in default mode  
- ❌ Product/amount fabrication on Opportunity  
- ❌ Later marketing sprints  

---

## Final status

| Gate | Status |
|------|--------|
| Implementation | ✅ Complete |
| Verify script | ✅ (run locally) |
| Deploy | ⏸️ Not started |
| Business Certification | ⏸️ Awaiting Product Owner |

**STOP after MKT-11 verification.**
