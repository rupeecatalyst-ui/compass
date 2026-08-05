# CO-WP-BAT-003 — Deploy BAT Review Build

**Status:** BAT Deployed · **AWAITING PRODUCT OWNER REVIEW**  
**Date:** 2026-08-02  
**Priority:** CRITICAL  
**Type:** Product Owner BAT Review Build (not production Go-Live certification)

---

## Live URLs

| Surface | URL |
|---------|-----|
| **Wealth Partner App (BAT)** | https://wealth-partner-app.vercel.app |
| Deployment alias | https://wealth-partner-kd7182nhg-rupee-catalyst.vercel.app |
| Inspect | https://vercel.com/rupee-catalyst/wealth-partner-app/EirRqWLC95E7YUG5CwxKzaTDGV6t |
| Catalyst One API (Partner Gateway) | https://catalyst-one-two.vercel.app |
| C1 deployment alias | https://catalyst-9n96tu4vy-rupee-catalyst.vercel.app |
| C1 Inspect | https://vercel.com/rupee-catalyst/catalyst-one/7E5H5JsfjnT3Ts6CJpNsKPd8nL2A |

---

## Version & build

| Field | Value |
|-------|--------|
| **Version** | `0.9.0` |
| **Label** | Product Owner BAT-003 |
| **Sprint stamp** | `CO-WP-BAT-003` |
| **WP Deployment ID (Build Number)** | `dpl_EirRqWLC95E7YUG5CwxKzaTDGV6t` |
| **C1 Deployment ID** | `dpl_7E5H5JsfjnT3Ts6CJpNsKPd8nL2A` |
| **Deployment Time** | 2026-08-02 15:33:19 IST (WP) |
| **Git Commit Hash (Catalyst One)** | `c8829a0819dbe15f3a609b2140e53f4a6f5943db` |
| **Git Commit Hash (Wealth Partner App)** | *No git history yet on WP repo — use Vercel deployment ID as build identity* |

In-app build mark: Settings → About (`APP_VERSION` / `__WP_BUILD_ID__` / `__WP_BUILD_TIME__`).

---

## Pre-deploy quality

| Check | Result |
|-------|--------|
| TypeScript (WP `tsc -b`) | ✅ Passed |
| Production build (WP Vite) | ✅ Passed |
| TypeScript (C1) | ✅ Passed |
| WP Vercel production deploy | ✅ Passed |
| C1 Vercel production deploy | ✅ Passed |
| Live WP home HTTP | ✅ 200 |
| Official RC logo asset | ✅ 200 (`/rupee-catalyst-logo-official.svg`) |
| Partner Gateway health | ✅ 200 / ok |

---

## Modules included

| Module | Status |
|--------|--------|
| Home Experience | Included |
| My Business Pipeline (CO-WP-BUSINESS-001) | Included |
| Opportunity Creation Journey (001–001D) | Included (frozen) |
| Opportunity Workspace (002) | Included (frozen) |
| Customer Workspace (003) | Included |
| My Professional Identity Card (IDENTITY-001) | Included — **first PO review focus** |

---

## Product Owner — first review focus

**My Professional Identity Card** (Home):

1. Rupee Catalyst logo renders correctly  
2. Front / Back flip animation  
3. Premium FinTech styling  
4. Partner photograph placement  
5. Tier badge  
6. Authorised Products  
7. QR Code placement  
8. Contact buttons  
9. Share Card action  
10. Mobile responsiveness  

---

## Stop condition

- Do **not** start new modules  
- Do **not** modify architecture  
- Do **not** implement EEE / Tier Engine / Entitlements  
- Await Product Owner BAT review  

---

## Related

`.cursor/rules/co-wp-bat-003.mdc` · IDENTITY-001 · BUSINESS-001 · BAT-002 (superseded freeze stamp)
