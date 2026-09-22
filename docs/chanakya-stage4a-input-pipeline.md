# CHANAKYA Stage 4A input pipeline remediation

Base: `53a2c20ada2384b969ca22b90814a44d92511153` on `feat/canonical-lender-recommendation-stage1`.

The Stage 3 report remains the historical baseline. Stage 4A changes input mapping only. Stage 1 engines, policy enforcement, wrapper and certification harness are unchanged. Production-data certification remains **PENDING — RELEASE GATE**.

## Result and current limitation

The UI money contract now parses `override:200000` as `200000`. Malformed and explicitly cleared salary/property values stay missing instead of falling back to another displayed value. Explicit zero obligations remain zero in transport.

The endpoint still authenticates and retrieves the organization-scoped Opportunity before mapping. Browser declarations retain their strict transport schema but are not treated as saved assessment facts. There is no approved native durable income/obligations/property capture in this path. Consequently **current native HL and HLBT requests fail closed before canonical recommendation processing**, even when their local drafts look complete. No new JSON persistence keys, schema columns or save flow were invented to bypass this blocker.

This is ready for input-remediation review, not recommendation release. No programme eligibility gap is claimed fixed by blocking the incomplete native intake.

## Source and disposition matrix

This table covers the Stage 3 B/C/D fields and the retained mapped context. Null/omitted values are deliberate missing inputs, not business defaults. `context` is an internal mapper result: it is not persisted, returned by the API, or consumed by the unchanged Stage 1 engine.

| Input | Approved source / provenance | Stage 4A disposition and remaining decision |
|---|---|---|
| Organization, product, transaction/journey | Authorized saved Opportunity | Retained. HL blank transaction remains accepted; BT requires `balance_transfer`; top-up and product crossovers reject. |
| Requested amount / requested BT amount | Opportunity.requestedAmount | Finite positive numeric value only; no use as missing BT outstanding. |
| Employment family | Opportunity.employmentTypeCode | Existing ECM employment-ID normalization, then explicit salaried/SE mapping. Unrecognized or NRI-only labels remain unknown, not salaried. Contact-only employment is not substituted for the saved Opportunity classification. |
| DOB | Linked EcmContact.dateOfBirth | Same organization, matching saved primaryContactId and individual borrower kind. Valid calendar `YYYY-MM-DD`, not future; invalid/missing -> null. Engine age helper can consume it; age enforcement remains Stage 4B. |
| Residency | Contact customer profile residentStatus | Not promoted: existing UI can default this field without explicit borrower declaration. Canonical residency remains null pending declaration provenance/capture decision. No inferred resident status. |
| Applicant kind | Opportunity.primaryBorrowerKind | Internal context only; no dedicated canonical engine field. No default individual. |
| Occupation | Linked Contact.roleProfiles.customer.occupation | Internal context only; absent remains null. No occupation inference from employment. |
| State | Opportunity.stateLabel | Internal context only. Not property geography or a new engine input. |
| City | Opportunity.cityLabel | Existing city mapping retained, blank -> null. This is Opportunity city, not proof of property location. |
| CIBIL / expected CIBIL | lendingExtension.approxCibilScore | Saved nonblank string retained, including explicit not-known. No known-score default; threshold enforcement remains Stage 4B. |
| Salary / monthly income | Browser statedIncomeMonthly or runtime businessDetails.monthlySalary | Editor parser corrected. No approved native saved assessment field: canonical monthlyIncomeRupees stays null and the service rejects. Requires durable capture review. |
| Obligations / FOIR EMI input | Browser statedObligations / existingEmi | No approved durable source; canonical existingMonthlyEmiRupees stays null. Explicit browser zero is parsed but does not become durable truth. |
| BT other obligations | No distinct durable native field | Must establish that obligations exclude the current home-loan EMI before mapping. No subtraction or zero assumption added. |
| Turnover | Linked primary Company.annualTurnover; for individual borrower, linked Contact customer profile annualTurnover if present | Existing financial parser into context. Unit-labelled free text such as `12 Cr` remains null; no guessed units. Not divided into monthly income or supplied as a nonexistent engine field. Contact current role editor does not guarantee turnover capture; Company has an established save field. |
| Business vintage | Linked Company.yearsInBusiness or linked Contact customer profile yearsInBusiness | Existing nonnegative financial text parser into numeric context. Missing/malformed -> null. No income methodology inferred. |
| Constitution | Linked primary Company.constitution | Nonblank saved value maps to canonical constitution. Individual browser-only constitution is ignored. No default individual/residential business type. |
| Nature of business / profits / ITR | Company/profile facilities elsewhere; current assessment contract lacks these inputs | No new mapping or methodology. Review required for governed SE contract and authoritative capture. |
| Participants | lendingExtension.participants | Existing saved identity/role array retained only as internal context. No financial or eligibility interpretation. |
| Co-applicant decision, relationship, DOB, income, EMI | Participants contain identity/role, not complete financial provenance | Canonical coApplicant and decision stay null. No implicit no/yes, no zero EMI, no contribution from an arbitrary Contact. Requires explicit contribution decision and scoped financial capture. |
| Property value | Browser statedPropertyValue / runtime approxPropertyValue | No approved durable native assessment field. Null and service rejection; no propertyValueIsCustomerDeclared flag fabricated. |
| Property category/type | Browser statedPropertyType / runtime propertyType | No approved durable native source; null. Existing browser values are not a reason to infer residential. |
| Construction status | Optional COMPASS property information, not approved native durable input | Null. No ready/completed default. |
| Property location/pincode | Browser statedPropertyLocation / optional COMPASS answers | Not mapped as durable property geography. Opportunity city/state are not silently relabelled property location. |
| Occupancy, loan purpose, builder source | Optional separate capture or no proven native source | Remain absent; no new JSON keys or business defaults. |
| BT outstanding principal | lendingExtension.btAmount from Lead Information normal save flow | Finite positive number maps only for HOME_LOAN_BT. Missing/invalid remains null; service rejects missing outstanding before Stage 1 fallback can run. |
| Outstanding certainty | No durable native certainty field | Null; a numeric amount is not proof of exactness. |
| Existing BT ROI / current home-loan EMI | Optional COMPASS answers only | Canonical values remain null; native capture and certainty semantics require review. |
| Remaining BT tenure / its certainty | Optional COMPASS answers only | Null; no inferred tenor. |
| Loan start date/certainty, original sanctioned amount, original tenure, rate type | Separate COMPASS path / no approved native source | Remain absent. No optional snapshot promotion or inference from requested amount. |
| Repayment track / delayed EMI count | Separate COMPASS path / no approved native source | Remain absent; no clean-track/zero-late-payment default. |
| BT property kind, possession, registration | Separate COMPASS path / no approved native source | Remain absent; no ready/registered defaults. |
| Requested assessment tenure | No approved native field (runtime tenure zero is structural) | Remains absent; no use of structural zero as a borrower choice. |
| Top-up amount / purpose | Outside approved two-product flow | Not added. No `fresh` or `bt_top_up` expansion. |
| Current lender | Existing BT institution ID/name | Still intake context only; not an input needed by this engine, not hardcoded. |
| Document evidence | Separate Opportunity document facilities | No dedicated canonical borrower-document input; no implied readiness. Requires contract/enforcement review if governed. |
| DBR inputs | No implemented governed DBR calculation | Not invented; deferred Stage 4B. |

