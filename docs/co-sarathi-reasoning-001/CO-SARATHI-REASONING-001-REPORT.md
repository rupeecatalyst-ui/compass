# CO-SARATHI-REASONING-001 — Intelligent Consultation Engine Report

**Status:** Implemented (experience layer) · Awaiting Product Owner approval  
**Does not change:** UI · Enterprise AI Platform architecture · Planner · Voice · Domain Boundary engine code

---

## 1. Reasoning flow

Before every facing response, SARATHI silently evaluates:

1. What is the customer trying to achieve?  
2. Did they ask a direct question? → **Answer first**  
3. Did they answer the previous question? → update **Consultation Memory**  
4. What do we already know?  
5. What is still missing?  
6. What is the single most valuable next move?  
7. Choose **one** primary objective: Answer · Educate · Clarify · Ask · Recommend  

### Mandatory response order

```text
UNDERSTAND → ANSWER → ACKNOWLEDGE → ADVANCE
```

### Self-validation

Before emit: answered? acknowledged? repeating? advancing? consultant-natural?  
If any check fails → regenerate once.

### Domain context (without redesigning Domain Boundary)

Conversation experience **enriches** the text sent to Domain Boundary for:

- Natural purchase language (“buy my first home”)  
- Bare “loan” timeline questions  
- Contextual follow-ups (How? Why? Yes? Okay? Continue?) while a consultation is active  

True outside topics (cricket / politics / …) still refuse exactly:  
`I'm not trained for this subject.`

---

## 2. Before vs After

### Direct question

**Before**

Customer: How fast can I get a business loan?  
SARATHI: *(ignored / generic / stalled)*

**After**

Customer: How fast can I get a business loan?  
SARATHI: With complete documents, some business loan cases can move quite quickly, although timelines depend on the lender and your profile. Is your business a proprietorship, partnership, or private limited?

### Memory

**Before**

Customer: Yes  
SARATHI: Share whatever feels useful next.

**After**

Customer: Yes  
SARATHI: Understood. Approximately how much funding are you looking for? *(builds on known product / prior ask)*

### Natural home purchase

**Before**

Customer: I want to buy my first home.  
SARATHI: I'm not trained for this subject.

**After**

Customer: I want to buy my first home.  
SARATHI: I'd be glad to help with your home purchase. … *(in-domain; advances consultation)*

---

## 3. Test results (automated)

| Path | Result |
|------|--------|
| Home purchase natural language | Must stay in-domain |
| How fast / business loan | Answer-first + advance |
| Why? / Yes after lending turn | Not domain-refused |
| Cricket | Exact refusal |
| Regression (AI-111 readiness + WAVE verifies) | Run in CI scripts |

Product paths exercised in verify / sample:

- Home Loan (natural + explicit)  
- Balance Transfer (prior baseline)  
- LAP  
- Business Loan (timeline question)  
- Personal Loan (memory slots available)

---

## 4. Known limitations

1. Answers are **consultant-safe educational** drafts (experience layer), not a new LLM provider call — Dialogue Architecture wave can deepen generative reasoning later.  
2. Planner is still consulted for gaps; reasoning layer **orders** Answer→Advance and suppresses generic / KYC-first loops when memory has a better next fact.  
3. Soft proposal unlock from WAVE-1 unchanged.  
4. Hindi mix relies on existing multilingual path + memory extraction heuristics.  
5. Exact EMI / approval numbers are still never invented.

---

## 5. Files

- `consultation-reasoning.ts`  
- `consultation-memory.ts`  
- `turn-orchestrator.ts` (wire-up only)  
- Version `3.3.0-reasoning-001`
