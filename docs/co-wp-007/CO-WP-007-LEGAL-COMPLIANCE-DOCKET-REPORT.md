# CO-WP-007 — Enterprise Wealth Partner Compliance & Legal Docket

**Status:** Implementation complete (static verify) · Ready for BAT  
**Change control:** No database migrations · No live-data bulk mutation · No Vercel deploy  

---

## Objective

Standard onboarding, legal, and compliance framework for every Wealth Partner. Legal Docket is generated automatically from Catalyst One templates + Enterprise SSOT merge fields. Signed documents form the permanent Legal Record.

---

## Architecture (SSOT preserved)

| Layer | Approach |
|---|---|
| Persistence | `EnterpriseWealthPartner.complianceJson.legalDocket` (additive JSON) |
| Document binaries | Enterprise Document Registry linked via Contact/Company — no WP duplicate store |
| Validity | Organisation Policy `WEALTH_PARTNER_LEGAL_ORG_POLICY.agreementValidityYears = 5` |
| Commercial % | Read from Commercial Profile fields — never hardcoded in templates |
| Org party block | Company Profile seed (name, GSTIN, PAN, address, logo initials) |
| Timeline / audit | Docket timeline + WP activity (`legal_*`) |

---

## Legal Docket (12 documents)

1. Cover Sheet  
2. Welcome Letter  
3. Channel Partner Engagement Agreement  
4. Commercial Schedule  
5. Code of Conduct  
6. Privacy & Confidentiality Undertaking  
7. Catalyst One Acceptable Use Policy  
8. Branding & Marketing Guidelines  
9. Compliance Declaration  
10. KYC Summary  
11. Operational Contacts  
12. Digital Acceptance Certificate (stamped on Activate)

---

## Modules created

| Module | Path |
|---|---|
| Types | `src/types/enterprise-wealth-partner-legal-docket.ts` |
| Org policy + catalogue | `src/constants/enterprise-wealth-partner-legal-docket/` |
| Template / merge / generate / compose | `src/lib/enterprise-wealth-partner-legal-docket/` |
| Registry bridge (View/Download/upload) | `…/registry-bridge.ts` |
| API | `…/partners/[partnerId]/legal-docket/route.ts` |
| UI | `wealth-partner-legal-compliance-panel.tsx` |
| Verify | `scripts/co-wp-007-verify.mjs` |

---

## Template engine summary

- Templates are HTML with `{{mergeField}}` tokens.  
- `buildWealthPartnerLegalMergeContext` pulls Contact / WP / Commercial / Org / KYC / bank summary.  
- `applyWealthPartnerLegalMerge` replaces tokens; empty → **Not Specified** (CAD-safe).  
- Commercial Schedule uses `referralSharePercent`, `soleExecutorSharePercent`, `jointExecutorSharePercent` from partner commercial fields.  
- Validity window: `effectiveFrom` + Organisation Policy years → `effectiveUntil`.  
- Renewal reminders: 180 (internal), 90 (partner), 30 (high priority), 0 (expired).  
- Reactivation archives prior document versions and bumps agreement version (v1.0 → v2.0 …).

---

## Legal & Compliance UI summary

Workspace tab renamed **Legal & Compliance**. Displays:

- Agreement Status · Version · Effective From · Valid Until · Days Remaining · Compliance Status · Renewal Status · Selectability  
- Actions: Generate · Mark Sent · Partner Signed · Counter-signed · Activate · Renew/Reactivate · Suspend  
- Documents table: View / Download  
- Version History (all versions remain viewable)  
- Compliance Timeline  
- Renewal Reminders  

Opportunity Source lookup: Expired/Suspended filtered out; Renewal Due shows warning.

---

## Files modified / created

See Implementation Summary in Business Certification Report below.

---

## Business Certification Report

### Development
- Build Status: ⚠️ Static verify only (no full production build required by change control)
- TypeScript Status: ⚠️ Not full `tsc` run in this gate
- Lint Status: ⚠️ Not full lint run in this gate
- Smoke Test Status: ✅ `npm run verify:co-wp-007`

### Git
- Commit Status: ⏸️ Pending end-of-day / milestone commit (not requested)
- Working tree: uncommitted certified work present

### Deployment
- Deployment Status: ⏸️ Not deployed (explicit change control)

### Authentication
Authentication: ✅ Unchanged

### Implementation Summary
- Changed: Complete Legal Docket framework for Wealth Partners
- Architectural decisions:
  - No migrations — docket in `complianceJson`
  - Document Registry remains binary SSOT (Contact/Company links)
  - Five-year validity via Organisation Policy constant (not UI hardcode)
  - Selectability rules enforced at Opportunity source lookup
- Completed: 12 templates, generate/lifecycle API, Legal & Compliance UI, renewal reminders, version history, audit/timeline, selectability
- Partially Completed: ETE push notifications for reminders (scheduled in docket; delivery channel can bind later)
- Pending: BAT on live workspace; optional Admin override UI for org policy years

### Final Status
✅ Ready for Business Acceptance Testing (BAT)
