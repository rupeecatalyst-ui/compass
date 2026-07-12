# Catalyst One — SPR-006B Decision Knowledge Framework (DKF)

**Sprint:** SPR-006B  
**Version:** 13.1.0  
**Status:** Implemented (advisory knowledge layer)  
**Date:** July 2026

---

## 1. Decision Knowledge Framework architecture

```
Decision Request
   ↓
Applicable Knowledge Packages (ECG or framework scaffold)
   ↓
Context Matching
   ↓
Evaluation Results + Evidence Bundle
   ↓
Recommendation (composed from matched knowledge)
   ↓
Explanation + Confidence + Advisory Level + Next Step
   ↓
Record (history) · Dialogue · CHANAKYA
```

**Principle:** Knowledge remains advisory. No automation, no execution, no workflow modification.  
`executable: false` is unchanged from SPR-006A.

| Layer | Role |
|-------|------|
| DKF | Structured enterprise knowledge packages |
| EDE | Evaluates knowledge against context |
| ECG | Future publisher of real packages (`preferEcgKnowledge`) |
| Dialogue | Logs package → recommendation → confidence → explanation |
| CHANAKYA | Surfaces knowledge names in professional language |

---

## 2. Knowledge Package model

| Field | Description |
|-------|-------------|
| `knowledgeId` | Stable package ID |
| `name` | Display name |
| `kind` | policy / rule / guideline / best_practice / compliance_requirement / risk_observation / advisory_template |
| `category` | lending_policy / internal_policy / product_guidance / customer_guidance / document_guidance / workflow_guidance / compliance / risk |
| `version` | Package version |
| `status` | draft / published / archived / expired |
| `description` | Human summary |
| `source` | `ecg` \| `framework_scaffold` |
| `effectiveDate` / `expiryDate` | Validity window |
| `match` | Context match criteria (categories + presence flags) |
| `advisoryTemplate` / `nextStepTemplate` | Advisory text only |

Scaffold packages in `buildDkfFrameworkScaffoldPackages()` are **architectural placeholders**, not business rules. Compliance scaffold stays `draft` until ECG publishes.

---

## 3. Evidence model

Every recommendation carries `DkfEvidenceBundle`:

- Evidence Used  
- Missing Information  
- Positive Factors  
- Risk Factors  
- Unknown Factors  

Unsupported recommendations are avoided: when no package matches, the engine falls back to the profile advisory and states evidence limits explicitly.

---

## 4. Decision Console

Route: `/decisions`

Display order after evaluation:

1. Recommendation  
2. Knowledge Used  
3. Evidence (used / missing / positive / risk / unknown)  
4. Confidence  
5. Explanation  
6. Next Step  

```bash
npm run dev
```

Open http://localhost:3000/decisions (`admin@compass.dev` / `Compass@123`)

```bash
npx tsx scripts/spr006b-validate.ts
```

---

## 5. ECG integration approach

1. ECG publishes domain packages for engine key `ede` with payload shape `{ knowledgePackages: DkfKnowledgePackage[] }`.
2. `createEcgEngineConfigAdapter("ede").readPublishedConfig()` returns that payload when non-placeholder.
3. `resolveDkfKnowledgePackages()` prefers ECG when `preferEcgKnowledge: true`, otherwise initializes framework scaffolds.
4. No hardcoded lender/product eligibility knowledge in EDE.

---

## 6. Dialogue integration

Each evaluation appends an EdC timeline entry with:

- Knowledge packages used  
- Recommendation  
- Confidence  
- Explanation  
- Full evidence + trace in `expandablePayload`

---

## 7. Recommendations before SPR-006C

1. Publish first real DKF packages from ECG (document + compliance) and retire matching scaffolds.  
2. Bind live Opportunity Workspace context into Decision Console evaluations.  
3. Persist knowledge packages and decision traces (replace in-memory).  
4. Add package versioning UX in ECG Configuration Center.  
5. Keep Predictive Models / Risk Scoring / Loan Approve-Reject / workflow automation out of scope until a dedicated sprint.

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| DKF operational | ✓ |
| Knowledge Package model | ✓ |
| Knowledge evaluation | ✓ |
| Evidence model | ✓ |
| Decision Console enhanced | ✓ |
| ECG adapters prepared | ✓ |
| Dialogue integration | ✓ |

---

**END OF SPRINT SPR-006B**
