# CO-C1-ACCOUNTING-ACTIVATION-001 — Accounting Certification Baseline

**Date:** 2026-08-13  
**Mode:** Activation & certification baseline (not a redesign / refinement sprint)  
**Branch tip context:** Catalyst One certified tree (post CO-C1-VERCEL-CERTIFICATION-DEPLOY-001)  

---

## Final principle applied

**Activate first. Certify second. Refine third.**

No Accounting formulas, tax policy, Marketing, Contact 360, Lender 360, Deal architecture, or Mission Control changes.

---

## A. Activated (this sprint)

| Change | Purpose |
|--------|---------|
| URL deep-link → workbench resolution | Honor existing `?tab=`, `?action=`, `?workbench=` links from Dashboard / EI |
| Workbench ↔ URL sync | Certification routes are bookmarkable / shareable |
| Primary nav badge **Awaiting SSOT** | Matches `ENTERPRISE_MODULE_ACTIVATION` honesty (was missing) |
| `buildAccountingWorkbenchHref` helper | Canonical certification hrefs |
| Verify script `verify:co-c1-accounting-activation-001` | Engineering gate for activation baseline |

### Files touched

- `src/lib/accounting-workspace/resolve-workbench.ts` (new)
- `src/lib/accounting-workspace/index.ts`
- `src/components/catalyst-one/accounting/accounting-workspace.tsx`
- `src/config/navigation.ts`
- `scripts/co-c1-accounting-activation-001-verify.mjs`
- `package.json` (verify script entry)
- `docs/co-c1-accounting-activation-001/CO-C1-ACCOUNTING-ACTIVATION-001-REPORT.md`

---

## B. Already complete (no change required)

| Surface | Status |
|---------|--------|
| Primary nav → `/accounting` | Already present |
| Accounting Workspace shell + workbench band | Already present |
| Workbenches: Dashboard, Invoices, Receivables, Payouts, Collections, GST & Tax, Invoice Party Master, Reports, Notes | Already present |
| Invoice Party Master UI + Prisma APIs (`/api/invoice-parties`) | Live when `ENTERPRISE_PERSISTENCE_MODE=prisma` |
| Deal Invoice Party field (pipeline not blocked) | Already certified posture (CO-BUG-001 / CO-DWS-001C) |
| Empty-honest ledger model (no invented ₹ KPIs) | Already CO-ORG-004 compliant |
| Org Bank Accounts (Organization Workspace) | Adjacent MDM; not Accounting workbench |

---

## C. Existing gaps (certify as-is; refine later)

| Area | Gap |
|------|-----|
| Invoice ledger SSOT | Not bound — empty invoices; create/PDF/share/mark-paid are mock toasts |
| Receivables | Metrics + capability cards; no durable receivable ledger API |
| GST Invoice Management | Capability cards + party GSTIN fields; no GSTR posting engine |
| Expected vs Actual Payout | UI table empty; no payout SSOT/API |
| TDS Tracking | Party master rate flags + GST workbench capability card only |
| Short Payment Tracking | **Not implemented** |
| Debit/Credit Notes | Credit-notes lane / activity kinds only; no posting engine/DB |
| Bank Receipt Allocation | **Not in Accounting module** (org bank accounts exist separately) |
| Profitability | Reports capability card only; formulas not Deal-keyed SSOT |
| Accounting Dashboard KPIs | Honest zeros until Registry bound |
| EFOE | In-memory foundation; **not wired** to Accounting UI |
| `EnterpriseDealAccountingLink` | Prisma model exists; no Accounting UI/API consumer |

---

## D. Blockers for full Product Owner certification of live finance

1. **Deal-keyed Accounting Registry / ledger SSOT not bound** — primary blocker for invoices, receivables, payouts, GST figures.  
2. No invoice / receivable / payout / GST / TDS / credit-note / bank-allocation APIs beyond Invoice Party Master.  
3. Authenticated BAT of Invoice Party Master requires prisma persistence + ACCOUNTS (or equivalent) role.  

**Not blockers for baseline activation:** module is navigable; workbenches reachable; honesty banners present; deep-links work.

---

## E. Certification routes (Product Owner)

Base: `/accounting` (also primary nav **Accounting**)

| Workbench | Route |
|-----------|--------|
| Dashboard | `/accounting` or `/accounting?workbench=dashboard` |
| Invoices | `/accounting?workbench=invoices` · legacy `/accounting?action=invoice` |
| Receivables | `/accounting?workbench=receivables` |
| Payouts | `/accounting?workbench=payouts` |
| Collections | `/accounting?workbench=collections` |
| GST & Tax | `/accounting?workbench=gst_tax` |
| Invoice Party Master (**live subset**) | `/accounting?workbench=invoice_party_master` |
| Reports / revenue deep-link | `/accounting?workbench=reports` · legacy `/accounting?tab=revenue` |
| Notes | `/accounting?workbench=notes` |

Deal-side Invoice Party (lifecycle integrity): Deal Workspace / commercial payee field → same Prisma Invoice Party Master.

---

## F. Data dependencies for meaningful certification

| Need | Notes |
|------|--------|
| `ENTERPRISE_PERSISTENCE_MODE=prisma` (+ public mirror) | Required for Invoice Party APIs |
| Organization + authenticated user with Accounting permissions | ACCOUNTS role has full accounting matrix |
| Invoice Party records (create via Master) | Contact/Company Registry links |
| Deal with Invoice Party selected | For Deal→Accounting party integrity (not ledger) |
| Ledger invoices / payouts / GST | **Not available** until Accounting Registry SSOT programme |

---

## G. No-change confirmation

Explicitly confirmed **not modified**:

- Marketing execution / provider flags  
- Contact 360 / Lender 360  
- Deal SSOT / LoanFile retirement rules  
- Opportunity / Deal terminology  
- Mission Control / COMPASS / Wealth Partner  
- Accounting tax formulas / profitability formulas  
- Unrelated registries or workflows  

Only Accounting **access activation** (deep-links + nav honesty + verify) was applied.

---

## Quality gate

| Gate | Result |
|------|--------|
| `npm run verify:co-c1-accounting-activation-001` | **PASS** |
| Full TSC | **PASS** |
| Production build | **PASS** |
| `npm run verify:co-org-004` | **PASS** (empty-honest accounting) |
| `npm run verify:co-bug-001` | **PASS** (pipeline not blocked by Invoice Party) |
| Marketing flags | Remain **OFF** |

---

## Recommended Product Owner certification order

1. Open `/accounting` — confirm Awaiting SSOT badge + honesty banner.  
2. Walk every workbench via nav + deep-links above.  
3. Certify **Invoice Party Master** CRUD against prisma (live).  
4. Confirm empty ledgers do **not** invent revenue.  
5. Document refinement requests from gaps in §C for follow-up controlled sprints.
