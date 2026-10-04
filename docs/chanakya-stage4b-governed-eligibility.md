# Stage 4B governed eligibility review

Discovery base: `6de06f4334cfad06e4194cced21ae84abf1ba6a6`; parent `53a2c20ada2384b969ca22b90814a44d92511153`. Branch and clean worktree verified before edits. Production-data certification is **PENDING — RELEASE GATE**.

## Discovery before behavior changes

Trace: `recommendation-programme.repository.ts` reads organization/product-scoped programme rows and current published Policy Version relations; `programme-assessment-adapter.ts` validates linkage and copies programme constraints; `policy-rule-parser.ts` recognizes only `cibil_range`; `canonical-lender-recommendation.service.ts` forwards mapped programmes into the shared HL engine and adds policy identity/null score. The authenticated Opportunity route calls the Stage 4A mapper, which rejects missing durable financial/property input before this service. Both CHANAKYA panels consume the same endpoint.

| Governed constraint | Before 4B | Missing-input / integrity gap |
|---|---|---|
| Residency | Projected, not enforced | Missing or incompatible applicant could pass |
| CIBIL min/max and parsed policy ranges | Projected/parsed, not enforced | Category gate is not a programme threshold check |
| Unknown CIBIL | Existing category-A library gate | Numeric threshold not enforced; disclaimer dropped in canonical response |
| Min/max age, tenure | Partial maximum calculation only | Missing DOB/requested tenure could use programme maximum; minimums ignored |
| Age-at-maturity / age-governing party | Stored policyAssessmentJson, not projected | No required-age proof; helper uses current clock rather than service asOf |
| FOIR | Programme max used for income capacity and proposed EMI | Missing EMI becomes zero; over-cap conditional cards possible; minimum ignored |
| LTV | Regulatory and lender maximum calculations | Missing property can leave another offer cap; minimum ignored |
| Income / loan bounds | Projected; some maximum-offer behavior | Income bounds/minimum loan not enforced |
| Co-applicant income | JSON permission not projected | Shared helper substitutes missing income/EMI and can count liabilities independently |
| Self-employed methodology | Unsupported end-to-end | Boolean methodology flag is not an income calculation |
| DBR | Stored/projected, no evaluator | Must be unsupported when configured |
| Transaction / product | HLBT list checked; product identity checked | Customer journey not cross-checked in service; HL blank list intentionally valid |
| BT outstanding | Stage 4A mapping/gate only | Direct canonical calls can trigger shared-engine requested-amount fallback |
| Seasoning / repayment / delayed EMIs | Stored JSON, not projected | Missing repayment/late-count can pass shared helper |
| Property category / construction | Projected, not enforced | Missing values could pass |
| BT property kind / occupancy / possession / registration | Stored JSON, not projected | Governed allowed lists ignored |
| Geography | State/city projected, not enforced | State not in base borrower contract |
| Applicant roles / segments / income methods / required documents | Stored, partly projected, not evaluated | No complete borrower semantics/evidence contract; fail closed if unsupported |
| Effective dates / live publication / product / tenant | Repository gates; policy effective/current-version guards | Service dependency injection can bypass repository filtering; lender availability not read |
| Lender availability | Category assignment gate only | Parent lender enabled/deleted/lifecycle/operational/effective state not selected |
| Unrecognized rule data | Declared unknown rule types reject | Non-object documents and extra keys could be silently ignored |

No schema change is needed. The bounded implementation is a canonical-only eligibility gate before shared calculations and a validation gate on returned cards; shared COMPASS/Sarathi calculations stay unchanged. Unsupported governed semantics reject instead of claiming eligibility. Programme settings remain data-driven, with no lender identities or count encoded.

## Certification boundary

The existing wrapper pins Stage 1 service, adapter, parser, repository, types and verification files to the approved Stage 1 baseline. Stage 4B changes to those files require a separately reviewed certification baseline/lineage/source-hash update, including new evaluator files. Existing guards must continue to reject unapproved source/lineage. The wrapper and production harness must not be edited or executed here.

## Recovery audit and Stage 1 verification review

Resumed worktree: exact frozen HEAD and branch above; ten modified tracked files, four untracked Stage 4B files, no deletion/unrelated file. Existing edits were retained. The gate, projection, structured response and initial 84 fixtures were implemented; final constraint documentation, boundary verification, lint and informational typecheck were incomplete.

