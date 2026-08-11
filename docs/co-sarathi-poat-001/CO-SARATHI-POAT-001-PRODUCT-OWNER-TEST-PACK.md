# CO-SARATHI-POAT-001 — Product Owner Acceptance Test Pack

**Sprint:** Conversational Acceptance Testing (gate before Dialogue Architecture)  
**Desk under test:** https://catalyst-one-two.vercel.app/sarathi  
**Build baseline:** WAVE-1 (questionnaire UX retired) · Conversation Experience `3.2.0-vision-w1`  
**Rule:** Do **not** change implementation during POAT. Record Pass / Fail / Partial only.

---

## 1. Purpose

Before **Dialogue Architecture**, SARATHI must demonstrate conversation quality approaching:

> A natural financial consultation with an experienced Rupee Catalyst loan consultant — not a chatbot, questionnaire, or FAQ.

This pack is the **only** acceptance instrument for that gate.

---

## 2. How to execute

1. Open `/sarathi` → **Start over** between scenarios.  
2. Type customer lines exactly as scripted (or speak naturally where noted).  
3. For each scenario, fill the **PO Scorecard** (section 4).  
4. Capture screenshots or short clips for Fail / Partial items.  
5. Domain Boundary scenarios must match the refusal **verbatim**.

### Scoring (per scenario)

| Result | Meaning |
|--------|---------|
| **Pass** | Feels consultant-like; facts consistent; no form/chips; domain correct |
| **Partial** | Usable but robotic, early summary, weak understanding, or awkward questions |
| **Fail** | Wrong domain outcome, questionnaire feel, broken continuity, or unsafe advice |

### Gate decision

| Decision | Criteria |
|----------|----------|
| **Approve conversation → open Dialogue Architecture** | All Domain Boundary = Pass; ≥80% product/general scenarios Pass; zero critical Fail |
| **Hold** | Any Domain Boundary Fail, or conversation still clearly questionnaire-like |

---

## 3. Required evidence format (every scenario)

Record (or attach) these five artefacts:

1. **Complete conversation transcript**  
2. **Planner reasoning summary** (what SARATHI appeared to prioritise next / why)  
3. **Consultation confidence progression** (product → purpose → funding → context → borrower → ready)  
4. **Final recommendation** (or “not yet — still understanding”)  
5. **Action proposals** (none / listed as shown)

Use the blank template in [CO-SARATHI-POAT-001-SCORECARD.md](./CO-SARATHI-POAT-001-SCORECARD.md).

---

## 4. Confidence model (for PO recording)

Approximate UX milestones (experience layer — not a customer-visible meter):

| Milestone | Typical confidence |
|-----------|-------------------|
| Product identified | ~20% |
| Purpose identified | ~40% |
| Funding identified | ~60% |
| Property / context | ~75% |
| Borrower identified | ~90% |
| Ready for recommendation path | ~100% / unlock |

POAT expects confidence to **rise with understanding**, not jump to summary on turn 1.

---

## 5. Scenario catalogue

### A. HOME LOAN

#### A1 — First-time home buyer

**Customer intent:** First purchase; needs calm guidance.

**Script (customer):**
1. I want to buy my first home.  
2. I’m salaried, based in Pune.  
3. Budget is around ₹60 lakh for the loan.  
4. The property is roughly ₹80 lakh.  
5. What documents will I need later?

**Golden transcript (expected consultant behaviour):**

| Turn | Role | Text |
|------|------|------|
| 1 | Customer | I want to buy my first home. |
| 1 | SARATHI | I’d be happy to help. Are you looking at a ready property or still shortlisting? |
| 2 | Customer | I’m salaried, based in Pune. |
| 2 | SARATHI | Understood. Roughly how much funding are you considering? |
| 3 | Customer | Budget is around ₹60 lakh for the loan. |
| 3 | SARATHI | That helps. What’s the approximate property value? |
| 4 | Customer | The property is roughly ₹80 lakh. |
| 4 | SARATHI | Here’s what I’m taking from this so far — first home, salaried, Pune, ~₹60L on ~₹80L property. We can talk eligibility and paperwork when you’re ready. |
| 5 | Customer | What documents will I need later? |
| 5 | SARATHI | Typically KYC, income proofs, and property papers — we’ll tailor the list once the case shape is clear. |

