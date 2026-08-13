# CO-C1-REFINEMENTS-20260812 — Implementation Report

**Package:** Consolidated Catalyst One refinements  
**Date:** 2026-08-12  
**Status:** Local implementation complete · **NO Vercel deploy** (PO stop condition)  
**TypeScript:** `npx tsc --noEmit` — **PASS**

---

## Scope compliance

| Preserved | Status |
|-----------|--------|
| Existing SSOTs (Opportunity, Deal, EAR, ECC, ECM, ELD) | Yes |
| Routing / navigation architecture | Extended only (org Communication routes; no new primary nav) |
| Marketing Engine | Untouched |
| Saarthi / parked AI | Untouched |
| No duplicate activity / communication / Deal stores | Yes |
| No migrations executed | Yes |
| No Vercel deploy | Yes |

---

## Refinement 1 — CO-C1-FOLLOWUP-002 (Contextual Send Email)

### Architecture / SSOT
- Entry remains Action Center **Send Email** (`EmailContextWorkspace`) — no separate Follow-up button.
- Participants: `resolveDealCommunicationParticipants` / `resolveLoanCommunicationParticipants`.
- Templates: `COMMUNICATION_TEMPLATE_REGISTRY` (+ follow-up purpose templates).
- Outbox → ENCE simulation + EDC timeline + **EAR emit** (`sourceSystem: outbox`).
- Corporate signature: ECC profile + `RUPEE_CATALYST_CORPORATE_BRAND` via `appendCorporateEmailSignature`.

### Implementation summary
- Recipient type groups: Customer · Wealth Partner · Lender · Internal Employee.
- Customer / Wealth Partner / Lender constrained to **transaction-resolved** parties (no Customer Registry browse; lenders from opportunity/deal pipeline only, with RM contact + email when present).
- Internal Employee: transaction RM plus authorized employee search (`searchAssignableUsers`).
- Follow-up templates: Login · Status · Approval · Disbursement · Documents (extensible registry).
- Context placeholders: customer, product, stage, file/opportunity/deal numbers, lender, RM.
- WhatsApp uses channel-specific plain-text identity (`appendCorporateWhatsAppIdentity`) — not HTML email signature.

### Key files
- `src/components/catalyst-one/action-center/workspaces/email-context-workspace.tsx`
- `src/components/catalyst-one/action-center/workspaces/whatsapp-context-workspace.tsx`
- `src/lib/enterprise-action-center/resolve-participants.ts`
- `src/constants/enterprise-action-center/communication-templates.ts`
- `src/lib/enterprise-communication-center/corporate-identity.ts`
- `src/constants/enterprise-communication-center/corporate-branding.ts`
- `src/components/catalyst-one/action-center/enterprise-outbox-provider.tsx`
- `src/components/catalyst-one/action-center/deal-action-center.tsx`

### Known gaps
- Opportunity Action Center path may still use loan-shaped participants (Deal path is primary refinement).
- Lender email depends on stored `lenderSalesContactOfficialEmail`; missing emails still show “email when available”.
- Delivery remains ENCE simulation-gated (unchanged).

### Verification
- TypeScript: PASS  
- Manual BAT recommended: Send Email from Deal Workspace for each recipient type + confirm Outbox body includes signature + EAR/communications event after dispatch.

---

## Refinement 2 — CO-C1-EMAIL-CONFIG-001 (Operational Email Configuration)

### Architecture / SSOT
- Operational email = **Enterprise Communication Center (ECC)** — not Marketing sender identities.
- Preferred path: **Organization → Communication → Email Configuration**.
- Reuses existing ECC admin UI + profile seeds (sender, reply-to, SMTP provider, signature, active flag).
- Operational template catalogue is config-driven (`OPERATIONAL_EMAIL_TEMPLATE_CATALOG`) — separate from Marketing.

### Implementation summary
- Routes: `/organization/communication`, `/organization/communication/email`.
- Navigation: `organizationChildren` entries for Communication + Email Configuration.
- Email Configuration page mounts ECC admin + operational template catalogue strip.
- Branding defaults + fuller Connect profile signature/footer for corporate signature reuse.