`scripts/co-c1-canonical-lender-recommendation-stage1-verify.mjs` is the database-free regression script, not the production certification harness. Its positive orchestration fixture now supplies explicit synthetic lender availability, schema-valid programme lifecycle `active`, loan/property/income/obligations/DOB/CIBIL/requested tenure and a configured FOIR cap. These are fixture declarations, not application defaults. All original assertions remain, including one accepted programme reaching the engine, null scores, read-only orchestration, policy lineage/product gates, availability, bounded inventory and no-write/no-hardcoded-lender checks. A read-only TypeScript-AST comparison against the frozen base confirmed **33/33 original assertion calls preserved**, with 37 assertion calls now present. The original incomplete customer is additionally tested as a negative case: zero accepted programmes and fixed missing-input fields. No assertion or production guard was removed, relaxed or bypassed.

The six modified paths explicitly pinned by the production wrapper are:

- `scripts/co-c1-canonical-lender-recommendation-stage1-verify.mjs`
- `server/services/lender-recommendation/canonical-lender-recommendation.service.ts`
- `server/services/lender-recommendation/policy-rule-parser.ts`
- `server/services/lender-recommendation/programme-assessment-adapter.ts`
- `server/services/lender-recommendation/recommendation-programme.repository.ts`
- `src/types/canonical-lender-recommendation.ts`

The two new evaluator/projection modules also need inclusion in any future reviewed source manifest. Current wrapper parent/count/path/worktree/package/source checks intentionally do not authorize this Stage 4B tree. A future certification change needs an explicitly reviewed new immutable baseline, exact lineage and changed-path rules, full source coverage and updated harness expectations for stricter assessment inputs. Do not remove checks or authorize arbitrary descendants. PostgreSQL read-only proofs, sanitization and PASS-marker-plus-exit-86 requirements must remain. This task neither makes that contract change nor executes certification.

## Completed governed constraint matrix

Classification: **A** enforced; **B** projected but not enforced; **C** stored but not projected; **D** unsupported and rejected; **E** depends on unavailable authoritative assessment inputs. A/E means the rule is implemented and missing inputs reject; it does not claim native Opportunity capture is complete. The following describes the canonical path only.