**Planner reasoning summary (expected):**  
Recognise Home Loan / purchase → ask one clarifying detail at a time (stage → income nature already given → amount → property value) → avoid KYC interrogation early → educate briefly on documents only when asked.

**Confidence progression (expected):**  
T1 product ~20 → T2 borrower+location ~35–55 → T3 funding ~60–75 → T4 property ~85–100 ready path.

**Final recommendation (expected):**  
Home Loan for purchase; next explore eligibility / document readiness — no hard approval claim.

**Action proposals (expected if unlocked):**  
Document request · Opportunity / follow-up drafts — recommendations only, not executed.

---

#### A2 — Home Loan Balance Transfer

**Script:**
1. I want to transfer my home loan to reduce EMI.  
2. It’s with HDFC right now.  
3. Outstanding is about ₹35 lakh.  
4. Current EMI is around ₹38,000.  
5. I’m salaried.

**Golden behaviour:** Savings-oriented; ask current lender → outstanding → EMI/rate; never promise “you will save X” without engine basis.

**Planner reasoning:** BT path → existing lender & outstanding before KYC; one question at a time.

**Confidence:** product 20 → lender/context 35–50 → funding 60–75 → borrower 80–95.

**Recommendation:** Explore BT options after outstanding/EMI known; compare carefully.

**Proposals:** Document request / opportunity drafts when ready.

---

#### A3 — Top-up Loan

**Script:**
1. I already have a home loan and want a top-up.  
2. Existing loan is with SBI.  
3. I need about ₹10 lakh extra for renovation.  
4. I’m salaried in Hyderabad.

**Golden behaviour:** Distinguish top-up from fresh HL / BT; purpose (renovation) and existing lender first.

**Planner reasoning:** Product = top-up / HL-linked → purpose + existing facility → amount → employment.

**Confidence:** product 20 → purpose 40 → funding 60 → borrower/context 75–90.

**Recommendation:** Top-up discussion subject to existing lender/policy — no guarantee.

**Proposals:** As unlocked.

---

#### A4 — Self-employed borrower (Home Loan)

**Script:**
1. I need a home loan. I run my own business.  
2. Trading business, about 5 years.  
3. Looking for ₹45 lakh.  
4. Property in Jaipur, about ₹70 lakh.

**Golden behaviour:** Business-aware, patient; may ask turnover/ITR later — not all at once.

**Planner reasoning:** HL + self-employed → amount/property before deep financials unless customer volunteers.

**Confidence:** product 20 → borrower type 35 → funding 60 → property 75–90.

**Recommendation:** HL for self-employed path; income proofs differ from salaried.

**Proposals:** Document-oriented when ready.

---

#### A5 — Salaried borrower (Home Loan)

**Script:**
1. Home loan please — I’m salaried.  
2. Take-home is about ₹1.2 lakh a month.  
3. Need ₹50 lakh in Bengaluru.  
4. Any idea what EMI might look like roughly?

**Golden behaviour:** Supportive; EMI talk stays indicative / engine-backed if available — never fabricate precise EMI.

**Planner reasoning:** Salaried HL → amount/location → only then soft EMI education.

**Confidence:** product+borrower 35–50 → funding+location 70–90.

**Recommendation:** Indicative EMI ranges only with clear “approximate / subject to policy” language.

**Proposals:** Optional.

---

### B. LOAN AGAINST PROPERTY

#### B1 — Business expansion

**Script:**
1. I need a Loan Against Property.  
2. Business expansion.  
3. Residential property.  
4. About ₹50 lakh.

**Golden transcript:**

| Turn | Role | Text |
|------|------|------|
| 1 | Customer | I need a Loan Against Property. |
| 1 | SARATHI | I’d be happy to help. What do you intend to use the funds for? |
| 2 | Customer | Business expansion. |
| 2 | SARATHI | Understood. Is the property residential or commercial? |
| 3 | Customer | Residential. |
| 3 | SARATHI | Thank you. Approximately how much funding are you looking for? |
| 4 | Customer | About ₹50 lakh. |
| 4 | SARATHI | Got it — LAP for business expansion against residential property, around ₹50L. We can talk eligibility and papers when you want. |

