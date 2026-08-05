# CO-ARCH-006 — Legacy Platform Retirement & Repository Consolidation

**Status:** ANALYSIS ONLY · No deletions · No code changes · No deploy  
**Date:** 2026-07-29  
**Inputs:** CO-ARCH-005 Legacy Dependency Audit · `ARCHITECTURE.md` · live import graph  

> **Sprint ID note:** `CO-ARCH-006` also names the Architecture Cleanup Discipline programme (`docs/co-arch-006/`). This validation report is filed under `docs/co-arch-006-legacy-retirement/` to avoid collision.

---

## Architecture correction (critical)

The CO-ARCH-005 background statement that “Catalyst One is Next.js under `/compass`” is **incorrect**.

| Product | Canonical location | Runtime |
|---------|-------------------|---------|
| **Catalyst One** (ERP) | Repository **root** (`src/app`, `server/`, Prisma) | Next.js 15 + Express API |
| **COMPASS** (customer platform) | **`compass/`** | Next.js 15 (port 3001) |
| **Legacy marketing stack** | Root `src/routes`, `vite.config.ts`, Bun lock | TanStack Start + Vite + Lovable plugins (**orphaned** under npm) |

Per `ARCHITECTURE.md`, COMPASS and Catalyst One are **two independent products**. Consolidation means **retiring the third (legacy TanStack) stack**, not collapsing COMPASS into Catalyst One.

---

## 1. Executive Summary

The legacy TanStack/Vite/Bun/Lovable **runtime** is not on the Catalyst One Vercel production path (`vercel.json` → `npm install` + `next build`). Root `/` redirects to employee login. Marketing routes under `src/routes/**` are excluded from Next TypeScript and ESLint.

However, **full retirement is blocked today** because production Catalyst One modules still import marketing data from `@/lib/site` (`LENDERS_BY_PRODUCT`):

- `src/lib/enterprise-lender-directory/programs.ts` → Enterprise Lender Workspace directory
- `src/lib/insights/lender-intelligence.ts` → Insights + Mission Control commercial/ROI surfaces

COMPASS Next (`compass/`) **partially** replaces the public marketing site but does **not** yet fully cover legacy TanStack capabilities (blogs, full calculator suite, mutual-funds product page, apply/lead capture, privacy/terms/disclaimer routes, Lovable-hosted SEO URLs).

**Verdict:** **NO-GO** for wholesale legacy retirement in one step.  
**Conditional path:** **GO** for a phased programme that (1) extracts shared lender/marketing data into an Enterprise SSOT, (2) certifies COMPASS as sole public site, (3) disconnects Lovable, then (4) retires TanStack/Vite/Bun artefacts.

---

## 2. Dependency Graph

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ LEGACY PLATFORM (TanStack Start / Vite / Bun / Lovable)                  │
└──────────────────────────────────────────────────────────────────────────┘

@lovable.dev/vite-tanstack-config (+ bridge, hmr-gate, lovable-tagger)
        │
        ▼
vite.config.ts  ──(npm)──► NOT INSTALLED (broken orphan)
        │
        ▼
TanStack Start entry: src/server.ts · src/start.ts · src/router.tsx · routeTree.gen.ts
        │
        ▼
