# CO-AI-104 DIE — Tone Library Report

**Sprint:** AI-4 DIE  
**Status:** Implementation Complete — awaiting PO approval  

---

## Principle

The LLM must **not** invent emotional responses. Tone is resolved from a curated enterprise catalogue.

---

## Categories

| Category | Example lines |
|---|---|
| Home Loan | Buying a home matters. / Let's explore your options. |
| Balance Transfer | Let's reduce your borrowing cost. |
| Loan Against Property | Let's support your business growth. |
| Business Loan | Let's grow your business finance. |
| Working Capital | Let's strengthen your cash flow. |
| Personal Loan | Let's review personal loan options. |
| Eligibility | Let me check a few details. |
| Documents | One document remaining. |
| Waiting | Preparing your recommendation. |
| Recommendation | Here is a clear next step. |
| Completion | Your analysis is ready. |

SSOT: `src/constants/enterprise-ai-platform/tone-library.ts`  
Resolver: `resolveEaiToneMessage`

---

## Micro Communication Engine

Rules applied by `applyEaiMicroCommunication`:

- Professional · Warm · Simple · Trustworthy  
- Maximum 1–2 short sentences  
- Prefer ~5–7 words per line  
- Outside-domain fixed sentence preserved verbatim  

Wired into Response Composer for in-domain facing text.