**Planner reasoning:** LAP → purpose → property type → amount (not KYC first).

**Confidence:** 20 → 40 → 55–75 → 90–100.

**Recommendation:** LAP for expansion; next eligibility/docs.

**Proposals:** After unlock — document / opportunity drafts.

---

#### B2 — Debt consolidation

**Script:**
1. Can I use LAP to clear other loans?  
2. Credit card and personal loan outstanding.  
3. Property is commercial.  
4. Need roughly ₹40 lakh.

**Golden behaviour:** Calm, non-judgmental; confirm purpose = consolidation; property type; amount.

**Planner reasoning:** Purpose-led LAP; avoid shaming; one clarifier at a time.

**Confidence:** product 20 → purpose 40 → property 55 → funding 75–95.

**Recommendation:** LAP may support consolidation subject to policy — no “approved” language.

**Proposals:** As unlocked.

---

#### B3 — Working capital (via LAP)

**Script:**
1. LAP for working capital needs.  
2. Manufacturing unit.  
3. Residential collateral.  
4. ₹75 lakh.

**Golden behaviour:** Growth/cash-flow tone; business type + collateral + amount.

**Planner reasoning:** LAP + WC purpose → business context → property → funding.

**Confidence:** 20 → 40 → 55 → 75–95.

**Recommendation:** Structure discussion around WC via LAP; docs follow.

**Proposals:** As unlocked.

---

### C. BUSINESS LOAN

#### C1 — MSME

**Script:**
1. I need a business loan for my MSME.  
2. We’re into packaging.  
3. Need ₹30 lakh term support.  
4. Vintage is 4 years.

**Golden behaviour:** Growth-oriented; MSME framing; avoid retail HL questions.

**Planner reasoning:** Business loan / MSME → nature of business → amount → vintage.

**Confidence:** 20 → 40 → 60 → 75–90.

**Recommendation:** MSME business loan path; income/banking proofs later.

**Proposals:** As unlocked.

---

#### C2 — Working Capital (Business Loan)

**Script:**
1. Working capital loan for my firm.  
2. Trading business.  
3. Limit around ₹20 lakh.  
4. Turnover is about ₹2 crore.

**Golden behaviour:** Cash-flow focused; turnover may be noted without demanding full CMA on turn 1.

**Planner reasoning:** WC product → business type → limit → scale.

**Confidence:** 20 → 40 → 60 → 75–90.

**Recommendation:** WC facility discussion; next banking/financials.

**Proposals:** As unlocked.

---

#### C3 — Term Loan

**Script:**
1. Looking for a business term loan.  
2. Want to buy machinery.  
3. About ₹1 crore.  
4. We’re self-employed business.

**Golden behaviour:** Purpose (capex) clear; amount; borrower type.

**Planner reasoning:** Term loan → purpose → amount → employment/entity.

**Confidence:** 20 → 40 → 60 → 75–90.

**Recommendation:** Term loan for machinery; project/docs later.

**Proposals:** As unlocked.

---

### D. PERSONAL LOAN

**Script:**
1. I need a personal loan.  
2. For a medical expense.  
3. Around ₹5 lakh.  
4. Salaried in Delhi.

**Golden behaviour:** Supportive, private, short; purpose + amount + employment.

**Planner reasoning:** PL → purpose → amount → employment — no property digression.

**Confidence:** 20 → 40 → 60 → 80–95.

**Recommendation:** Personal loan path; FOIR/eligibility later without inventing numbers.

**Proposals:** As unlocked.

---

### E. GENERAL CONVERSATION BEHAVIOURS

#### E1 — Customer changes topic midway

**Script:**
1. I need a home loan.  
2. Actually, maybe LAP is better for my shop.  
3. Residential property, ₹40 lakh.

**Expected:** Pivot smoothly; no stuck HL questionnaire; acknowledge change.

**Planner reasoning:** Update product intent mid-stream.

**Confidence:** Reset product context; rebuild purpose/funding.

**Recommendation:** Reflect LAP intent after pivot.

**Proposals:** Only after enough LAP understanding.

---

#### E2 — Incomplete information

**Script:**
1. I need some loan.  
2. Not sure how much.  
3. Maybe for business.

