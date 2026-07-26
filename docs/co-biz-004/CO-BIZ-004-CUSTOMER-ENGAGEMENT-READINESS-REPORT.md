# CO-BIZ-004 — Customer Engagement Readiness Report

**Date:** 2026-07-26  
**Layer:** Enterprise Customer Engagement (ECE)  
**Constraint compliance:** Projection only · No duplicate workflow · No parallel task/status ownership · Token-scoped auth

---

## Executive summary

Catalyst One now exposes a **customer self-service engagement layer** as a thin projection over Document Requests / Registry, ETE, Deal DAL, and EDC. Customers can see application status, complete document actions, follow a timeline, receive updates, and ask contextual questions — without a second workflow engine.

**Overall Customer Engagement Score: 8.0 / 10** · **GO WITH OBSERVATIONS**

---

## Coverage

| Domain | Coverage |
|--------|----------|
| Customer dashboard | Active opportunity · deals (when present) · stage · RM · next action · milestone · recent activity · CX score |
| Customer tasks | LOD pending/re-upload + ETE allowlist (Document Collection · Reminder · Follow-up · Custom) |
| Document centre | Reuses CO-DOC-002 portal (upload / replace / status / history) embedded in engagement shell |
| Application timeline | Read-only EDC + Document Request events (customer-safe filter) |
| Notifications | Document accepted/rejected · action required · stage / approval / disbursement heuristics |
| Communication | Customer questions → ECE store + EDC mirror; Saarthi remains for docs Q&A |
| CX Score | Pending actions · response times · document turnaround · communication latency (single formula) |

---

## Portal capabilities

| Route | Role |
|-------|------|
| `/customer-engagement/[token]` | Full engagement shell (Phases 1–7) |
| `/document-upload/[token]` | Documents-only (CO-DOC-002); links to full portal |

RM copy-link from Opportunity Document Requests now shares the **engagement** URL (Documents included as a tab).

---

## Task integration

- **SSOT:** Enterprise Task Engine (`listTasksForEntity` + work-type allowlist)
- **Primary customer actions:** Document Requests LOD (true upload work)
- **No** customer task writes / complete API this sprint (actions fulfilled via Documents tab)

---

## Document integration

- Upload / replace / preview / progress = existing Document Requests + Registry SSOT
- No second document store

---

## Timeline coverage

- EDC opportunity context (safe event types)
- Document Request communications (upload, verification, reminders, outbound)

Internal task / LOD generation noise filtered out.

---

## Customer Experience Score

`deriveCustomerExperienceScore` — weighted dimensions:

| Dimension | Weight |
|-----------|--------|
| Pending actions | 0.30 |
| Response times | 0.20 |
| Document turnaround | 0.30 |
| Communication latency | 0.20 |

---

## Known gaps

1. **No customer login identity** — opaque token only (COMPASS / EIAE customer persona deferred).
2. **RM reply UI** for customer messages is ops/seed via `postStructuredUpdate` — not a full inbox console yet.
3. **ETE customer actions** are informational until Documents / future customer-complete hooks; customers do not complete ETE tasks directly.
4. **Deal stage** on dashboard prefers session labels; live Deal Registry stages appear when deals exist for the opportunity.
5. **Push/email/WhatsApp** to customers still via existing RM outbox / ENCE simulation — not a dedicated customer notification channel.
6. EBI org dashboards intentionally not exposed to customers.

---

## Recommendations

1. Add RM “Customer messages” panel on Opportunity Workspace reading ECE threads.
2. Optional: customer-complete for specific ETE checklist items with audit (still ETE-owned).
3. Wire COMPASS / customer OTP only under Product Architecture approval.
4. Persist ECE messages via server adapter when portal tokens move to durable sessions.

---

## Architecture

```
Token session (Document Requests)
        → ECE compose (projection only)
            ← Deal DAL · ETE · Document Registry · EDC
        → /customer-engagement/[token] UI
```

## Final verdict

✅ Customer Engagement foundation ready for Catalyst One v1.x as the **canonical customer self-service projection layer**.
