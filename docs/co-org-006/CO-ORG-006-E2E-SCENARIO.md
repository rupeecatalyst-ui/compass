# Business Certification — E2E Scenario Pack

**Standard:** CO-QA-001 — Enterprise Regression Certification  
**Sprint:** CO-ORG-006  
**Scenario ID:** `CO-ORG-006-E2E-001`

### Business objective

Prove one Contact can progress through Opportunity → Opportunity Workspace → Lender Pipeline → Disbursement signal, with Activity / Documents / Dialogue / Tasks / Timeline / Audit / Chanakya / Mission Control observing real enterprise data (no invented KPIs).

### Canonical business path

```text
Contact (ECM)
  → Start Loan Journey → Draft Opportunity
  → Loan Journey Hub → Lead Information (Product + Amount) → Requirement Captured
  → Opportunity Workspace (Creation → Document Center → Credit → LIFE)
  → Move to Deal → Lender Pipeline (Enterprise Deal)
  → Advance lender case toward Disbursed
  → Accounting (expect honest empty / SSOT pending — do not invent ₹)
  → CHANAKYA Radar (Deal appears in active intelligence when not Disbursed)
  → Mission Control Executive Briefing (certified EBI snapshot or empty-awaiting)
```

### Preconditions

| Item | Value |
|------|--------|
| Environment URL | _Fill at BAT_ |
| Auth | `admin@compass.com` / `Admin@123` (frozen SUPER_ADMIN) |
| Migrations applied | Incl. EAR + Business Notes + Deal/Opportunity/ECM |
| Persistence mode | `ENTERPRISE_PERSISTENCE_MODE=prisma` (+ `NEXT_PUBLIC_` mirror) |
| Demo seeds | **Off** for production-truth BAT |
| Seed / fixture identities | Fresh Contact + Product known in Product Registry |

### Steps (live application)

1. Open **Contacts** → create/select Contact (minimum: Full Name + Mobile for Primary Applicant path).  
2. **Start Loan Journey** → land on `/loan-journey` with Draft Opportunity (identity only).  
3. Open **Lead Information** → save Product + Required Amount → lifecycle **Requirement Captured**.  
4. Enter **Opportunity Workspace** stages: Creation → Document Center (upload ≥1 applicant or shared doc) → Credit → LIFE.  
5. Capture a **Business Note** from OW header Notes icon; confirm it appears in Notes panel.  
6. Create an **ETE Task** via Create Task for this Opportunity.  
7. Add Dialogue / activity entry if available; confirm EAR-backed chronology.  
8. **Move to Deal** → open `/deals/:dealId` → **Lender Pipeline** → Identify Lender → advance stages.  
9. Confirm Deal **Timeline** and Mission Control / Dashboard **Activity** show Deal/note/task-related events (where dual-write applies).  
10. Move a lender case to **Disbursed** (or filter My Deals disbursed) — confirm stage marker, not a separate desk.  
11. Open **Accounting** — confirm SSOT-pending / empty honest state (no fake ₹ as production truth).  
12. Open **CHANAKYA Radar** — confirm Deal intelligence for active (non-disbursed) deals; advisory only.  
13. Open **Mission Control → Executive Briefing** — certified snapshot or empty-awaiting (no invented KPIs).  
14. Spot-check **Audit**: Org audit / Business Note modification history / soft-delete Recovery for Contact or Opportunity if exercised.

### Expected business outcomes

| # | Observable result | Pass? |
|---|-------------------|-------|
| 1 | Draft Opportunity created without fabricated product/amount | ☐ |
| 2 | Requirement Captured only after Product + Amount saved | ☐ |
| 3 | OW stages preserve `opportunityId` context (no re-pick mid-journey) | ☐ |
| 4 | Document authored only in Document Center; Deal docs customer projection read-only | ☐ |
| 5 | Business Note appears in Notes panel + EAR activity (prisma mode) | ☐ |
| 6 | ETE Task visible in `/tasks` / My Work for the entity | ☐ |
| 7 | One Deal per lender; Lender Pipeline is Deal SSOT | ☐ |
| 8 | Disbursement visible as stage/filter — not invented accounting payout | ☐ |
| 9 | Accounting shows pending/empty — not fake revenue | ☐ |
| 10 | Chanakya Radar uses Deal SSOT metrics; does not block workflow | ☐ |
| 11 | Mission Control does not invent executive KPIs | ☐ |
| 12 | Timeline/Activity surfaces show chronology without parallel fake feeds as truth | ☐ |

### Negative / regression checks

| # | Must not happen | Pass? |
|---|-----------------|-------|
| 1 | Contact → Opportunity Workspace shortcut that skips Lead Information when product/amount missing | ☐ |
| 2 | LoanFile / Soft Go-Live inventing Opportunity business values (CAD-2026-001) | ☐ |
| 3 | Second document repository outside Document Center | ☐ |
| 4 | Chanakya disabling Continue / Back | ☐ |
| 5 | Accounting / Mission Control demo ₹ / SLA % presented as live truth with seeds off | ☐ |
| 6 | Multi-lender snapshot treated as Deal inventory | ☐ |

### Related domains (re-run triggers)

- ECM Contact APIs / progressive create  
- Enterprise Opportunity create/update / uniqueness  
- Document Registry / Document Center  
- Enterprise Deal pipeline runtime / Move to Deal  
- EAR emitters (EDC, Deal Timeline, Business Notes, ECIE, Org)  
- ETE register task  
- EBI / EME certified snapshot for Mission Control  
- Accounting SSOT bind (when delivered — re-run full pack)

### Last run log

| Date | URL | Result | Evidence notes | Runner |
|------|-----|--------|----------------|--------|
| 2026-08-07 | N/A — no deploy | **Not executed** | Architecture certification inventory + engineering gates only | Engineering (CO-ORG-006) |

### Certification gate

- [ ] Scenario Pack executed on live app  
- [ ] All expected outcomes observed  
- [ ] Product Owner acceptance (only then: Business Certified)  

**Engineering verify scripts:** informational only — not a substitute for this pack.
