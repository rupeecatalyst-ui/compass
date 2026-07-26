# CO-P0-006 Wave 1 — Business Impact Summary

**Date:** 2026-07-23  
**Audience:** Business / Product certification  
**Scope:** Wave 1 only (new Deal create)

---

## What changes for the business

| Before | After (Local, primary write ON) |
|--------|----------------------------------|
| Creating a Loan / Deal could succeed in the browser even when Postgres had **no** row | Create succeeds **only if** the Deal is written to the Enterprise Deal Registry |
| Contact “Priyesh-like” cases could leave Contact in DB and Deal only in localStorage | New creates from Contact / Loan / Customer 360 / Loan Information / Strategic ensure path persist to Postgres first |
| My Deals (Enterprise read) could show empty while users believed Deals existed | New Deals appear in the registry that My Deals reads |

## What does **not** change (Wave 1)

- Existing Loan/Deal **updates** still follow the prior local + optional dual-write path  
- Historical localStorage-only Deals are **not** auto-migrated  
- localStorage is **not** removed (still used as workspace cache after successful create)  
- Journey URLs continue to use the client `LoanFile.id` (bridge); Enterprise id is stored alongside as `enterpriseDealId`

## User-visible behaviour

1. Submit create → brief **Saving…** state  
2. Success toast **only after** registry create; Deal number may appear in the message when returned  
3. If API / network / validation fails → **error toast**, form stays open, **no** “created” celebration  
4. Emergency rollback (ops): primary-write flag `false` restores previous create behaviour

## Business value

Closes the integrity gap identified in CO-P0-004 / CO-P0-005: Enterprise Deal Registry becomes the **System of Record for new Deals**, so operational and Mission Control surfaces that read Postgres are no longer blind to newly created work.

## Deploy posture (governance)

- **Local:** ready for business acceptance of Wave 1  
- **Preview / Production:** **not** deployed — require explicit approval after Local Certification acceptance (CO-GOV-001)