Scoped source loading uses only Contact/Company `findFirst` selections with saved IDs, organizationId and isDeleted:false. The mapper independently checks returned ID/organization against the Opportunity. No browser contact/company ID is accepted. Reads were exercised only against memory doubles during this task.

## BT semantics

`requestedAmount` is the requested BT amount. `btAmount` is existing principal outstanding. They remain distinct even when they differ. Current ROI, current EMI, remaining tenure and certainty are missing until approved native capture exists. Property value is missing; other-obligation semantics are not established by the generic local EMI field. Current BT therefore remains blocked. Stage 1's missing-outstanding fallback is unchanged but cannot be reached from this incomplete mapper.

## Verification interpretation

- Stage 4A fixtures exercise the actual hook parser, pure mapper and service gates; scoped source queries use memory doubles, with a throwing real-Prisma sentinel.
- The preserved Stage 3 script explicitly reads its frozen mapper/hook from the base Git commit to reproduce the original findings, then runs the new current Stage 4A fixtures. Historical `UAT_ACCEPTANCE: FAIL` remains intentional; it is not a failing current parser assertion or a production certification.
- Stage 2 regression now tests rejection of local-only input at the real route/service boundary. Separate explicit synthetic canonical inputs retain lifecycle, product isolation, >9 lenders, null score, ordering and shortlist checks. These engine fixtures are not evidence of a complete native intake.
- Stage 1 database-free regression remains independent and unchanged.
- No certification script, build, migration, seed, db push/pull or production probe is part of these checks.

Executed results: Stage 4A fixtures PASS; Stage 3 historical characterization plus current extension PASS (historical UAT acceptance remains FAIL); Stage 2 regression PASS; Stage 1 regression PASS; changed-file lint PASS without warnings. Full TypeScript check fails only on six documented diagnostics in unchanged files: `policy-rule-parser.ts:48,49` (possibly-null rule), marketing durability `repositories/prisma.ts:61,62,67` (missing MarketingDurableAudienceSnapshotRecord), and marketing `phase1-live-ceiling.ts:40` (duplicate code). No Stage 4A diagnostics remain. No unrelated error was fixed.

## Deferred Stage 4B / capture review blockers

1. Approved durable financial/property capture, explicit residency provenance, co-applicant financial provenance and native BT facts/certainty.
2. Canonical residency and CIBIL programme/policy constraints are copied/parsed but not enforced.
3. Age/tenure missing-input enforcement and finer applicant/occupation/geography/document constraints need review.
4. Governed self-employed income methodology/contract remains unsupported; turnover and vintage alone are insufficient.
5. DBR implementation remains absent.
6. Programme policyAssessmentJson projection (including seasoning/repayment and property/co-applicant settings) and recognized policy-rule evaluation remain incomplete.
7. Unknown-CIBIL/missing-information explanations are not fully preserved in the canonical result contract.
8. Production-data certification is still pending, and any future certification lineage must be reviewed against its existing identity guard rather than weakened.

No schema/migration, COMPASS/Sarathi, Stage 1 source or certification change. No database access, commit, push or deployment.