| Constraint / source | Classification after 4B | Exact behavior |
|---|---|---|
| residencyEligibility | A/E | Exact allowed-list membership; missing residency yields a fixed missing-input field, incompatible residency rejects. No location/country default. |
| Programme minCibil/maxCibil | A/E | All configured bounds participate. No universal eligibility score threshold introduced. |
| Policy Version eligibilityRules/creditRules cibil_range | A/E | Both documents' ranges must hold, together with programme bounds. Malformed/unknown fields reject. |
| Expected CIBIL bands | A/E | Entire interval must fit; straddling/open intervals require more precise CIBIL where bounds cannot be proved. Band endpoints are not invented scores. |
| Explicit unknown/not-known CIBIL | A | Preserves existing authorized library category-A behavior only without numeric programme/policy bounds. Disclaimer returned. Unknown never satisfies a numeric threshold. |
| Missing/unrecognized CIBIL | E, rejected | Remains missing, distinct from an explicit not-known declaration. |
| Minimum/maximum applicant age | A/E | Calendar-valid DOB required when constrained; completed-month age checked against configured bounds at asOf. |
| Age-at-maturity | A/E | Explicit JSON maturity setting, otherwise existing engine's governed maxAge interpretation; maturity calendar date cannot exceed permitted birthday. One-day boundary tested. |
| Age governing party | A/E | Applicant/co-applicant/younger/older settings projected; any required DOB missing rejects. No fallback from missing co-applicant age. |
| Requested tenure | E, required | Positive integer months supplied by borrower; never replaced with programme maximum. Required for EMI calculation even without a configured tenure bound. |
| Minimum/maximum tenure | A/E | Requested tenure must fit both configured bounds; excess rejects rather than silently shortening it. |
| Salary / income bounds | A/E | Positive finite applicant income and all configured min/max bounds required. Legacy minIncomeAmount retained through stricter bound projection. |
| Obligations / existing EMI | A/E | Explicit finite nonnegative amount required; missing is not zero. Explicit zero is supported. BT field retains existing contract of **other** obligations, not home-loan EMI substitution. |
| FOIR min/max | A/E | Configured cap required for supported salaried calculation. Existing EMI calculator reused, with unrounded ratio checked before/after calculation; rounding cannot admit an over-cap request. No conditional over-cap card. |
| LTV min/max | A/E | Positive property value required. Requested amount outside configured LTV bounds rejects; existing authorized regulatory cap remains in shared calculation, with output bounds checked. |
| Requested loan / programme amount bounds | A/E | Positive finite amount required; configured minimum/maximum and legacy bounds enforced; final offered amount checked too. |
| ROI bounds | A | Governed exact/legacy rate projection, stricter supported bounds. No rate invented when absent; insufficient calculation configuration rejects. |
| Co-applicant income permission | A/E/D | Explicit programme permission and borrower yes decision, salaried employment, positive contributed income and known liabilities required to count contribution. Missing employment needs information; unsupported income methods reject. No missing income or EMI substitution. |
| Co-applicant missing identity/financial provenance in Opportunity | E | Stage 4A mapper remains unchanged and does not create a co-applicant contribution. |
| Self-employed methodology | D | All self-employed assessments remain unsupported; a true methodology-present flag does not manufacture an implementation. |
| DBR min/max, including legacy maxDbrPercent | D | Any configured DBR rule rejects as unsupported. |
| Income assessment methods | A/D | Supported salary method can proceed with complete salary inputs; other declared methods reject. No turnover-to-income conversion. |
| HOME_LOAN transactionTypes | A/D | Null/empty list remains valid; a nonblank unsupported transaction restriction rejects. No invented fresh transaction. |
| HOME_LOAN_BT transactionTypes / journey | A | Requires programme balance_transfer and exact BT customer journey; top-up/cross-product context rejects. |
| BT outstanding | A/E | Positive known outstanding required; requested amount cannot exceed it for this non-top-up journey. No requested-amount fallback. |
| BT seasoning | A/E | RequiredSeasoningMonths projected. Valid exact start date and sufficient elapsed calendar months at asOf required. |
| BT clean repayment / delayed EMIs | A/E | Required clean track must explicitly be yes. Configured delay cap needs a known integer count; missing or excess rejects. |
| BT existing ROI/EMI/remaining tenure | A/E/D | Optional comparison facts do not become eligibility defaults. Savings suppressed unless values and certainty are supplied. A new unsupported rule requiring these facts rejects rather than silently passing. |
| Property categories | A/E | Configured exact categories require borrower propertyType. |
| Construction statuses | A/E | Programme and JSON allowed lists both enforced; no ready/completed assumption. |
| JSON property kind, occupancy, possession, registration | A/E | Typed settings projected; exact declared corresponding field required where constrained. No category/kind substitution. |
| Legal constitution | A/E | Declared constitution must satisfy configured list. |
| Employment types | A/E | Exact employment code supported in canonical contract; family alone is not silently expanded to an occupation/code. |
| City/state geography | A/E | Exact declared canonical city/state against allowed lists. No address inference; native property-geography provenance still requires review. |
| Applicant roles/borrowerType, customer segments, ambiguous legacy employmentType | D | No complete semantics in the current assessment contract; populated restrictions reject. |
| Legacy propertyTypes, concessions/deviation categories | D | Unsupported populated restrictions reject rather than being ignored or interpreted as permission. |
| Required document IDs | D/E | No authoritative document-evidence contract in this assessment; configured requirement rejects. |
| Unrecognized policy/settings JSON | D | Closed parser/projection allowlist; unknown keys/types reject without echoing raw content. |
| Programme dates/publication/current availability | A | Tenant/product/live/complete/enabled/not-deleted/effective checks repeated in service; active lifecycle/status and approved status required. |
| Policy Version linkage/current version | A | Matching tenant/lender/product/lineage, published parent/version, current published version and effective window required. |
| Parent lender availability | A | Same organization, enabled, not deleted, active lifecycle/operational state and effective window required. |
| Active recommendation overrides | A/D | Existing scoped/dated read added; any applicable active override blocks. Unknown/narrow geography semantics do not grant permission; conservatively block affected candidate. Untargeted override blocks all candidates. Bounded overflow fails configuration closed. |
| Lender category availability | A | Existing active/effective category assignment required; existing authorized category gate retained. |
| HL versus HLBT isolation | A | Exact product gates both at inventory/service and customer journey evaluation. |
| Additional configured lenders | A | Fourteen synthetic lenders tested; no nine-lender limit/identity code. Existing safety-bound overflow fails closed. |
| Score/ranking | A | Null lenderScore preserved; existing engine offer/rate order retained. No stars/confidence/alphabetical business ranking added. |
| Missing-information response | A | Fixed reason categories and fixed missing-field IDs only; hook renders hardcoded labels and rejects arbitrary text. Current durable-input failure has a structured response. |

