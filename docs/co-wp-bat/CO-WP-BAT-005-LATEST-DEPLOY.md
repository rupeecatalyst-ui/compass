# BAT-005 — Latest Catalyst Connect & Catalyst One Deployment

**Status:** DEPLOYED · Ready for Product Owner BAT  
**Date:** 2026-08-02 (IST)  
**Directive:** Product Owner — deploy all approved local refinements

---

## Live URLs

| Surface | URL |
|---------|-----|
| **Catalyst Connect (Wealth Partner App)** | https://wealth-partner-app.vercel.app |
| WP deployment alias | https://wealth-partner-568q87y3x-rupee-catalyst.vercel.app |
| WP Inspect | https://vercel.com/rupee-catalyst/wealth-partner-app/28U7E9gVwWitZMSZFPmY3wbyotm5 |
| **Catalyst One** | https://catalyst-one-two.vercel.app |
| C1 deployment alias | https://catalyst-4s8llxkad-rupee-catalyst.vercel.app |
| C1 Inspect | https://vercel.com/rupee-catalyst/catalyst-one/5noBrNUZq9WaKzgkVRvQYZcR4JFh |

---

## Deployment IDs

| App | Deployment ID | Ready state |
|-----|---------------|-------------|
| Wealth Partner App | `dpl_28U7E9gVwWitZMSZFPmY3wbyotm5` | READY |
| Catalyst One | `dpl_5noBrNUZq9WaKzgkVRvQYZcR4JFh` | READY |

---

## Build & Git

| Field | Value |
|-------|--------|
| WP version | `0.9.2` |
| WP local build | ✅ `tsc -b && vite build` |
| WP lint | ✅ `oxlint` |
| C1 local build | ✅ `npm run build` (after lint fix) |
| C1 Git HEAD (workspace) | `c8829a0819dbe15f3a609b2140e53f4a6f5943db` |
| WP Git SHA | *No git repository — use WP deployment ID* |
| Note | Deployed from local working trees (includes uncommitted approved refinements). HEAD SHA is base commit; Vercel upload includes local files. |

---

## Pre-deploy fix (build gate only)

- Renamed `module` → `identityModule` in `src/app/api/partner/identity/route.ts` to satisfy `@next/next/no-assign-module-variable` (presentation/build hygiene — no business-rule change).

## Warnings

- WP chunk size warning (>500 kB) — non-blocking
- C1 first `vercel --prod` attempt failed writing CLI config (`operation not permitted`); retry succeeded
- Many C1 ESLint *warnings* remain (unused vars / hooks deps) — only the `module` assignment was a hard Error

---

## Smoke test (automated, unauthenticated)

| Check | Result |
|-------|--------|
| C1 `/login` | HTTP 200 |
| C1 `/api/partner/health` | HTTP 200 · `persistence: prisma` · `status: ok` |
| WP `/` | HTTP 200 |
| WP JS/CSS assets | HTTP 200 |
| Partner APIs without token (`/home`, `/identity`, `/notifications`, `/business`) | Expected auth challenge (non-200 without session) |
| Authenticated UI flows (login, create opportunity, identity, documents, notifications) | ⚠️ Manual BAT by Product Owner with BAT credentials |

---

## Scope included (presentation / Partner Gateway projection)

- Catalyst Connect SSOT Constitution surfaces  
- Source attribution (hidden stamp / Source field removal on Create Opportunity)  
- Digital Visiting Card + Identity Module  
- Command Center, Notification Center, Customer Workspace, Timeline sync  
- CO-WP-UX-001 usability refinements  

Business logic was not modified during this deployment exercise beyond the identity route rename for build.
