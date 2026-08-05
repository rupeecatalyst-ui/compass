# CO-WP-BAT-001 — Product Owner Review Build

**Status:** BAT Deployed · **DEVELOPMENT FROZEN**  
**Date:** 2026-08-02  
**Type:** Business Acceptance Testing build (not production Go-Live certification)

---

## Live URLs

| Surface | URL |
|---------|-----|
| **Wealth Partner App (BAT)** | https://wealth-partner-app.vercel.app |
| Deployment alias | https://wealth-partner-iv60v5vrd-rupee-catalyst.vercel.app |
| Inspect | https://vercel.com/rupee-catalyst/wealth-partner-app/HdCVScuxcm1UWun1zRTNTCRexFFd |
| Catalyst One API (Partner Gateway host) | https://catalyst-one-two.vercel.app |
| C1 deployment | https://catalyst-jseg21hw8-rupee-catalyst.vercel.app |

---

## Version & build

| Field | Value |
|-------|--------|
| **Version** | `0.5.3` |
| **Label** | Product Owner BAT Review |
| **Sprint stamp** | `CO-WP-BAT-001` |
| **WP Deployment ID** | `dpl_HdCVScuxcm1UWun1zRTNTCRexFFd` |
| **C1 Deployment ID** | `dpl_7aHdHtxkQ1LuDngTwdKCYN9v1mMs` |

Build ID inside the app is injected at Vite build time (`__WP_BUILD_ID__` / Settings → version mark).

---

## Pre-deploy quality

| Check | Result |
|-------|--------|
| TypeScript (`tsc -b`) | ✅ Passed |
| Production build (Vite) | ✅ Passed |
| Lint (`oxlint`) | ✅ Passed |
| Broken routes (static App Router table) | ✅ Wired |
| Deploy | ✅ Vercel production |

---

## Completed modules in this BAT

| Module / journey | Status in BAT |
|------------------|---------------|
| **Home** | Complete companion Experience Home (awaiting prior PO module certification) |
| **Business** | Hub · Quick / Detailed entry · Opportunity list · Resume draft |
| **New Opportunity Journey** | Customer → Product → Details → Documents → Activities → Review → Submit → Success |
| **Journey UX (001 / 001A / 001B)** | Progress rail · sticky actions · health · product cards · draft sheet · journey header · empty/success |
| **Navigation** | Bottom nav: Home · Business · Saarthi · Private · More |
| **Saarthi** | Hub shell + Ask Saarthi entry (presentation) |
| **Private** | Hub shell |
| **More** | Hub shell · Settings · Language |

---

## Known limitations

- Partner Business / Opportunity DTOs are **`placeholder_partner_business`** — not Opportunity Registry SSOT writes.
- Document upload is a **placeholder receipt**, not Document Center authoring.
- Smart customer search is **presentation** over Partner placeholder customers (Enterprise Customer Registry cutover later).
- Saarthi / Private / More are **functional shells**, not full module journeys.
- Loan File views are **projections / placeholders**, not Deal workspace execution.
- Share Opportunity on success is **disabled (future)**.
- Experience content on Home remains **seed / resolve** based — **EEE not implemented**.

---

## Intentionally deferred (do not implement until PO authorises)

- Enterprise Experience Engine / Experience Center  
- Further Business deep-dives beyond this BAT  
- Customer Workspace  
- Opportunity Workspace refinements beyond current journey  
- Partner Entitlements / Tier Engine  
- Durable Opportunity Registry Partner projection cutover  

---

## Freeze order

**STOP DEVELOPMENT** after this deployment.

Do **not**:

- Continue implementing Business  
- Start Enterprise Experience Center  
- Begin Customer Workspace  
- Begin further Opportunity Workspace refinements  

**Await Product Owner Business Acceptance Testing.**  
No further code changes until Product Owner review is complete.

---

## Cursor rule

`.cursor/rules/co-wp-bat-001.mdc`
