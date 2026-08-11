# CO-CCC-001 — Module Walkthrough

**Audience:** Product Owner · Super Admin  
**Route:** Administration → Organization → **Corporate Compliance Center**  
**URL:** `/organization/compliance-center`

## Positioning

CCC is an **Organization-domain** module. It is **not** Opportunity Document Center.

| Action | Where |
|--------|-------|
| Upload / replace binaries | Organization Documents |
| Enrich compliance metadata | CCC repositories |
| Manage legal entities | CCC → Entity Registry |
| Build institution packages | CCC → Package Builder |
| Dispatch packages | CCC → Dispatch (EDDE) |
| View alerts | CCC → Overview / Intelligence |

## Section guide

1. **Overview** — Intelligence KPIs (expiring, expired, missing FY, pending approval, pending dispatch) + quick links.
2. **Entity Registry** — Add legal entities (e.g. Rupee Catalyst, PeakProfits). Primary entity bootstraps from Organization profile.
3. **Corporate / Banking / Financial / Compliance / Brand repositories** — Filtered views of the same `OrganizationDocument` SSOT. Edit metadata (entity, approval, FY, current version, expiry). Financial FY filter supported.
4. **Institution Requirements** — Register banks, NBFCs, HFCs, insurers, AMCs, regulators, auditors, partners, vendors, government.
5. **Package Builder** — Define reusable packages (onboarding, renewal, KYC, audit…). **Build Package** resolves latest **approved** documents automatically.
6. **Dispatch (EDDE)** — Dispatch Registry of sends (simulated delivery in foundation). Future: email / secure links / WhatsApp without redesign.
7. **Compliance Intelligence** — Derived Chanakya-ready alerts.

## Typical PO flow (Rupee Catalyst)

1. Ensure prisma mode + migration applied.
2. Open CCC → confirm primary entity.
3. Add PeakProfits (or other) entity if needed.
4. Upload GST / PAN / COI / financials via Organization Documents.
5. In CCC repository views → Approve + bind entity (+ mark current FY version for financials).
6. Add HDFC Bank (or target institution).
7. Create “New Lender Onboarding” package → Build.
8. Review Dispatch Registry after send.
9. Check Intelligence for gaps.

## What CCC does not do (by design)

- Does not author Opportunity / Deal customer documents
- Does not redesign Organization Workspace chrome
- Does not store a second document binary
