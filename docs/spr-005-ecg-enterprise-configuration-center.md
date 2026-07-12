# Catalyst One — SPR-005 ECG Enterprise Configuration Center

**Sprint:** SPR-005  
**Version:** 12.1.0  
**Status:** Implemented (architecture / framework)  
**Date:** July 2026

---

## 1. ECG screenshots

Screenshots are not embedded in-repo. Capture locally:

```bash
npm run dev
```

1. Login http://localhost:3000/login (`admin@compass.dev` / `Compass@123`)
2. Open **ECG** → http://localhost:3000/admin/ecg

| Capture | Focus |
|---------|--------|
| Executive header | ECG title, version badge, SSOT messaging |
| Health KPIs | Registered / Configured / Pending / Draft / Published |
| Domain cards | Products, Workflow, EDIE, LIFE, ETE, ENCE, Compass, Pulse, Health, CHANAKYA, ECM, Opportunity, Lenders, Customers, Security & Grants |
| Registry | Engine name, version, status, published version, last published |
| Lifecycle strip | Draft → Validate → Test → Approve → Publish → Archive → Rollback |

Validate:

```bash
npx tsx scripts/spr005-validate.ts
```

---

## 2. Registry architecture

```
ECG Configuration Center (SSOT)
├── Domains          → business configuration surfaces (15 seeded)
├── Engines          → registerEcgEngine() plug-in registry
├── Packages         → versioned draft/published opaque payloads
├── Config audits    → who / when / what / previous / new / reason
├── Sections         → SPR-001 Interface / Configuration / Grants (retained)
└── Adapters         → createEcgEngineConfigAdapter(engineKey)
```

**Registration APIs**

- `initializeEcgConfigurationCenter()`
- `registerEcgDomain()` / `listEcgDomains()`
- `registerEcgEngine()` / `listEcgEngines()`
- `createEcgConfigPackage()` / `transitionEcgConfigPackage()`
- `createEcgEngineConfigAdapter()` — reads published/draft payload; returns `null` for placeholders so engines keep local defaults

Future engines call `registerEcgEngine()` during bootstrap — no hardcoded domain list required for discovery beyond the seed catalogue.

---

## 3. Lifecycle architecture

```
Draft → Validate → Test → Approve → Publish → Archive
                      ↑                ↓
                      └──── Rollback ──┘
```

Enforced by `ECG_LIFECYCLE_TRANSITIONS` + `canTransitionEcgLifecycle()` / `assertEcgLifecycleTransition()`.

Publish unmarks prior published packages as rollback candidates and updates domain + engine registry health.

**No engine rule migration** — lifecycle operates on ECG packages only.

---

## 4. Versioning model

`EcgVersionDescriptor`:

| Field | Purpose |
|-------|---------|
| `major` | Breaking configuration generation |
| `minor` | Compatible enhancements |
| `draft` | Draft iteration counter |
| `label` | e.g. `12.1.0-draft.1` or `12.1.0` when published |

Packages also track `isPublished` and `isRollbackCandidate`.

---

## 5. Audit model

`EcgConfigChangeAudit` records:

- `actorId`, `occurredOn`
- `fieldPath`
- `previousValue`, `newValue`
- `reason`
- optional `lifecycleState`

Linked to EAF via `recordEcgAudit()` (`entityType: config_change`).

---

## 6. Future migration recommendations

1. Point Opportunity Intelligence / EWOE / EDIE defaults at `createEcgEngineConfigAdapter(...).readPublishedConfig()` **after** publishing real payloads (remove `placeholder: true`).
2. Build domain detail editors under ECG (still no Decision Engine).
3. Persist packages via Prisma adapters (`configureEcgPorts`).
4. Add grant evaluation / permission enforcement in a dedicated Security sprint — not SPR-005.
5. Keep CHANAKYA advisory-only when migrating insight thresholds.
6. Do not hardcode new enterprise rules in engines once ECG packages are published for that domain.

---

## Out of scope (confirmed)

- Migrating existing engine rules  
- Decision Engine  
- Security Engine / permission enforcement  

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| ECG dashboard operational | ✓ |
| Configuration Registry operational | ✓ |
| Lifecycle architecture complete | ✓ |
| Version framework complete | ✓ |
| Audit framework prepared | ✓ |
| Engine adapters prepared | ✓ |
| Design Language compliant | ✓ |

---

**END OF SPRINT SPR-005**
