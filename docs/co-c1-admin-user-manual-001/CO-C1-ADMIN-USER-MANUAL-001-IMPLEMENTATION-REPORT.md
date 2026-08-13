# CO-C1-ADMIN-USER-MANUAL-001 — Implementation Report

**Status:** Local implementation complete · Awaiting Product Owner review  
**Deploy:** **Not deployed** (explicit PO gate)

## Decision

One centralized **Enterprise User Manual / Knowledge Center** under:

`Administration → Administration Console → User Manual`

Marketing documentation is a **section** of this manual. No Marketing-owned User Manual module was created.

## Architecture

| Layer | Path |
| --- | --- |
| Markdown SSOT | `content/enterprise-user-manual/**/*.md` |
| Category / index | `src/constants/enterprise-user-manual/` |
| Types | `src/types/enterprise-user-manual.ts` |
| Loader / search / RBAC helpers | `src/lib/enterprise-user-manual/` |
| UI | `src/components/catalyst-one/enterprise-user-manual/` |
| Route | `/admin/user-manual/[[...slug]]` |
| Console category | `user-manual` (first card; opens manual directly) |

Articles are indexed in `article-index.ts` and authored as Markdown with frontmatter (`id`, `title`, `summary`, `categoryId`, `status`, `audience`, `updated`, `tags`, `related`). Bodies are **not** hard-coded in React.

## Initial content (15 articles)

Getting Started · Contacts / Contact 360° · Opportunities · Deals · Lenders / Lender 360° · Products & Programs · Policies · Communication / Send Email · Marketing (6 articles covering overview through troubleshooting) · Administration Console

Marketing articles are marked **Test / fixture mode** where live send / live handoff remain gated.

## UX delivered

- Search
- Category navigation
- Article list
- Table of contents (On this page)
- Prev / Next article navigation
- Related articles
- Recently updated
- Status badges + warnings
- Dark-mode friendly tokens (existing design system)

## Permissions

Manual lives under `/admin` AuthGuard (Admin / Super Admin only). Article `audience` / `admin_only` status reserved for finer filtering. Confidential system ops remain in System Administration modules — this sprint does not document secrets or live flag flip procedures as operator how-tos.

## Verification

```bash
npm run verify:co-c1-admin-user-manual-001
```

**Result:** PASS (engineering gate)

## Explicit non-changes

- Marketing execution flags **unchanged**
- No Vercel deploy
- No Marketing module functionality changes
- No new Marketing-specific User Manual under `/admin/marketing`

## How to review locally

1. Sign in as Admin / Super Admin
2. Open Administration → User Manual card
3. Confirm search, categories, Marketing section, and article links

## Await

Product Owner BAT / review before any deployment.