### Key files
- `src/app/(dashboard)/organization/communication/page.tsx`
- `src/app/(dashboard)/organization/communication/email/page.tsx`
- `src/constants/routes.ts`
- `src/config/navigation.ts`
- `src/constants/enterprise-communication-center/corporate-branding.ts`
- `src/constants/enterprise-communication-center/profiles.ts`
- Existing: `enterprise-communication-center-admin.tsx`, ECC APIs/services

### Known gaps
- SPF/DKIM/DMARC/bounce/retry remain provider/ops concerns; UI surfaces SMTP connection status via existing ECC (credentials stay server-side). No new Marketing merge.
- Settings left-nav still personal settings; Organization Communication is under Organization / Administration consumers (per existing org nav model).

### Verification
- TypeScript: PASS  
- Manual: open `/organization/communication/email` and confirm ECC profiles + operational template catalogue render.

---

## Refinement 3 — Dashboard Live Feed

### Architecture / SSOT
- Feed loader: `loadNewOpportunitiesFeed` (Opportunity Registry `createdAt` filter).
- Default preset SSOT: `NEW_ARRIVALS_DEFAULT_PRESET`.

### Implementation summary
- Default period: **Last 7 Days** (`last_7`) — user can change; no forced reset after change.
- Sort: **newest-created first** (`createdAt` descending).
- Each row shows **Created** and **Last Updated** from distinct Opportunity timestamps (`createdAt` / `updatedAt`).

### Key files
- `src/constants/user-home-dashboard/new-arrivals.ts`
- `src/lib/user-home-dashboard/command-center/load-new-opportunities.ts`
- `src/types/dashboard-command-center.ts`
- `src/components/catalyst-one/user-home-dashboard/new-opportunities-section.tsx`

### Verification
- TypeScript: PASS  

---

## Refinement 4 — Dashboard density / two-column layout

### Implementation summary
- Live Feed card footprint reduced (~60% height: tighter KPI/feed padding, `max-h-[13.5rem]`).
- Desktop: New Opportunities (7 cols) + New Arrivals pulse / Attention Required (5 cols).
- Tablet/mobile: stacks naturally (`grid-cols-1` → `lg:grid-cols-12`).

### Key files
- `src/components/catalyst-one/user-home-dashboard/user-home-dashboard.tsx`
- `src/components/catalyst-one/user-home-dashboard/new-opportunities-section.tsx`

### Verification
- TypeScript: PASS  

---

## Refinement 5 — CO-C1-CONTACT-360 (Contact 360°)

### Architecture / SSOT
- Opens from Contact Registry → existing `ContactWorkspaceModal` (role-neutral chrome labeled **Contact 360°**).
- Contact Score: existing `computeEcmContactScore` / persisted `contactScore`.
- Snapshot / derived links: `composeContact360Snapshot` over Opportunity / Deal / Company / ECM relationships / EAR.
- Activity tab: EAR via `TransactionActivityTimeline` scope `mode: "contact"` — **no new activity store**.
- Explicit Add Relationship: working dialog → `upsertEcmContactRelationship` (for non-derivable links only).

### Implementation summary
- Header: Contact 360° badge, Contact Score, roles, owner, mobile/email/location, created/updated.
- Overview: Relationship / Business Snapshot KPIs + auto-derived relationship list.
- Timeline tab renamed **Activity** and wired to EAR.
- Add Relationship opens functional dialog (no longer dead tab switch to Companies).

### Key files
- `src/components/catalyst-one/contacts/contact-workspace-modal.tsx`
- `src/components/catalyst-one/contacts/add-explicit-relationship-dialog.tsx`
- `src/lib/enterprise-contact-master/compose-contact-360.ts`
- `src/constants/enterprise-contact-master/lifecycle.ts`
- `src/lib/enterprise-activity-registry/transaction-timeline.ts`
- `src/components/catalyst-one/transaction-activity-timeline/transaction-activity-timeline.tsx`

### Known gaps
- Opportunities / Loans / Documents entity tabs remain progressive (snapshot covers KPIs first).
- Deal matching by name is a soft fallback when `primaryContactId` is absent.
- Source / photo / company fields show when present on ECM; photo remains avatar glyph unless asset exists.

