# CO-OPS-001 — Administrator Build Information

**Status:** Implemented  
**Location:** Admin Console → System Administration → **Build Information**  
**Route:** `/admin/build-information`  
**API:** `GET /api/admin/build-information` (SUPER_ADMIN | ADMIN only)

## Purpose

Permanent operational panel so administrators can verify:

- Exact application version / build number  
- Git branch & commit  
- Deployment environment (Local | Preview | Production)  
- Connected Supabase project (name + ref only — never connection strings)  
- Persistence mode & Enterprise Deal Registry status  
- Last Prisma migration applied  
- **Release Health** (🟢 / 🟡 / 🔴) before testing  
- **Copy Build Information** for support / ChatGPT / GitHub Issues  
- **Current Certification** stage (Local / Preview / Production)  

### Certification board SSOT

`src/constants/build-information/certification.ts` — update when a stage is certified.

## Visibility

| Role | Access |
|------|--------|
| SUPER_ADMIN | Yes |
| ADMIN | Yes |
| Manager / Analyst / Viewer / others | No (AuthGuard + API 403; not listed outside Admin Console) |

Break-glass is not a standalone role in Catalyst One today; when introduced it should map to administrator access.

## Maintenance

| Item | Where |
|------|--------|
| What's New bullets | `src/constants/build-information/whats-new.ts` |
| Default build number | `BUILD_INFORMATION_BUILD_NUMBER` or `NEXT_PUBLIC_BUILD_NUMBER` |
| Version | `package.json` → baked as `NEXT_PUBLIC_APP_VERSION` in `next.config.ts` |
| Git / deploy stamps | Auto from git locally; Vercel git env on deploy |

Update What's New on every certified release.