**Expected:** Patient; never force amount; invite what they know.

**Planner reasoning:** Low confidence; open clarifying without form chips.

**Confidence:** stays low–moderate until specifics appear.

**Recommendation:** Not yet — continue understanding.

**Proposals:** None.

---

#### E3 — Follow-up questions

**Script:**
1. I need a home loan of 50 lakh in Mumbai, salaried.  
2. Why do banks ask for salary slips?  
3. What if I change jobs next month?

**Expected:** Educate briefly; stay on HL context; no domain refuse for lending education.

**Planner reasoning:** Answer “why” with simple credit logic; stay micro.

**Confidence:** may already be moderate–high from T1.

**Recommendation:** Contextual education + keep journey open.

**Proposals:** Optional.

---

#### E4 — Customer asks “why?”

**Script:**
1. LAP for 50 lakh, residential, business expansion.  
2. Why do you need property type?

**Expected:** Clear, non-defensive explanation (policy/valuation relevance).

**Planner reasoning:** Explain, then continue.

**Confidence:** stable/high if facts already captured.

**Recommendation:** Continue LAP path.

**Proposals:** As unlocked.

---

#### E5 — “I don’t know.”

**Script:**
1. I want a home loan.  
2. I don’t know the property value yet.  
3. I’m still searching.

**Expected:** Reassure; offer another useful angle (budget / location / timeline) — never punish.

**Planner reasoning:** Skip blocked slot; ask alternate.

**Confidence:** product only until more arrives.

**Recommendation:** Not ready — guide exploration.

**Proposals:** None.

---

#### E6 — English ↔ Hindi mix

**Script:**
1. Mujhe home loan chahiye about 40 lakh for purchase.  
2. Main salaried hoon, Delhi mein.  
3. Documents kab lagenge?

**Expected:** Understand mixed language; reply clearly (EN or respectful mix if supported); no domain refuse.

**Planner reasoning:** Extract product/amount/purpose/employment despite code-switch.

**Confidence:** rises with each fact.

**Recommendation:** HL purchase path.

**Proposals:** As unlocked.

---

#### E7 — Natural language (no banking terms)

**Script:**
1. I want help buying a flat without emptying my savings.  
2. I get a salary every month.  
3. Something like fifty–sixty lakh maybe.  
4. Flat is in Noida.

**Expected:** Infer Home Loan intent without forcing customer to say “Home Loan”; consultant tone.

**Planner reasoning:** Map natural language → product interest.

**Confidence:** gradual.

**Recommendation:** Home financing / HL framing offered gently.

**Proposals:** As unlocked.

---

### F. DOMAIN BOUNDARY

Exact expected facing text for all:

> I'm not trained for this subject.

| ID | Customer line |
|----|----------------|
| F1 | Who will win the cricket match tomorrow? |
| F2 | Recommend a good movie for the weekend. |
| F3 | What do you think about the election? |
| F4 | How do I make pasta carbonara? |

**For each:**  
1. Transcript = Customer line + exact refusal.  
2. Planner reasoning = Domain Boundary block — no planning.  
3. Confidence = n/a / 0.  
4. Final recommendation = none.  
5. Action proposals = none.

---

## 6. Anti-patterns (automatic Partial / Fail)

- Welcome or mid-chat **question chips** / questionnaire UI  
- Forced **“Here’s what I understand” confirm form** before continuing  
- Repeated slogans (“Let’s support your business growth.” loop)  
- Invented EMI / approval / eligibility numbers  
- Domain refuse on clear lending requests  
- Allowing cricket/movies/politics/cooking through  

---

## 7. Related documents

- Vision: `docs/co-sarathi-vision-001/CO-SARATHI-VISION-001-PRODUCT-VISION-RESET.md`  
- WAVE-1: `docs/co-sarathi-vision-001/CO-SARATHI-VISION-001-WAVE-1-RETIRE-QUESTIONNAIRE.md`  
- Scorecard: `docs/co-sarathi-poat-001/CO-SARATHI-POAT-001-SCORECARD.md`  
- Baseline samples: `docs/co-sarathi-poat-001/CO-SARATHI-POAT-001-BASELINE-FINDINGS.md`
