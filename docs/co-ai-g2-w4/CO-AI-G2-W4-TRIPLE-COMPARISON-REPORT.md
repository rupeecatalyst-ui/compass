# CO-AI-G2-W4 Triple Comparison — Internal Evaluation Suite

**Suite score:** 73.5 · **Suite deviation:** 6.3 · **Version:** 1.0.0-g2-w4

Report ID: `eao_triple_suite_b58dcc62-841c-411d-8b89-662dfc291f24` · Customer isolated: **true**

> Internal evaluation only. Never show to customers.

---

## Triple comparison — `eao_triple_18a19e44-3e71-4c7b-9e20-397433075086`

**Customer:** How fast can I get a business loan?

| Field | Value |
|-------|-------|
| Product path | business_loan |
| Score (live+model mean) | **81.5** |
| Deviation from gold (mean) | **4.1** |
| Customer isolated | true |
| Compared at | 2026-08-06T19:21:28.035Z |

### Matched gold

- Business Loan — Business loan speed (match 1)
- Gold customer: How fast can I get a business loan?
- Gold consultant: With complete documents, some business loan cases can move quite quickly, although timelines depend on the lender and your profile. Is your business a proprietorship, partnership, or private limited?

### Current SARATHI

| Metric | Value |
|--------|-------|
| Score | 85.5 |
| Deviation from gold | 0 |

**Facing:** With complete documents, some business loan cases can move quite quickly, although timelines depend on the lender and your profile. Is your business a proprietorship, partnership, or private limited?

**Strengths**
- Substantive reply length
- Avoids banned generic chatbot phrasing
- No invented EMI/rate/approval claims detected
- Includes a follow-up question
- Addresses a direct customer question with substance
- Meaningful lexical alignment with gold standard

**Weaknesses**

**Recommendation:** Strong consultant pattern — preserve answer-first and safety.

### Conversational Reasoning Model

| Metric | Value |
|--------|-------|
| Score | 77.4 |
| Deviation from gold | 8.1 |

**Facing:** That's a fair question. Timelines and fit depend on your profile and documents — I won't invent numbers, but I can guide what typically matters next.

**Strengths**
- Substantive reply length
- Avoids banned generic chatbot phrasing
- No invented EMI/rate/approval claims detected
- Addresses a direct customer question with substance

**Weaknesses**
- Missing a clear next question
- Low lexical alignment with matched gold consultant reply

**Recommendation:** Advance with one high-value missing fact question after answering.

### Gold Standard Consultation

| Metric | Value |
|--------|-------|
| Score | 85.5 |
| Deviation from gold | 0 |

**Facing:** With complete documents, some business loan cases can move quite quickly, although timelines depend on the lender and your profile. Is your business a proprietorship, partnership, or private limited?

**Strengths**
- Substantive reply length
- Avoids banned generic chatbot phrasing
- No invented EMI/rate/approval claims detected
- Includes a follow-up question
- Addresses a direct customer question with substance
- Meaningful lexical alignment with gold standard

**Weaknesses**

**Recommendation:** Strong consultant pattern — preserve answer-first and safety.

### Aggregate

**Strengths**
- Substantive reply length
- Avoids banned generic chatbot phrasing
- Includes a follow-up question
- Addresses a direct customer question with substance

**Weaknesses**
- Missing a clear next question
- Low lexical alignment with matched gold consultant reply

**Recommendation:** Live SARATHI currently closer to gold — keep live facing; use model for gap analysis only.

---

## Triple comparison — `eao_triple_115adc3e-68ed-4317-ab32-430fac80a320`

**Customer:** I want to buy my first home — a ready flat in Pune.

| Field | Value |
|-------|-------|
| Product path | home_loan |
| Score (live+model mean) | **74.5** |
| Deviation from gold (mean) | **3.6** |
| Customer isolated | true |
| Compared at | 2026-08-06T19:21:28.035Z |

### Matched gold

- Home Loan — First home — ready flat (match 1)
- Gold customer: I want to buy my first home — a ready flat in Pune.
- Gold consultant: I'd be glad to help with your first home purchase in Pune. Before we go deeper, are you salaried or self-employed?

### Current SARATHI

| Metric | Value |
|--------|-------|
| Score | 78 |
| Deviation from gold | 0 |

**Facing:** I'd be glad to help with your first home purchase in Pune. Before we go deeper, are you salaried or self-employed?

