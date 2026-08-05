# CO-ARCH-002
# Enterprise Data Protection & Non-Destructive Development Constitution

**Status:** FROZEN  
**Authority:** Product Owner  
**Priority:** CRITICAL  
**Cursor rule:** `.cursor/rules/enterprise-data-protection-co-arch-002.mdc` (`alwaysApply: true`)

=========================================================
PRINCIPLE
=========================================================

Catalyst One is an Enterprise Operating System.

The integrity of Enterprise Data is paramount.

From this point forward, under NO circumstances shall any implementation, enhancement, refactoring, optimisation, or feature development modify, delete, reset, reseed, recreate, truncate, corrupt, or otherwise affect existing enterprise data unless explicitly authorised by the Product Owner.

Enterprise Data is the Single Source of Truth (SSOT).

The default assumption must always be:

**READ EXISTING DATA.  
EXTEND EXISTING DATA.  
NEVER DESTROY EXISTING DATA.**

=========================================================
NON-DESTRUCTIVE DEVELOPMENT
=========================================================

Every enhancement must be additive.

Developers may:

- ✓ Add new UI components.
- ✓ Add new screens.
- ✓ Add new modules.
- ✓ Extend APIs.
- ✓ Extend database schema using backward-compatible additions.
- ✓ Add new services.
- ✓ Add new enterprise registries.
- ✓ Improve UX.
- ✓ Improve performance.

Developers must NOT:

- ✗ Delete existing records.
- ✗ Modify production business data.
- ✗ Reset IDs.
- ✗ Reseed databases.
- ✗ Truncate tables.
- ✗ Rename enterprise tables.
- ✗ Remove enterprise relationships.
- ✗ Break existing APIs.
- ✗ Execute destructive database migrations.
- ✗ Remove existing business logic.
- ✗ Replace working implementations when extension is sufficient.

=========================================================
BACKWARD COMPATIBILITY
=========================================================

Every implementation must preserve:

- Existing data
- Existing APIs
- Existing business logic
- Existing user journeys
- Existing enterprise registries

Any schema evolution must be fully backward compatible.

=========================================================
LIVE DATA PROTECTION
=========================================================

Live enterprise data is protected.

It must never be altered during feature development.

If test data is required:

- Use isolated demo data.
- Use local mock data.
- Use development fixtures.

Never manipulate enterprise production data.

=========================================================
WHEN IN DOUBT
=========================================================

If there is any uncertainty regarding potential impact on existing data:

**STOP.**

Do not proceed.

Request Product Owner approval before making any change.

=========================================================
CONSTITUTIONAL STATUS
=========================================================

This rule applies to:

- Catalyst One
- Catalyst Connect
- COMPASS
- CHANAKYA
- Every Enterprise Module
- Every Registry
- Every Future Sprint

This rule supersedes implementation convenience.

**Enterprise Data Integrity is a non-negotiable architectural principle.**

---

## Agent / engineering checklist (before any change)

1. Does this write, delete, truncate, reseed, or migrate existing enterprise rows? → **STOP** unless PO authorised.  
2. Prefer additive columns / optional fields / new tables over rename/drop.  
3. Prefer extending services over replacing them.  
4. Prefer fixtures / demo seeds over touching live data.  
5. If unsure of data impact → Architecture Impact / PO approval first.
