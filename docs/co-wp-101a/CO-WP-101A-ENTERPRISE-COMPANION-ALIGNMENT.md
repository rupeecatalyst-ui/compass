# CO-WP-101A — Wealth Partner App as Enterprise Companion

**Status:** ✅ Product Owner accepted (2026-07-31)  
**Product name:** Wealth Partner App *(not Catalyst Connect)*  

## Decision

The Wealth Partner App is an **Enterprise Companion Application** for Catalyst One.

```text
Catalyst One → Partner-scoped Enterprise APIs → Wealth Partner App
```

## Recovery (locked)

| Asset | Decision |
|-------|----------|
| Local foundation | Reuse `C:\Wealth Partner App` |
| Vercel | Keep `wealth-partner-app` · https://wealth-partner-app.vercel.app |
| UX | Preserve mobile-first recovered shell |
| Greenfield replacement | Forbidden |

## Hard rules

- No second CRM  
- No second business database  
- No duplicated business logic  
- No direct employee API consumption  
- Zero-Trust: Authenticated Partner → Partner UUID → Enterprise Mapping → Authorised Resource  

## Constitutional record (WP App repo docs)

- `CO-FOUNDATION-001-AMENDMENT-001-enterprise-companion-alignment.md`  
- `CO-WP-101A-ENTERPRISE-COMPANION-ACCEPTANCE.md`  

## Next engineering gate

Partner-scoped Enterprise API Security ADR + gateway implementation on Catalyst One, then wire the recovered app to that surface only.
