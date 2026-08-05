# CO-ARCH-005 — Repository Modernisation & Legacy Dependency Audit

**Status:** Phase 1 complete · Phase 2 audit complete · Ready for BAT (audit only)  
**Date:** 2026-07-29  
**Scope:** Lovable / dual-stack legacy artefacts · package hygiene · no business-logic changes  

> **Sprint ID note:** `CO-ARCH-005` was previously used for Mission Control Snapshot (`docs/co-arch-005/`). This modernisation report lives under `docs/co-arch-005-repo-modernisation/` to avoid overwriting that SSOT. Product Owner may wish to re-number this sprint.

---

## Change-control compliance

| Constraint | Result |
|---|---|
| No business logic modified | ✅ |
| No live data modified | ✅ |
| No database migrations | ✅ |
| No Vercel deploy | ✅ |
| Enterprise SSOT preserved | ✅ |
| Only `.lovable/` deleted | ✅ |

---

## 1. Files Deleted

| Path | Notes |
|---|---|
| `.lovable/project.json` | Lovable editor template metadata (`tanstack_start_ts_current`) |
| `.lovable/plan.md` | Obsolete marketing-site polish plan |
| `.lovable/` (directory) | Entire folder removed from working tree (`git status`: `D`) |

**Not deleted (per mandate):** all other Lovable / TanStack / dual-stack artefacts remain for Product Owner review.

---

## 2. Legacy Items Found (classified)

Classification key: **Required** · **Optional** · **Legacy** · **Safe to Remove** · **Requires Replacement**

### A. Lovable platform / editor

| Item | Classification | Referenced by | Notes |
|---|---|---|---|
| `AGENTS.md` (LOVABLE:BEGIN/END) | **Requires Replacement** / Optional | Cursor / Lovable sync policy | Safe to rewrite as Catalyst One agent notes **only if** Lovable git sync is discontinued. While connected, treat as **Required** for history-safety. |
| `.lovable/` | **Safe to Remove** | None (app/build/CI) | **Removed in Phase 1.** |

### B. Lovable / Vite / TanStack Start build surface (orphaned vs Next.js ERP)

Canonical Catalyst One runtime is **Next.js** (`package.json` scripts, `vercel.json` → `npm run build` / `next`).  
The following are **excluded** from Next TypeScript (`tsconfig.json`) and ESLint (`eslint.config.mjs`).

| Item | Classification | Referenced by | Notes |
|---|---|---|---|
| `vite.config.ts` | **Legacy** / **Requires Replacement** | Imports `@lovable.dev/vite-tanstack-config` | **Not** in `package.json`. `node_modules/@lovable.dev` **absent**. Vite path is broken for npm installs. |
| `bunfig.toml` | **Legacy** | Bun install only | Excludes Lovable packages from 24h age guard. Unused by Next/`npm` path. |
| `bun.lock` | **Legacy** | Bun | Lockfile still named workspace `tanstack_start_ts`; lists `@lovable.dev/*`, `lovable-tagger`, TanStack Start, Vite, Supabase. **Diverged** from `package.json` / `package-lock.json`. |
| `@lovable.dev/vite-tanstack-config` (+ bridge / hmr-gate) | **Legacy** | `vite.config.ts`, `bun.lock`, `bunfig.toml` | **Not** declared in `package.json`. **Not** in `package-lock.json`. |
| `lovable-tagger` | **Legacy** | Transitive via `@lovable.dev/vite-tanstack-config` in `bun.lock` | Not in npm graph. |

### C. Marketing / COMPASS TanStack site (Lovable-era)

Per `ARCHITECTURE.md`, COMPASS customer platform should live in **`compass/`** (Next.js). Root `src/routes` + `src/components/site` are the older TanStack Start marketing site.