No relevant recognized constraint is left as **B** and silently accepted. Historical **C** policy settings are now projected or explicitly rejected as **D**. Some unsupported fields are recognized solely to reject their presence; this is not a claim that their business semantics have been implemented. Pricing metadata such as fees/source citations is not reinterpreted as an eligibility rule.

## Calculation isolation and conservative decisions

The shared HL/BT engine, COMPASS/Sarathi paths and Stage 4A borrower mapper are unchanged. The canonical gate proves age/seasoning at the request's asOf before calling shared arithmetic. Its calculation-only copy omits those already-proved legacy wall-clock checks so that the shared helper cannot shorten a verified requested tenor using a different clock; the original governed programme remains intact for final validation. No certification check is bypassed by this calculation projection.

Over-FOIR or configured over-LTV requests reject conservatively, instead of returning an offer that appears to satisfy the original request. Existing regulatory amount constraints may still produce a lower offered amount; it must satisfy all output checks. No business values are filled to make a calculation possible. Arithmetic zero for an absent co-applicant contribution is an empty sum, not a substituted unknown liability; an actual co-applicant with missing liabilities rejects.

Existing bound semantics remain a review consideration: maxAge already served as the shared engine's maturity fallback. Stage 4B retains that conservative interpretation when explicit maxAgeAtMaturityYears is absent; it does not invent a new maturity age. Unsupported populated applicant/segment/property-type/document restrictions can intentionally suppress many programmes until their assessment contracts are reviewed.

## Verification and remaining release blockers

The Stage 4B runner covers 101 named scenario checks plus policy-parser, sanitized output, malicious calculation-output and memory-only repository assertions. The Stage 3 runner explicitly loads its frozen historical service/adapter/parser so old defects remain reproducible; its historical UAT failures are not presented as current Stage 4B behavior. Current Stage 4B fixtures independently prove rejection, and unchanged Stage 4A fixtures still prove durable-source blocking. No production harness or wrapper is invoked.

Database-free Stage 4B, Stage 4A, Stage 3 characterization, Stage 2 and Stage 1 checks all pass. Changed-file lint passes without warnings/errors. Informational full typecheck reports only the four known unchanged marketing diagnostics (`durability/repositories/prisma.ts:61,62,67`, missing MarketingDurableAudienceSnapshotRecord; `phase1-live-ceiling.ts:40`, duplicate code). The related policy-parser null errors are resolved by its necessary malformed-rule guard; no unrelated marketing source was edited.

Run each fixture with `node --conditions=react-server --import tsx scripts/<filename>`:

- `co-c1-chanakya-stage4b-governed-eligibility-verify.mjs`
- `co-c1-chanakya-stage4a-input-pipeline-verify.mjs`
- `co-c1-chanakya-stage3-input-coverage-uat.mjs`
- `co-c1-chanakya-canonical-stage2-verify.mjs`
- `co-c1-canonical-lender-recommendation-stage1-verify.mjs`

Typecheck command: `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false`. No build or database probe is used.

Remaining native intake blockers are unchanged: authoritative financial/property data, explicit residency, requested tenure, complete BT facts/certainty and co-applicant financial provenance. Optional exact employment/state contract fields are supported by the canonical evaluator but are not a new native capture/mapping flow. Unknown programme semantics, self-employed calculation and DBR require separate review. The source/lineage certification contract and production-data certification remain separate release gates. No commit, push, deployment, schema/migration, production credentials or database access in this task.
