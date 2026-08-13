# CO-MARKETING-ARCH-001 — Integration Matrix

**Status:** PROPOSED (architecture only)  
**Rule:** REUSE ≠ COUPLING. Any operational extension = **DEPENDENCY / EXTENSION REQUIRED** (PO approval before code).

---

## 1. Matrix legend

| Class | Meaning |
|-------|---------|
| **REUSE** | Call existing capability via published APIs/patterns; do not fork |
| **NEW** | Belongs inside Enterprise Marketing Engine |
| **BOUNDARY** | Explicit handoff / adapter / policy edge |
| **DO NOT REUSE** | Unsuitable; extending would pollute or create dual OS |
| **EXTENSION REQUIRED** | Existing capability needs additive change — report, do not silent-modify |

---

## 2. Master integration matrix

| Capability | Class | How Marketing uses it | Must NOT |
|------------|-------|----------------------|----------|
| **ECM (Contact / Customer)** | REUSE + BOUNDARY | Search + progressive create **only at qualification handoff** | Treat sheet rows as Contacts; bulk-create Contacts from audience |
| **Opportunity Registry / Service** | REUSE + BOUNDARY | Create Opportunity after qualification + identity resolution | Auto-create from open/click; invent Lead; bypass uniqueness rules |
| **Enterprise Deal Registry** | REUSE (read) | Attribution / ROI joins after Deal exists | Marketing-owned Deal creation from campaigns |
| **ENE** | REUSE | In-app notify assignees (CHANAKYA persona) | Bulk marketing email; second notify bus |
| **CHANAKYA (persona)** | REUSE | Internal C1 notification voice | Auto WP-facing CHANAKYA messaging |
| **ENCE** | DO NOT REUSE (as ESP) | Optional pattern reference only | Enable as bulk campaign sender |
| **ECC sender concepts** | BOUNDARY / conceptual REUSE | Inform Marketing SenderIdentity model | Merge marketing subdomain into ops mailbox config blindly |
| **Auth** | REUSE | Session / org context on all Marketing APIs | Separate Marketing auth silo |
| **RBAC / permissions** | REUSE + EXTENSION REQUIRED | Gate Marketing permissions; handoff respects ops perms | Bypass Opportunity/Contact access via Marketing |
| **Organization context** | REUSE | Org-scoped campaigns/sources/assets | Cross-org sheet leakage |
| **Audit infrastructure** | REUSE + NEW events | MarketingAuditEvent aligned to org audit | Silent campaign changes |
| **Event infrastructure** | REUSE patterns + NEW | Engagement/qualification events in EME; optional emit to platform bus | Duplicate platform event stores |
| **Scheduling / cron** | REUSE pattern + NEW routes | `/api/cron/marketing/*` + leases like metrics cron | Long-running HTTP blasts |
| **Notifications (internal)** | REUSE ENE | Per NotificationPolicy | New notification engine |
| **Document Registry / Opportunity Document Center** | DO NOT REUSE | — | Store banners/creatives as loan documents |
| **Marketing Asset Library** | NEW | Creatives, logos, blocks | Mix into Document Registry |
| **ETE** | BOUNDARY (optional later) | Optional post-handoff task generation | Campaign send queue / marketing follow-up engine |
| **EBI / EME metrics / EI** | BOUNDARY | Consume ops metrics for revenue; Marketing owns acquisition funnel metrics | Recalculate Deal/Opp certified formulas in Marketing UI |
| **EC360 excludeFromMarketing** | EXTENSION / REUSE read | Feed Suppression when identity known | Treat as sheet audience SSOT |
| **Partner Marketing desk** | DO NOT REUSE | Keep as WP resource projection | Extend into Campaign Engine |
| **Public site `src/components/marketing/*`** | DO NOT REUSE | Brand site remains separate | Become Campaign Builder |
| **`sourceCampaignLabel`** | BOUNDARY + EXTENSION | Keep display; structured attribution supersedes as SSOT | Sole attribution mechanism |
| **Google Drive/Sheets** | NEW adapter (external) | First Data Source Port implementation | Mirror all rows into Supabase |
| **Email ESP** | NEW adapter | Marketing Email Port | Gmail/Hostinger as bulk engine |
| **WhatsApp BSP** | NEW adapter | Future channel | Separate WhatsApp CRM |
| **Digital ads platforms** | NEW adapters | Future channel | Hard-code one network |
| **Wealth Partner Gateway** | BOUNDARY (future) | WP acquisition notify via partner-safe channels | CHANAKYA internal to partners |
| **Primary navigation** | EXTENSION REQUIRED | Admin Marketing Command Center entry (recommended) | Park as fake CRM module under Contacts/Opps; do not invent dual nav OS |

---

## 3. REUSE detail

### 3.1 ECM

- **Port:** Identity resolution at handoff.  
- **Reuse:** Existing search + progressive Contact create (minimum fields policy).  
- **Boundary:** Marketing Prospect ≠ Contact until handoff.

### 3.2 Opportunity