| Item | Classification | Referenced by | Notes |
|---|---|---|---|
| `src/routes/**` | **Legacy** / **Requires Replacement** | TanStack router only | Excluded from Next `tsconfig` / ESLint. Contains `*.lovable.app` sitemap + OG URLs. |
| `src/components/site/**` | **Legacy** / **Requires Replacement** | `src/routes/**` only | Marketing UI; not used by Catalyst One ERP. |
| `src/lib/lovable-error-reporting.ts` | **Legacy** | `src/routes/__root.tsx` | Window `__lovableEvents` bridge. Excluded from Next TS. |
| `src/lib/site.ts`, `blog.ts`, `lead-capture.ts`, `error-page.ts`, `error-capture.ts` | **Legacy** | Marketing site | Excluded from Next `tsconfig`. |
| `src/server.ts`, `src/start.ts`, `src/router.tsx`, `src/routeTree.gen.ts` | **Legacy** | TanStack Start | ESLint-ignored; not on Next path. |
| `src/integrations/supabase/**` | **Legacy** / **Requires Replacement** | TanStack Start middlewares | Uses `@tanstack/react-start`. Canonical Catalyst One auth is not this path (see ADR-014). Empty root `supabase/` folder. |
| Branding URLs `*.lovable.app` in sitemap / OG images | **Legacy** / **Requires Replacement** | `src/routes/sitemap[.]xml.ts`, `__root.tsx` | Hosted preview assets; replace with COMPASS/production CDN when retiring TanStack site. |

### D. Dual-product / nested app (not Lovable-specific)

| Item | Classification | Referenced by | Notes |
|---|---|---|---|
| `compass/` (Next.js app) | **Required** (architecture) | `ARCHITECTURE.md` | Canonical COMPASS product tree (~261 tracked files). Do **not** treat as Lovable legacy. |
| Nested `compass/node_modules`, `compass/.next` | Local build artefacts | Local only | Gitignored patterns expected; confirm not committed. |
| `compass/screenshots/**` | **Optional** | Docs / BAT evidence | Useful artefacts; not runtime. |

### E. Docs / narrative mentions

| Item | Classification | Notes |
|---|---|---|
| `docs/adr/ADR-014-authentication-gateway-migration.md` | **Required** (historical) | Mentions Lovable/git history stability — keep. |
| `docs/co-arch-005/CO-ARCH-005-MISSION-CONTROL-SNAPSHOT.md` | **Required** | Different programme; ID collision with this audit. |

### F. Environment

| Item | Classification | Notes |
|---|---|---|
| `.env.example` commented `VITE_SUPABASE_*` | **Legacy** / Optional | Vite/Supabase marketing-era vars; not used by Next Catalyst One build. |
| No `LOVABLE_*` env vars found in `.env.example` | — | — |

### G. CI / CD

| Item | Classification | Notes |
|---|---|---|
| `.github/` workflows | None present | No Lovable CI hooks found. |
| `vercel.json` | **Required** | Next.js only (`npm install` / `npm run build`). No Vite/Lovable. |

---

## 3. Safe-to-Remove List

**Already removed**

- `.lovable/` (entire directory)

**Candidates for a future approved cleanup sprint (do not remove in this task)**

1. `vite.config.ts`
2. `bunfig.toml`
3. `bun.lock` (after confirming no team/Lovable Bun workflow remains)
4. `src/lib/lovable-error-reporting.ts`
5. Entire TanStack marketing island once COMPASS (`compass/`) is certified as sole public site:
   - `src/routes/**`
   - `src/components/site/**`
   - `src/server.ts`, `src/start.ts`, `src/router.tsx`, `src/routeTree.gen.ts`
   - related excluded libs (`site.ts`, `blog.ts`, `lead-capture.ts`, `error-page.ts`, `error-capture.ts`)
   - `src/integrations/supabase/**` (if no other consumer)
6. Local-only (already gitignored; delete from disk optionally): `.tmp-*` build/deploy logs (10 files), `tsconfig.tsbuildinfo`

**Blocker before bulk delete:** Product Owner must confirm Lovable editor connection is retired (or no longer syncs this branch). Removing `AGENTS.md` / Bun lock / Vite while Lovable still syncs can break their editor toolchain.

---

## 4. Items Requiring Review

| Item | Why |
|---|---|
| **Lovable project connection** | `AGENTS.md` + Bun lock + Vite config imply an active or residual Lovable sync. Confirm disconnect before deleting platform files. |
| **TanStack marketing site vs `compass/`** | Dual COMPASS implementations (architecture risk / Pre-Launch Single Implementation). Decide sole public SSOT. |
| **`bun.lock` vs `package-lock.json`** | Two package graphs; Bun graph still Lovable/TanStack; npm graph is Catalyst One Next. |
| **`vite.config.ts` imports missing package** | Broken orphan config if anyone runs Vite under npm. |
| **Sprint ID `CO-ARCH-005` collision** | Mission Control Snapshot already owns `docs/co-arch-005/`. |
| **Empty `supabase/` directory** | Hygiene; confirm no remote config expected. |
| **OG / sitemap `lovable.app` URLs** | Branding/SEO debt if TanStack site still published anywhere. |