TanStack Router ──► src/routes/** (landing, loans, blogs, calculators, legal, sitemap)
        │                    │
        │                    ├──► src/components/site/**
        │                    ├──► src/lib/site.ts · blog.ts · lead-capture.ts
        │                    ├──► src/lib/lovable-error-reporting.ts
        │                    └──► src/integrations/supabase/** (TanStack middlewares)
        │
        ▼
Bun lock / bunfig.toml ──► only consumer of Lovable + Vite + TanStack Start packages
        │
        ▼
External host (historical): https://rupeecatalyst-growth.lovable.app
        └── OG images on *.lovable.app CDN (referenced in __root.tsx)


SHARED DATA EDGE (BLOCKS FULL RETIREMENT)
─────────────────────────────────────────
src/lib/site.ts  (LENDERS_BY_PRODUCT, PRODUCTS, SITE, …)
        │
        ├──► LEGACY: src/routes/** · src/components/site/**
        │
        └──► CATALYST ONE PRODUCTION (Next ERP):
                 ├── src/lib/enterprise-lender-directory/programs.ts
                 │         └── ELW Lender Registry UI
                 └── src/lib/insights/lender-intelligence.ts
                           ├── Insights workspace / ROI charts / momentum
                           └── Mission Control (via mission-control.ts)


CURRENT REPLACEMENTS
────────────────────
TanStack public pages     → compass/src/app/** (PARTIAL — see inventory)
Vite / Lovable plugins    → none needed for Catalyst One or COMPASS Next
Bun                       → npm (`package-lock.json`) for root + compass
Supabase TanStack auth    → Catalyst One auth (ADR-014 App Router); COMPASS auth N/A yet
LENDERS_BY_PRODUCT        → SHOULD become Enterprise Lender Registry / dedicated SSOT
                            (not yet extracted — currently still site.ts)
Root marketing SEO        → compass sitemap.ts + robots.ts (canonical for COMPASS)
Catalyst One SEO          → public/robots.txt (minimal); root page = login redirect
```

### Sub-graphs (as requested)

**TanStack Router**  
→ Used by: `src/routes/**`, `src/components/site/**`, `src/router.tsx`  
→ Next equivalent: `compass/src/app/**` (public) · Catalyst One `src/app/**` (ERP — no marketing routes)  
→ Can remove router package? **Yes, after** route/UI retirement **and** site data extraction.

**Vite**  
→ Used by: `vite.config.ts` only (Lovable defineConfig)  
→ Next replacement: already Next for both products  
→ Can be removed? **Yes** once Lovable disconnect + no Bun restore of Vite path.

**Bun**  
→ Used by: `bun.lock` / `bunfig.toml` (stale TanStack graph)  
→ Replace with npm? **Yes** for root Catalyst One (already) and `compass/` (already).

**Lovable packages**  
→ Used by: `vite.config.ts`, `bun.lock`, `bunfig.toml`, `AGENTS.md`, error bridge  
→ Safe to retire? **Runtime packages: Yes** after disconnect. **`AGENTS.md`: only after** Product Owner confirms Lovable project unlink.

---

## 3. Legacy Components Inventory

### Landing / marketing / SEO

| Capability | Legacy (TanStack) | COMPASS Next | Catalyst One Next | Gap |
|------------|-------------------|--------------|-------------------|-----|
| Homepage | `src/routes/index.tsx` | `compass/.../page.tsx` | Redirect → Login | Dual public homes if Lovable host still live |
| About / Contact | TanStack routes | COMPASS pages | — | Covered |
| Loan products | `/loans`, `/loans/$slug` | Product landings + hubs | — | Slug/URL parity not certified |
| Calculators | `/calculators` + HLBT suite | Tools hub “Coming Soon” | — | **Functional gap** |
| Blogs / Knowledge | `/blogs`, `/blogs/$slug` | Resources placeholder | — | **Content gap** |
| Mutual funds | `/mutual-funds` | Invest hub / resources query | — | Partial |
| Apply / lead form | `/apply` + `lead-capture` | Get Started / contact | — | Lead pipeline parity **Unknown** |
| Privacy / Terms / Disclaimer | TanStack routes | Not found as dedicated pages | — | **Legal page gap** |
| Sitemap | `rupeecatalyst-growth.lovable.app` | `compass/src/app/sitemap.ts` | — | Different hosts/URLs |
| Robots | — (TanStack) | `compass/.../robots.ts` | `public/robots.txt` | Split by product |
| OG images | Lovable CDN URLs | COMPASS siteConfig | — | Legacy URLs retire with TanStack |

### Auth / APIs / redirects / assets

| Area | Finding |
|------|---------|
| Authentication | `src/integrations/supabase/**` is TanStack-only. Catalyst One App Router auth is independent (ADR-014). COMPASS has no customer auth yet. **No ERP dependency** on TanStack Supabase. |
| APIs | Next `rewrites` only proxy Express when `NEXT_PUBLIC_API_URL` set. No TanStack API coupling. |
| Redirects | Root `src/app/page.tsx` → Login. No Next redirects into TanStack routes. |
| Static assets | Product JPGs under `@/assets/products` consumed by `site.ts` / `blog.ts` only. Safe to retire **with** marketing island after confirming COMPASS assets cover branding. |
| Build scripts | Root `package.json` has **no** Vite/Bun scripts. Vercel uses npm/Next only. |
| Env | Commented `VITE_SUPABASE_*` in `.env.example` — legacy. No `LOVABLE_*` vars. |

### Shared libraries (production)

| Module | Role | Consumers |
|--------|------|-----------|
| `src/lib/site.ts` | Marketing content + **`LENDERS_BY_PRODUCT`** | TanStack site **and** ELW + Insights |
| `src/lib/blog.ts` | Blog posts | TanStack only |
| `src/lib/lead-capture.ts` | Lead submit | TanStack site forms only |
| `src/lib/lovable-error-reporting.ts` | `__lovableEvents` | TanStack `__root` only |
| `src/assets/products/*` | Marketing imagery | `site.ts` / `blog.ts` only |

---

## 4. Retirement Candidates

| Component | Classification | Justification |
|-----------|----------------|---------------|
| `.lovable/` | **Retire** (done in CO-ARCH-005) | Unused editor metadata |
| `AGENTS.md` Lovable block | **Blocked** → later **Replace** | Required while Lovable git sync active |
| `@lovable.dev/*` / `lovable-tagger` | **Retire** | Not in npm graph; only Bun/vite orphan |
| `vite.config.ts` | **Retire** | Broken under npm; unused by Vercel |
| `bun.lock` / `bunfig.toml` | **Retire** | Stale TanStack lock; npm is SSOT for deploy |
| TanStack Start entry (`server.ts`, `start.ts`, `router.tsx`, `routeTree.gen.ts`) | **Retire** | No Next production consumer |
| `src/routes/**` UI | **Replace** then **Retire** | COMPASS must own public UX; URL/SEO cutover required |
| `src/components/site/**` | **Replace** then **Retire** | COMPASS components are replacement surface |
| `src/lib/blog.ts` | **Replace** then **Retire** | Move content to COMPASS Knowledge Centre or retire blogs deliberately |
| `src/lib/lead-capture.ts` | **Replace** then **Retire** | Need COMPASS lead API / ECE path before delete |
| `src/integrations/supabase/**` | **Retire** | TanStack-only; ERP auth elsewhere |
| `src/lib/lovable-error-reporting.ts` | **Retire** | Marketing-only |
| Marketing product assets | **Retire** or **Keep** in COMPASS | After COMPASS branding BAT |
| **`src/lib/site.ts` as a whole** | **Blocked** | ERP imports `LENDERS_BY_PRODUCT` |
| `LENDERS_BY_PRODUCT` data | **Replace** (extract SSOT) then allow site.ts split/retire | Move to Enterprise Lender / product offer catalog |
| `PRODUCTS` / `SITE` / `TRUST_STATS` | **Replace** into COMPASS config | Not ERP SSOT |
| `compass/` Next app | **Keep** | Canonical COMPASS |
| Root Catalyst One Next | **Keep** | Canonical ERP |
| Dual-product architecture | **Keep** | Constitutional (`ARCHITECTURE.md`) |

---

## 5. Risk Assessment

| Risk | Severity | Notes |
|------|----------|-------|
| **Delete `site.ts` without extraction** | **Critical** | Breaks ELW directory + Insights/Mission Control lender ROI/momentum data |
| SEO / sitemap host cutover | High | Legacy sitemap points at `rupeecatalyst-growth.lovable.app`; COMPASS has its own sitemap — need DNS/domain cutover plan |
| OG / social previews | Medium | Lovable CDN image URLs break if CDN purged after disconnect |
| Legal pages gap | Medium | Privacy/Terms/Disclaimer exist on TanStack; not confirmed on COMPASS |
| Calculators / blogs regression | High for public UX | COMPASS tools/resources still placeholder / coming soon |
| Lead capture loss | Medium–High | `submitLead` only on TanStack forms |
| Lovable sync breakage | Medium | Removing `AGENTS.md` / Bun / Vite while connected can disrupt Lovable editor |
| Auth regression | Low | TanStack Supabase not used by Catalyst One App Router |
| Vercel / ERP deploy | Low | No Vite dependency on production build |
| Routing collision | Low | Next does not mount TanStack routes |
| Static asset loss | Low–Medium | Product images only referenced by marketing libs |
| False “single app” consolidation | Architectural | Must keep COMPASS + Catalyst One separate; retire only the third stack |

---

## 6. Repository Consolidation Roadmap

### Phase 0 — Preconditions (Product Owner)
1. Confirm whether `rupeecatalyst-growth.lovable.app` (or any Lovable host) is still public.  
2. Confirm Lovable project disconnect timeline.  
3. Accept COMPASS as **sole** public marketing SSOT.  
4. Accept extraction of `LENDERS_BY_PRODUCT` into Enterprise SSOT before deleting `site.ts`.

### Phase 1 — Disconnect Lovable
- Unlink Lovable project / stop Bun-based Lovable builds.  
- Rewrite `AGENTS.md` for Catalyst One + COMPASS agents.  
- Freeze: no further TanStack feature work.

### Phase 2 — Extract shared data (ERP-safe)
- Move `LENDERS_BY_PRODUCT` (+ `LenderOffer` type) to an Enterprise-owned module (e.g. extend Enterprise Lender Registry / dedicated offer catalog).  
- Retarget `enterprise-lender-directory/programs.ts` and `insights/lender-intelligence.ts`.  
- BAT Mission Control + ELW + Insights.  
- **Only then** may marketing-only remnants of `site.ts` be retired.

### Phase 3 — COMPASS parity / cutover
- Close gaps: legal pages, blogs/resources strategy, calculators strategy, apply/lead capture.  
- Domain + sitemap + robots + OG cutover from Lovable host → COMPASS production domain.  
- BAT public journeys.

### Phase 4 — Retire TanStack marketing UI
- Remove `src/routes/**`, `src/components/site/**`, TanStack entries, blog/lead-capture (if migrated), lovable-error-reporting, integrations/supabase.  
- Update `tsconfig.json` / `eslint.config.mjs` ignores.

### Phase 5 — Remove Vite / Lovable packages
- Delete `vite.config.ts`.  
- Ensure packages never re-enter `package.json`.

### Phase 6 — Remove Bun
- Delete `bun.lock`, `bunfig.toml`.  
- Standardise on npm lockfiles (root + `compass/`).

### Phase 7 — Repository cleanup
- Remove orphan marketing assets if unused.  
- Clean `.env.example` `VITE_*` comments.  
- Replacement Certification + Architecture Cleanup verification.  
- Optional verify script: fail if `@lovable.dev` or `src/routes` reappear.

**Implementation is out of scope for this sprint.**

---

## 7. Product Owner Recommendation

1. Treat legacy TanStack as a **third stack to retire**, not as Catalyst One.  
2. Do **not** approve a bulk delete of `src/lib/site.ts` until lender offer data is extracted.  
3. Commission a **COMPASS Parity BAT** against the TanStack route inventory before SEO cutover.  
4. Explicitly decide fate of: blogs, calculators, mutual-funds page, lead capture, legal pages.  
5. Keep dual-product boundary (COMPASS + Catalyst One); consolidate tooling only.  
6. After Phases 0–2 approval, open an **implementation sprint** (suggested id: CO-ARCH-006B or new CO-ARCH-0xx) for execution.

---

## 8. Go / No-Go Recommendation

### Success criteria evaluation

| Criterion | Result |
|-----------|--------|
| No production dependency remains | **FAIL** — `site.ts` → ELW + Insights/Mission Control |
| Next.js COMPASS fully replaces legacy application | **FAIL / PARTIAL** — major capability gaps |
| No shared runtime dependencies exist | **FAIL** — shared `LENDERS_BY_PRODUCT` |
| No routing dependencies remain | **PASS** (for Catalyst One Next router) |
| No deployment dependencies remain | **PASS** (Vercel/npm/Next); **UNKNOWN** (live Lovable host) |
| Repository can safely operate with a single application | **N/A / FAIL as stated** — architecture requires **two** products; goal is **one stack per product**, not one app total |

### Recommendation

# **NO-GO — Full legacy retirement**

Do **not** delete the TanStack marketing island or `src/lib/site.ts` in the next implementation sprint without completing Phase 2 data extraction and COMPASS parity.

### Conditional approval (separate decisions)

| Decision | Recommendation |
|----------|----------------|
| Retire Lovable editor metadata | **Already done** (`.lovable/`) |
| Plan to retire Vite/Bun/Lovable **packages** after disconnect | **GO** (planning) |
| Retire TanStack **UI/runtime** after COMPASS cutover + data extraction | **CONDITIONAL GO** |
| Delete `site.ts` now | **NO-GO** |
| Merge COMPASS into Catalyst One | **NO-GO** (violates `ARCHITECTURE.md`) |

---

## Change-control attestation

| Constraint | Status |
|------------|--------|
| No business logic modified | ✅ |
| No live data modified | ✅ |
| No migrations | ✅ |
| No Vercel deploy | ✅ |
| No files deleted this sprint | ✅ |
| Analysis / documentation only | ✅ |

**Ready for Product Owner architecture review.** Implementation awaits explicit approval of the phased roadmap.