- **Port:** `createOpportunity` (and provenance-compliant fields).  
- **Reuse:** Lifecycle, uniqueness (Contact+Product+Active), ADR-018 where applicable.  
- **Boundary:** Only after QualificationRecord.

### 3.3 ENE + CHANAKYA

- **Port:** create in-app notification for assignee.  
- **EXTENSION REQUIRED:** Marketing-specific event types / copy catalog entries.

### 3.4 Auth / RBAC / Org / Audit / Cron

- Standard enterprise wrappers around new Marketing API routes.  
- **EXTENSION REQUIRED:** permission keys + admin nav registration + audit event names.

---

## 4. NEW (inside EME)

| Component | Rationale |
|-----------|-----------|
| Campaign / CampaignVersion | Acquisition SSOT |
| Data Source Port + Google Sheets adapter | External audience |
| Audience Engine | Filters, eligibility compose |
| Recipient Execution Ledger | Idempotent send state |
| Content / Template / Block editor model | Rich campaigns |
| Marketing Asset Library | DAM boundary |
| Batch / pacing worker | Serverless execution |
| Channel adapters (Email/WA/Digital) | Provider neutrality |
| Deliverability Guard | Send safety |
| Suppression ledger | Marketing eligibility |
| Qualification + Routing policies | Pre-ops response handling |
| Attribution + Marketing analytics | Acquisition intelligence |
| Marketing Command Center UI | Operator desk |

---

## 5. BOUNDARY contracts (must be explicit in implementation waves)

| Boundary | Contract sketch |
|----------|-----------------|
| Sheets → EME | Stream rows; return fingerprintable identity fields only as needed |
| EME → ESP | SendRequest + IdempotencyKey; WebhookEvent normalized |
| EME → ECM | ResolveContactQuery; CreateProgressiveContactCommand |
| EME → Opportunity | CreateOpportunityFromMarketingHandoff (attribution required) |
| EME → ENE | NotifyMarketingQualificationAssigned |
| EME ↔ Suppression | Check before claim; write from webhooks/manual/EC360 |

---

## 6. DO NOT REUSE (explicit)

1. Partner Marketing / WP `/marketing` desk as Campaign OS  
2. Public COMPASS marketing components as Campaign Builder  
3. ENCE as bulk marketing email provider  
4. Document Registry as creative asset store  
5. ETE as blast scheduler  
6. LoanFile / Deal as marketing audience store  
7. Inventing a Lead registry  
8. Gmail / normal Hostinger mailbox as blast engine  

---

## 7. DEPENDENCY / EXTENSION REQUIRED (PO must approve separately)

| # | Extension | Why | Where | Impact | Recommended solution |
|---|-----------|-----|-------|--------|----------------------|
| D1 | Structured marketing attribution on Opportunity | Free-text label insufficient for ROI chain | Opportunity model + Lead Information display | Additive fields; provenance docs | `marketingCampaignId`, `marketingQualificationId`, `marketingChannel`; keep `sourceCampaignLabel` synced for humans |
| D2 | ENE event types | Assignee alerts | ENE constants/catalog | Additive | New CEI titles for qualification assigned |
| D3 | Admin navigation + routes | Discoverability | `navigation.ts`, Administration Console, routes constants | Additive admin surface | `/admin/marketing/*` under Administration (recommended) |
| D4 | RBAC permission keys | Least privilege | permissions matrix | Additive | `marketing.campaign.create\|approve\|send`, `marketing.source.*`, `marketing.asset.*`, `marketing.analytics.view`, `marketing.routing.manage` |
| D5 | Object storage bucket | Creatives | infra/env | New storage | Marketing DAM; not Document Registry |
| D6 | Cron/job routes | Batch pacing | API cron | New workers | Lease pattern; optional external queue later |
| D7 | EC360 → Suppression bridge | Operational DNC | Suppression service | Read-only consume | Map excludeFromMarketing → SuppressionRecord |
| D8 | (Optional) Partner notify path | WP acquisition | Partner Gateway | Partner-safe messages | No CHANAKYA internal |
| D9 | Identity fingerprint policy | Sheet mutations | Audience identity strategy | Product rule | PO: require external key column vs email/phone hash |
| D10 | PII retention on ledger | Compliance | RecipientExecutionLedger | Privacy | Hash-only vs minimal sendable fields — PO decision |

---

## 8. Existing “marketing” components — disposition

| Component | Production role | Disposition |
|-----------|-----------------|-------------|
| `partner-marketing.service.ts` / WP Marketing | Partner creatives projection | **Isolate** — do not extend |
| `src/components/marketing/*` | Public site | **Isolate** — do not extend |
| `sourceCampaignLabel` | Manual attribution text | **Boundary** — display; structured EME attribution becomes analytic SSOT |

---

## 9. Preserve existing architecture (implementation constraint)

Future implementation prompts must preserve:

- Existing SSOTs, workflows, permissions, APIs, operational behaviour  
- Navigation architecture (Administration = configuration)  
- ADR-018 / CAD-2026-001 / Opportunity uniqueness  
- No silent dual-path for Contact/Opportunity create  

Marketing is **additive and isolated**.

---

## STOP

Integration design only. Awaiting Product Owner review.
