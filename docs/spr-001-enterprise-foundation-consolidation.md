# Catalyst One — SPR-001 Enterprise Foundation Consolidation

**Sprint:** SPR-001  
**Version:** 1.0  
**Status:** Implemented (pilot-ready foundation)  
**Date:** July 2026

---

## 1. Feature Summary

| Module | Deliverable | Status |
|--------|-------------|--------|
| **LIFE** | Intelligent lender executor selection (product, city, active, business mapping); auto-resolve lender/branch/hierarchy/manager; relationship recommendation hints | Operational |
| **Dialogue Center (EDC)** | Universal timeline — stage/sub-stage/progress/tasks/emails/notifications/messages/documents/workflow; latest-first expandable cards | Operational |
| **EDIE** | Configurable document rules (product, employment, constitution, category, stage); folder + individual upload methods; context-aware visibility | Operational |
| **ENCE** | Policies, templates, simulation mode; external delivery **disabled** | Simulation only |
| **Opportunity Compass** | Needle (N/C/S), Pulse, rotating recommendations | Operational |
| **Task Engine (ETE)** | Independent + Opportunity tasks; predefined descriptions; colour SLA; overdue escalation → manager co-owner; Dialogue logging | Operational |
| **Contact Master (ECM)** | Multi-role contacts; dual mobile; optional email with CHANAKYA completion prompt | Operational |
| **ECG** | Interface / Configuration / Grants framework sections only | Framework |
| **Migration Mode** | Suppresses workflow, tasks, notifications, escalations, AI recommendations | Prepared |
| **System Modes** | Workflow / Communication / CHANAKYA mode architecture | Prepared |
| **UI** | Professional engagement cards; workspaces for Tasks, Documents, Lenders, Dialogue, Contacts, Compass, Communication, ECG, System Modes | Delivered |

### Routes (Catalyst One — localhost:3000)

| Module | Path |
|--------|------|
| Login | `/login` |
| Tasks | `/tasks` |
| Documents | `/documents` |
| Lenders (LIFE) | `/lenders` |
| Dialogue Center | `/dialogue` |
| Contact Master | `/contacts` |
| Opportunity Compass | `/opportunity-compass` |
| ENCE Simulation | `/communication` |
| ECG | `/admin/ecg` |
| System Modes | `/admin/system-modes` |

---

## 2. Database Changes

**None.**

SPR-001 follows the existing Catalyst One enterprise-engine pattern:

- Domain state is **in-memory** (ports & adapters).
- Prisma remains **auth-only** (`User`, tokens).
- UI seeding uses engine registries (module memory) for pilot.

Future sprint may introduce Prisma adapters via `configure*Ports()` without changing domain APIs.

---

## 3. API Changes

**No new HTTP APIs.**

All SPR-001 modules expose TypeScript lib APIs:

- `getLifePorts()` / `selectLifeLenderExecutors()`
- `appendEdcTimelineEntry()` / `listEdcTimeline()`
- `registerEdieDocumentRule()` / `resolveEdieDocumentRulesForContext()`
- `simulateEnceCommunication()` (`ENCE_EXTERNAL_DELIVERY_ENABLED = false`)
- `registerEteTask()` / `escalateEteOverdueTasks()`
- `registerEcmContact()` / `promptEcmMissingEmail()`
- `configurePlatformModes()` / `shouldSuppressAutomation()`
- `registerEcgSection()`
- `computeOpportunityCompassNeedle()` / `computeOpportunityPulse()`

---

## 4. UI Screenshots

Screenshots are not embedded in this commit. For review, run:

```bash
npm run dev
```

Open **http://localhost:3000/login** (`admin@compass.dev` / `Compass@123`), then navigate the routes listed above.

---

## 5. Technical Constraints

1. **No external communication** — ENCE simulation only; WhatsApp/SMS/Email/Push delivery not implemented.
2. **In-memory engines** — state resets on process restart; not shared across serverless instances.
3. **Client module memory** — UI workspaces seed engines in the browser bundle; separate from server SSR state.
4. **Migration Mode** — historical records must not trigger automation when `migrationMode: true`.
5. **Communication Mode `live`** — reserved; still must not send externally until a future sprint enables delivery adapters.
6. **ECG** — framework registration only; no grant evaluation UI.
7. **Architecture preserved** — ports/adapters, EAF audit hooks, configuration-driven filters; no COMPASS coupling.

---

## 6. Recommended Improvements Before Sprint 2

1. Persist engines via Prisma/Postgres adapters behind existing ports.
2. Wire LIFE selection into Loan Workspace lender assignment flow.
3. Embed Dialogue Center as a shared panel inside Opportunity / Loan workspaces.
4. Connect Task Engine escalation to real reporting hierarchy from EOWE/EIAE.
5. Persist EDIE uploads to object storage (folder + individual) with EDIE storage references.
6. Promote Opportunity Compass onto Loan Board / Opportunity cards.
7. Deploy Catalyst One production (`catalyst-one` Vercel project) with latest SPR-001.
8. Add SSR-safe shared store for engine state across Next.js requests.

---

## 7. Architectural Assumptions

1. **LIFE** = Lender Intelligence & Facilitation Engine (new engine; does not replace EOLE).
2. Credit/Operations/Policy contacts are excluded unless `lenderExecutor === true`.
3. Dialogue Center is the canonical operational timeline; engine-specific timelines remain for domain audit.
4. Task escalation logs to Dialogue Center and assigns co-owner; CHANAKYA notification is recorded as an operational event (not external).
5. Contact Master is separate from EC360 customer contacts (enterprise contact identity vs customer 360 profile).
6. Document rules extend EDIE (v11.0.1) rather than creating a parallel document engine.
7. System Modes are a singleton platform configuration consumed by ETE/ENCE/automation gates.
8. Pilot UX uses colourful engagement cards without changing enterprise information architecture.

---

## Acceptance Checklist

- [x] LIFE enhancements operational  
- [x] Dialogue Center operational  
- [x] EDIE document rules operational  
- [x] ENCE simulation operational (no external send)  
- [x] Opportunity Compass + Pulse operational  
- [x] Task Engine operational  
- [x] Contact Master enhancements complete  
- [x] ECG framework created  
- [x] Migration Mode prepared  
- [x] No external communication enabled  

**Validation:** `npx tsx scripts/spr001-validate.ts` — LIFE, ECM, EDC, ETE, ENCE, EDIE rules, Compass, Migration, ECG — **PASS**
