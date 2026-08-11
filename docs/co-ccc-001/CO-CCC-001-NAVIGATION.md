# CO-CCC-001 — Navigation Structure

## Route

| Key | Path |
|-----|------|
| `ROUTES.ORGANIZATION_COMPLIANCE_CENTER` | `/organization/compliance-center` |

## Access

- Layout: `src/app/(dashboard)/organization/layout.tsx` → **SUPER_ADMIN** only
- APIs: SUPER_ADMIN + `ENTERPRISE_PERSISTENCE_MODE=prisma`

## Administration Console

Category: **Organization**  
Module: **Corporate Compliance Center**  
Registered in `src/constants/administration-console.ts`

## Command palette / org children

`src/config/navigation.ts` — `organizationChildren` / `organizationNavigation` include CCC.

## In-module sections

Defined in `CCC_NAV_SECTIONS` (`src/constants/corporate-compliance-center`):

1. Overview  
2. Entity Registry  
3. Corporate Repository  
4. Banking Repository  
5. Financial Repository  
6. Compliance Repository  
7. Brand Asset Repository  
8. Institution Requirements  
9. Package Builder  
10. Dispatch (EDDE)  
11. Compliance Intelligence  

## Related Organization routes (unchanged)

- `/organization/documents` — document authoring  
- `/organization/corporate-repository` — read projection + link to CCC  
- Company Profile / Directors / Banks / Seal / Settings / Security — Organization Workspace  

## Single implementation

One active CCC route. No `/organization/ccc` alias in foundation (avoids dual paths).
