# CO-MARKETING-ARCH-001 — UI / UX Architecture

**Status:** PROPOSED (architecture only)  
**Product surface name (recommended):** **Marketing Command Center**  
**Engine name:** Enterprise Marketing Engine (EME)  
**Rule:** Modern enterprise campaign-management patterns — do not clone a vendor UI. Align with Catalyst One enterprise UX standards (Five Second Rule, no nested scroll traps in KPI cards, workspace vs registry clarity).

---

## 1. Navigation recommendation

### 1.1 Placement (recommended default)

| Option | Recommendation |
|--------|----------------|
| **A. Administration → Marketing Command Center** | **PREFERRED** — Marketing is configuration + acquisition ops tooling; matches “Administration = configuration” and avoids polluting primary CRM nav (Contacts / Opportunities / Deals) |
| B. Primary nav “Marketing” | Only if PO wants always-visible acquisition desk; risks nav bloat and confusion with Partner Marketing |

**PO decision required.** Architecture assumes Option A unless overridden.

### 1.2 Naming collision control

| Surface | Audience | Name |
|---------|----------|------|
| EME UI | Internal campaign operators | **Marketing Command Center** |
| WP Partner desk | Wealth Partners | **Partner Resources / Marketing** (unchanged) |
| Public site | Prospects | COMPASS site (unchanged) |

Do not merge these UIs.

### 1.3 Proposed route map (logical)

```text
/admin/marketing                     → Command Center home
/admin/marketing/campaigns           → Campaign registry
/admin/marketing/campaigns/new       → Builder (create)
/admin/marketing/campaigns/[id]      → Campaign workspace
/admin/marketing/campaigns/[id]/edit → Builder
/admin/marketing/audiences           → Audience definitions
/admin/marketing/data-sources        → Source bindings + discovery
/admin/marketing/content             → Templates & blocks
/admin/marketing/assets              → Asset library
/admin/marketing/engagement          → Engagement explorer
/admin/marketing/responses           → Qualifications / routing
/admin/marketing/deliverability      → Guard & sender health
/admin/marketing/analytics           → Funnel / comparisons / ROI
/admin/marketing/settings            → Sender identities, defaults, permissions help
```

Context nav (Column 2) under Administration lists these children when Marketing is selected.

---

## 2. Screen architecture

### 2.1 Marketing Command Center (home) — **Dashboard** category

**Five-second purpose:** “How are acquisition campaigns performing, and what needs action?”

Above the fold:

- Deliverability health (HEALTHY/WARNING/CRITICAL)  
- Active campaigns strip (RUNNING / PAUSED / needs approval)  
- Funnel snapshot: Sent → Delivered → Engaged → Qualified → Opportunities  
- Primary CTA: **Create Campaign**

Not a dump of all KPI cards forever — progressive disclosure for deeper analytics.

### 2.2 Campaigns — **Registry** category

- Compact rows: name, product, channel, status, sent/qualified, owner, updated  
- Expand row or open workspace for operational intelligence  
- Filters: status, channel, product, owner  
- Actions: Clone, Archive, Open  

Supports scanning many campaigns without permanent mini-dashboards per row.

### 2.3 Campaign Workspace — **Workspace** category

Chrome (~20–25%): identity (name, status, channel, product), lifecycle actions, Close.  
Primary surface (~75–80%): tabs —

| Tab | Purpose |
|-----|---------|
| Overview | Status, schedule, guard, quick metrics |
| Audience | Source, tab, filters, eligibility estimate |
| Content | Builder / preview entry |
| Execution | Batch policy, progress, ledger sample, errors |
| Responses | Qualifications for this campaign |
| Analytics | Campaign funnel |
| Audit | Approvals & changes |

Lifecycle action bar (permission-gated):

`Save` · `Preview` · `Submit for Review` · `Approve` · `Schedule` · `Run` · `Pause` · `Resume` · `Stop` · `Mark Complete`

**SAVE never sends.** Destructive actions confirm.

### 2.4 Campaign Builder

Multi-step or sectioned enterprise builder (not a toy wizard):

1. Basics — name, objective, product/service  
2. Audience — Data Source → Sheet → Tab (discovered) → filters  
3. Channel & Sender  
4. Content — block canvas  
5. Tracking & compliance — unsubscribe, disclaimer, UTM/attribution  
6. Schedule & batching  
7. Routing & notifications  
8. Review  

**Editor recommendation:** block document canvas with:

