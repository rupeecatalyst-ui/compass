# CO-WP-DEVELOPMENT-WAVE-001

**Status:** Product Owner Instruction · **EFFECTIVE**  
**Date:** 2026-08-02  
**Implementation:** Authorised for Wealth Partner App **module builds** only  

---

## Direction

The application architecture is sufficiently mature.  
Proceed with building **complete functional modules**.

### Priority

1. Complete **Home**
2. Complete **Business**
3. Complete **Saarthi**
4. Complete **Private**
5. Complete **More**

### Business priority (within module)

Complete **Opportunity journey**, including:

- Create Opportunity  
- Customer selection  
- Opportunity details  
- Documents  
- Activities  
- Loan File views  

### Engineering focus

- Complete user journeys  
- Navigation  
- Responsive layouts  
- Loading states  
- Empty states  
- Enterprise-ready DTO integration  

Do **not** optimise for visual perfection yet.

Where Enterprise APIs are not yet available, use **clearly identified placeholder DTOs** that can be replaced without redesign.

### Hard gates

| Gate | Rule |
|------|------|
| Business logic | Do **not** implement logic that belongs in Catalyst One |
| Experience Center / EEE | Do **not** start in this wave |
| Deploy | Do **not** deploy until Product Owner reviews completed modules |

### Relationship to prior gates

- **MODE-003** remains the module-complete cadence.  
- **CO-WP-ARCHITECTURE-UPDATE-001** EEE design remains **DO NOT IMPLEMENT** — this wave does **not** authorise EEE.  
- **Business ON HOLD** is **lifted for WAVE-001 module builds** by this Product Owner instruction.  

---

## Cursor rule

`.cursor/rules/co-wp-development-wave-001.mdc`
