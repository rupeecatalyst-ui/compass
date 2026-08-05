# CO-WP-CONSTITUTION-001 — Enterprise Companion Application Principle

**Status:** ✅ NON-NEGOTIABLE · FORMALLY APPROVED — frozen (2026-07-31)  
**Canonical copy (WP App):** `C:\Wealth Partner App\docs\CO-WP-CONSTITUTION-001-enterprise-companion-application-principle.md`

## Rule

The Wealth Partner App is an **Enterprise Companion Application** — a secure digital window into Catalyst One.  
It is **not** an independent business application.

**Catalyst One THINKS. The Wealth Partner App PRESENTS.**

## Ownership

| Catalyst One owns ALL | Wealth Partner App owns ONLY |
|-----------------------|------------------------------|
| Business intelligence, rules, calculations, workflows | UX · Mobile · Presentation · Navigation |
| Registries, documents, activities, commissions, communications | Secure session · Device notifications |
| Credit, lender policy, approval, reporting calculations | Camera · File upload UI · Offline UI (if approved) |

## Prohibited in the Wealth Partner App

Never calculate: commission · payout · revenue · profit · ROI · FOIR · DBR · eligibility · credit score · lender recommendation · workflow / stage decisions · incentives · commercial splits · business KPIs · document validation rules.

## Request flow (no exceptions)

```text
Wealth Partner App → Partner API Gateway → Catalyst One Services → Enterprise DTO → App renders
```

## PR gate (reject if any fail)

1. Business logic duplicated? → REJECT  
2. Calculation inside the app? → REJECT  
3. Enterprise Registry recreated? → REJECT  
4. Data not from Catalyst One Enterprise APIs? → REJECT  

## Availability principle (NON-NEGOTIABLE)

If Catalyst One were turned off, the Wealth Partner App should have **almost nothing meaningful to do** except:

1. Allow the user to **log in** (or attempt session restore), and  
2. Display that **enterprise services are unavailable**.

Do **not** present fabricated, demo-as-truth, or locally calculated business results when Catalyst One is unreachable.

## Related

- CO-FOUNDATION-001-AMENDMENT-001  
- CO-WP-101A  
- `.cursor/rules/enterprise-wealth-partner-app.mdc`
- `.cursor/rules/co-wp-constitution-001.mdc`