- Left: block palette (text, image, banner, product card, CTA, divider, disclaimer, unsubscribe)  
- Center: canvas (desktop/mobile toggle)  
- Right: block properties + personalization tokens  
- Top: subject + preview text + sender preview  

Render path: blocks → email-safe HTML preview.  
Reuse Content Library blocks/templates.  
Version indicator always visible.

### 2.5 Preview / Test

| Mode | Behaviour |
|------|-----------|
| Desktop preview | Rendered HTML frame |
| Mobile preview | Narrow viewport frame |
| Personalization preview | Pick sample row fields or mock tokens |
| Subject / sender / CTA / image | Dedicated checklist panel |
| **Test Send** | Allowlisted recipients; writes TestSendLog only; banner: “Test — not production” |

### 2.6 Audiences

Registry of AudienceDefinitions: source, dataset tab name, filter summary, reuse count, clone.

### 2.7 Data Sources

Connect/configure bindings (credentials via secure settings), **Discover** tabs, health, last schema refresh. No row browser that pages 100k into the UI by default — optional capped sample preview (e.g. 20 rows) for mapping.

### 2.8 Content Library / Templates / Assets

- Templates & reusable blocks  
- Asset grid with tags, categories, archive, permission-aware  
- Separate from Documents module visually and in IA  

### 2.9 Engagement

Event explorer filtered by campaign/channel/event type — read-only operational intelligence.

### 2.10 Responses

Qualification queue: status, campaign, assignee, handoff state, deep link to Contact/Opportunity **after** handoff (respecting RBAC). Pre-handoff: Marketing-only fields.

### 2.11 Deliverability

Guard state, bounce/complaint trends, sender auth checklist (SPF/DKIM/DMARC status flags), throttle advisories, pause reasons.

### 2.12 Analytics

Funnel · campaign/audience/channel/product comparison · ROI (post D1 attribution extension) · export later.

### 2.13 Settings

Sender identities, default batch policy, test allowlists, adapter keys (no secrets in UI plaintext), retention notes.

---

## 3. Lifecycle UX mapping

| User intent | UI control | System |
|-------------|------------|--------|
| Draft work | Save | DRAFT |
| See rendering | Preview | PREVIEW / preview mode |
| Ask approval | Submit for Review | READY_FOR_REVIEW |
| Approve | Approve | APPROVED (+ freeze version) |
| Time it | Schedule | SCHEDULED |
| Start | Run / Publish | RUNNING |
| Hold | Pause | PAUSED |
| Continue | Resume | → RUNNING/SCHEDULED |
| Halt | Stop | STOPPED |
| Done | Complete | COMPLETED |
| Abandon | Cancel | CANCELLED |

Failed campaigns surface recovery: “Clone to draft” / inspect errors.

---

## 4. UX principles (Catalyst One aligned)

1. **Registry vs Workspace vs Dashboard** — do not mix (CO-UX-020).  
2. **Workspace First** in Campaign Workspace — execution/progress over permanent advisory walls.  
3. **No nested scroll in small KPI cards.**  
4. **Accessibility/contrast** on all interactive states.  
5. **Five Second Rule** on Command Center and Builder section headers.  
6. **Chanakya** may later advise on deliverability/copy — **never** block Save/Approve/Run; only Policy/Guard may pause sends.  
7. Do not place Marketing Command Center under Mission Control as RM home substitute.

---

## 5. Permissions → UI

| Permission (proposed) | UI affordance |
|----------------------|---------------|
| `marketing.campaign.create` | Create / Clone |
| `marketing.campaign.approve` | Approve |
| `marketing.campaign.send` | Schedule / Run / Resume |
| `marketing.source.manage` | Data Sources |
| `marketing.asset.manage` | Upload/edit assets |
| `marketing.analytics.view` | Analytics |
| `marketing.routing.manage` | Routing policy editor |

Hide or disable unauthorized actions; never allow API bypass via UI alone.

---

## 6. Wireframe-level IA (text)

```text
Administration Console
  └─ Marketing Command Center
        ├─ Home (dashboard)
        ├─ Campaigns (registry) → Campaign Workspace → Builder / Preview
        ├─ Audiences
        ├─ Data Sources
        ├─ Content · Templates · Assets
        ├─ Engagement
        ├─ Responses
        ├─ Deliverability
        ├─ Analytics
        └─ Settings
```

---

## STOP

UI/UX architecture only — no UI code. Awaiting PO review (especially nav placement).