### Verification
- TypeScript: PASS  

---

## Refinement 6 — CO-C1-LENDER-360 (Lender 360°)

### Architecture / SSOT
- Opens from **Lenders → Lender Registry → row click** (`EnterpriseLenderDirectorySlideOver`) — no new primary nav item.
- Lender Score: existing directory `activityScore` (ops heuristic) surfaced prominently — not a second scoring engine.
- Activity: EAR aggregated by lender-linked Deal / Opportunity IDs (`mode: "lender"`) — **no lender-specific activity DB / no migration**.

### Implementation summary
- Header branded **Lender 360°** with Lender Score + product chips.
- Summary KPIs include Lender Score / Programs.
- New **Activity** tab consuming EAR via deal aggregation.

### Key files
- `src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx`
- `src/constants/enterprise-lender-directory/ops.ts`
- `src/lib/enterprise-activity-registry/transaction-timeline.ts`

### Known gaps
- No Prisma `lenderId` on EAR (intentionally avoided migration); activity completeness depends on Deal/Opp linkage.
- `activityScore` remains the directory heuristic until a certified Lender Score formula is separately approved.

### Verification
- TypeScript: PASS  

---

## Refinement 7 — Deal assignee + stage consistency

### Investigation (root cause)
1. **Stage:** Registry stores LenderCaseStage in `grossStage`, but list UI projected to PipelineStage (`lost` → `pre_login`) and journey cards passed projected `grossStage` as `lenderCaseStage`, so Lost appeared as Pre-Login/Identified on My Deals while Workspace showed Lost.
2. **Assignee:** Journey cards showed lender contact name, not Deal assignee (`assignedUsers` / `relationshipManagerName`).

### Fix
- Added canonical `lenderCaseStage` on `DealRegistryRow` from Deal SSOT.
- Journey railway / progress / board use `lenderCaseStage` for overlays.
- Cards show **assignee** (assigned users / RM) plus lender contact secondary; stage label from LenderCaseStage labels.

### Key files
- `src/types/deal-registry.ts`
- `src/lib/enterprise-deal/map-deal-to-registry-row.ts`
- `src/lib/my-deals/deal-registry.ts`
- `src/lib/my-deals/group-opportunities.ts`
- `src/lib/my-deals/derive-opportunity-executive-summary.ts`
- `src/components/catalyst-one/my-deals/opportunity-lender-journey-card.tsx`
- `src/components/catalyst-one/my-deals/deal-lender-journey-board.tsx`

### Known gaps
- PipelineStage projection still maps `lost` → `pre_login` for legacy LoanFile-shaped filters; **display** now prefers `lenderCaseStage` / `grossStageLabel`.

### Verification
- TypeScript: PASS  
- Manual BAT: Mark Deal Lost in Workspace → My Deals card must show Lost + same assignee after refresh.

---

## Regression / verification matrix

| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) | ✅ PASS |
| Targeted lint | ⚠️ Not run as full-repo lint (package-wide) — recommend spot-check changed files in BAT |
| Targeted build | ⏸️ Not run (PO: no deploy; local tsc gate used) |
| Marketing Engine | Untouched |
| EAR single chronology | ✅ reused |
| Vercel deploy | ❌ intentionally not performed |

---

## Manual BAT checklist (Product Owner)

1. **Send Email** — Customer auto-resolved; WP auto-resolved; lenders only from pipeline; internal employee search; follow-up templates; signature on queue; EAR after dispatch.  
2. **Email Configuration** — `/organization/communication/email` loads ECC (not Marketing).  
3. **Dashboard** — default Last 7 Days; changeable; newest created first; Created + Last Updated visible; dense two-column desktop.  
4. **Contact 360°** — score, snapshot, derived relationships, Activity/EAR, Add Relationship saves.  
5. **Lender 360°** — from Lender Registry click; Lender Score; Activity/EAR aggregation.  
6. **Deal consistency** — Workspace Lost + assignee = My Deals card after refresh.

---

## Stop

Local refinements complete. **Waiting for Product Owner review before any Vercel deployment.**