**Strengths**
- Substantive reply length
- Avoids banned generic chatbot phrasing
- No invented EMI/rate/approval claims detected
- Includes a follow-up question
- Meaningful lexical alignment with gold standard

**Weaknesses**

**Recommendation:** Maintain current consultant posture.

### Conversational Reasoning Model

| Metric | Value |
|--------|-------|
| Score | 70.9 |
| Deviation from gold | 7.1 |

**Facing:** Thank you for sharing that. To advise accurately, it helps to know which loan type you're exploring and roughly how much funding you need.

**Strengths**
- Substantive reply length
- Avoids banned generic chatbot phrasing
- No invented EMI/rate/approval claims detected

**Weaknesses**
- Missing a clear next question
- Low lexical alignment with matched gold consultant reply

**Recommendation:** Advance with one high-value missing fact question after answering.

### Gold Standard Consultation

| Metric | Value |
|--------|-------|
| Score | 78 |
| Deviation from gold | 0 |

**Facing:** I'd be glad to help with your first home purchase in Pune. Before we go deeper, are you salaried or self-employed?

**Strengths**
- Substantive reply length
- Avoids banned generic chatbot phrasing
- No invented EMI/rate/approval claims detected
- Includes a follow-up question
- Meaningful lexical alignment with gold standard

**Weaknesses**

**Recommendation:** Maintain current consultant posture.

### Aggregate

**Strengths**
- Substantive reply length
- Avoids banned generic chatbot phrasing
- Includes a follow-up question

**Weaknesses**
- Missing a clear next question
- Low lexical alignment with matched gold consultant reply

**Recommendation:** Live SARATHI currently closer to gold — keep live facing; use model for gap analysis only.

---

## Triple comparison — `eao_triple_fa95b566-2291-4d0f-9d87-87bb267e77c4`

**Customer:** I want a home loan balance transfer to reduce my EMI.

| Field | Value |
|-------|-------|
| Product path | balance_transfer |
| Score (live+model mean) | **64.4** |
| Deviation from gold (mean) | **11.3** |
| Customer isolated | true |
| Compared at | 2026-08-06T19:21:28.036Z |

### Matched gold

- Balance Transfer — BT to reduce EMI (match 1)
- Gold customer: I want a home loan balance transfer to reduce my EMI.
- Gold consultant: Balance transfer can help when your current rate or EMI is no longer competitive. Which bank is your current home loan with?

### Current SARATHI

| Metric | Value |
|--------|-------|
| Score | 53.1 |
| Deviation from gold | 22.5 |

**Facing:** Let's explore your options. Share whatever feels useful next.

**Strengths**
- Substantive reply length
- No invented EMI/rate/approval claims detected

**Weaknesses**
- Contains banned generic phrasing
- Missing a clear next question
- Low lexical alignment with matched gold consultant reply

**Recommendation:** Replace generic chatbot lines with answer-first, case-specific guidance.

### Conversational Reasoning Model

| Metric | Value |
|--------|-------|
| Score | 75.6 |
| Deviation from gold | 0 |

**Facing:** Balance transfer can help when your current rate or EMI is no longer competitive. Which bank is your current home loan with?

**Strengths**
- Substantive reply length
- Avoids banned generic chatbot phrasing
- No invented EMI/rate/approval claims detected
- Includes a follow-up question
- Meaningful lexical alignment with gold standard

**Weaknesses**

**Recommendation:** Maintain current consultant posture.

### Gold Standard Consultation

| Metric | Value |
|--------|-------|
| Score | 75.6 |
| Deviation from gold | 0 |

**Facing:** Balance transfer can help when your current rate or EMI is no longer competitive. Which bank is your current home loan with?

**Strengths**
- Substantive reply length
- Avoids banned generic chatbot phrasing
- No invented EMI/rate/approval claims detected
- Includes a follow-up question
- Meaningful lexical alignment with gold standard

**Weaknesses**

**Recommendation:** Maintain current consultant posture.

### Aggregate

**Strengths**
- Substantive reply length
- Avoids banned generic chatbot phrasing
- Includes a follow-up question

**Weaknesses**
- Contains banned generic phrasing
- Missing a clear next question
- Low lexical alignment with matched gold consultant reply

**Recommendation:** Reasoning model outperforms live on this turn — candidate insight for future Hybrid (not customer-visible).

---