---

## 5. Package Audit Report

### Declared in `package.json` (Catalyst One / npm — **do not uninstall this sprint**)

| Finding | Detail | Recommendation |
|---|---|---|
| No `@lovable.dev/*` in `package.json` | Already absent from npm manifest | Keep absent |
| No `vite` / `@tanstack/react-start` in `package.json` | Canonical Next path does not declare them | Keep absent unless restoring marketing Vite build |
| `puppeteer` (devDependency) | Used by multiple `scripts/*` verify/screenshot tools | **Required** for QA scripts — keep |
| `framer-motion`, `cmdk`, `vaul` | Used by UI / layouts / drawer / command | **Required** — keep |
| `@xyflow/react` | No imports under `src/app`; used for Relationship Intelligence Canvas / flow nodes under Catalyst One components | **Required** (or review if RIC deprecated) — **do not remove without usage proof** |
| Dual lockfiles | `package-lock.json` (npm) + `bun.lock` (stale TanStack/Lovable) | Future sprint: drop Bun lock **after** Lovable retirement |
| Nested `compass/package.json` | Separate COMPASS app deps | Expected per architecture |

### Present only in `bun.lock` (not in active npm install)

| Package | Classification |
|---|---|
| `@lovable.dev/vite-tanstack-config` | Legacy / Safe to Remove (with Bun stack) |
| `@lovable.dev/vite-plugin-dev-server-bridge` | Legacy |
| `@lovable.dev/vite-plugin-hmr-gate` | Legacy |
| `lovable-tagger` | Legacy |
| `@tanstack/react-start`, `@tanstack/react-router`, `vite`, `@tailwindcss/vite`, `nitro`, `@supabase/supabase-js` (Bun graph) | Legacy relative to Catalyst One Next runtime; **Required** only if TanStack marketing site is restored |

### Upgrade / deprecate notes (advisory only)

- Align on **one** package manager for Catalyst One root (`npm` matches `vercel.json`).
- Consider upgrading Next / Prisma on a scheduled maintenance sprint (out of scope).
- No package uninstalls performed.

---

## 6. Repository Health Summary

| Area | Assessment |
|---|---|
| Catalyst One Next runtime | Healthy primary path (`next`, Express `server/`, Prisma, Vercel Next config) |
| Lovable editor metadata | Cleared (`.lovable/` deleted) |
| Lovable build plugins | Orphaned (config + Bun lock only; not in npm) |
| Dual product architecture | Documented (`ARCHITECTURE.md`); COMPASS in `compass/`; old TanStack site still in root `src/` |
| Dual lockfiles | Hygiene debt |
| Accidental commits | `.tmp*` / `*.tsbuildinfo` gitignored; local `.tmp-*` logs and `tsconfig.tsbuildinfo` may exist on disk |
| CI | No GitHub Actions Lovable hooks |
| Regressions this sprint | None expected — only metadata folder deleted |

**Architecture verdict:** Catalyst One is the active enterprise OS. Residual Lovable artefacts are **development/tooling leftovers** plus an **orphaned TanStack marketing island**, not part of the Next ERP execution path. Full modernisation is incomplete until Product Owner retires Lovable sync and consolidates COMPASS onto `compass/`.

---

## 7. Recommendations (do not implement)

1. **Confirm Lovable disconnect** with Product Owner / platform owner.
2. **Follow-up sprint (cleanup):** remove Vite/Bun Lovable stack + TanStack marketing island after COMPASS BAT on `compass/`.
3. **Single package manager:** retain `package-lock.json`; remove `bun.lock` / `bunfig.toml` after disconnect.
4. **Rewrite or retire `AGENTS.md`** once Lovable sync ends (replace with Catalyst One agent guidance).
5. **Re-number this programme** if Mission Control Snapshot retains `CO-ARCH-005`.
6. **Delete local `.tmp-*` logs** periodically (already ignored).
7. **Do not** remove `compass/` or Catalyst One SSOT libs as part of Lovable cleanup.
8. **Optional:** add a verify script that fails if `@lovable.dev` reappears in `package.json`.

---

## Success criteria checklist

- [x] `.lovable` folder removed  
- [x] Repository audited  
- [x] No business logic changed  
- [x] No regressions introduced (metadata-only delete)  
- [x] No deployments performed  
- [x] Modernisation audit completed — ready for BAT (audit review)  

**Final status:** ✅ Ready for Business Acceptance of audit findings (cleanup implementation deferred).
