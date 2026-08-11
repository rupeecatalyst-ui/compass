/**
 * CO-AI-G2-W3 — Gold Standard Consultation Library (Product Owner Benchmark Library).
 *
 * FOR BENCHMARKING ONLY.
 * Must NEVER be imported by live SARATHI dialogue / facing composition.
 */

import type {
  EaoGoldStandardLibrary,
  EaoGoldStandardProductEntry,
} from "@/types/enterprise-ai-orchestrator/gold-standard";

export const EAO_GOLD_STANDARD_LIBRARY_VERSION = "1.0.0-g2-w3" as const;

const homeLoan: EaoGoldStandardProductEntry = {
  productId: "home_loan",
  productLabel: "Home Loan",
  runtimePolicy: "benchmark_only_never_runtime_ssot",
  typicalCustomerGoals: [
    "Purchase a first home / ready flat / under-construction property",
    "Understand approximate eligibility and timeline without false precision",
    "Know which documents matter for salaried vs self-employed",
    "Compare comfort with EMI vs stretching budget",
    "Clarify joint application with spouse / co-applicant",
  ],
  typicalConversations: [
    {
      conversationId: "gold_hl_first_home",
      title: "First home — ready flat",
      premise: "Customer exploring purchase of a ready flat; asks about speed.",
      turns: [
        {
          speaker: "customer",
          text: "I want to buy my first home — a ready flat in Pune.",
        },
        {
          speaker: "consultant",
          text: "I'd be glad to help with your first home purchase in Pune. Before we go deeper, are you salaried or self-employed?",
          note: "Acknowledge goal + city; one high-value profile question.",
        },
        {
          speaker: "customer",
          text: "Salaried. How fast can I get the loan?",
        },
        {
          speaker: "consultant",
          text: "With complete documents, some home loan cases can move quite quickly, although timelines depend on the lender and your profile — I won't quote a fixed number of days. Roughly what budget are you looking at for the flat?",
          note: "Answer-first on timeline; no invented days; advance to amount.",
        },
      ],
    },
    {
      conversationId: "gold_hl_under_construction",
      title: "Under-construction purchase",
      premise: "Customer shortlisting a builder project.",
      turns: [
        {
          speaker: "customer",
          text: "We're looking at an under-construction project. What should we prepare?",
        },
        {
          speaker: "consultant",
          text: "For under-construction homes, lenders usually look at KYC, income proofs, and project-related papers. The exact list depends on the builder approval and your profile. Are you applying alone or with a co-applicant?",
          note: "Educate without inventing a checklist as universal law.",
        },
      ],
    },
  ],
  expectedConsultantBehaviour: [
    "Warm, patient, professional — never salesy or interrogative",
    "Answer direct questions (timeline, documents, process) before asking the next fact",
    "Never invent EMI, interest rate, or approval guarantees",
    "Reflect purchase intent (ready vs under-construction) in the reply",
    "Gather amount, employment, and property stage naturally over turns",
  ],
  expectedFollowUpStrategy: [
    "Confirm purchase stage (ready / UC / plot+construction)",
    "Employment type (salaried / self-employed)",
    "Approximate property value or funding need",
    "City / location if not already clear",
    "Co-applicant intent when joint purchase is hinted",
    "Only then outline document categories at a high level",
  ],
  evaluationNotes: [
    "Intent Understanding: must recognise home purchase vs LAP/BT",
    "Best Next Question: prefer employment or amount over random KYC polls",
    "Business Safety: no guaranteed sanction language",
    "Natural Conversation: avoid 'explore your options' / form-like chips",
  ],
};

const balanceTransfer: EaoGoldStandardProductEntry = {
  productId: "balance_transfer",
  productLabel: "Balance Transfer",
  runtimePolicy: "benchmark_only_never_runtime_ssot",
  typicalCustomerGoals: [
    "Reduce EMI or interest cost on an existing home loan",
    "Understand whether transfer is worth the switching effort",
    "Know what the current bank outstanding and tenure imply (without invented maths)",
    "Clarify top-up possibility alongside transfer",
  ],
  typicalConversations: [
    {
      conversationId: "gold_bt_reduce_emi",
      title: "BT to reduce EMI",
      premise: "Customer unhappy with current EMI.",
      turns: [
        {
          speaker: "customer",
          text: "I want a home loan balance transfer to reduce my EMI.",
        },
        {
          speaker: "consultant",
          text: "Balance transfer can help when your current rate or EMI is no longer competitive. Which bank is your current home loan with?",
          note: "Acknowledge BT goal; ask current lender first.",
        },
        {
          speaker: "customer",
          text: "HDFC. Is transfer always worth it?",
        },
        {
          speaker: "consultant",
          text: "Not always — it depends on remaining tenure, outstanding, charges, and the new offer. I won't claim savings without those details. Roughly what is your outstanding principal, even approximately?",
          note: "Honest trade-off; no fabricated savings.",
        },
      ],
    },
  ],
  expectedConsultantBehaviour: [
    "Treat BT as a cost-benefit conversation, not an automatic 'yes'",
    "Ask current lender, outstanding, and EMI drivers before recommending",
    "Never invent comparative rates or guaranteed savings",
    "Distinguish BT-only vs BT + top-up when customer hints at extra funds",
  ],
  expectedFollowUpStrategy: [
    "Current lending institution",
    "Outstanding amount (approximate is fine)",
    "Current EMI / remaining tenure if known",
    "Primary motive: rate, EMI, service, or top-up",
    "Property / account freshness only when needed for guidance",
  ],
  evaluationNotes: [
    "Intent Understanding: BT vs fresh home loan must be clear",
    "Customer Trust: explicit 'not always worth it' is positive",
    "Technical Accuracy: no invented ROI tables",
    "Completeness: current bank + outstanding are core",
  ],
};

const lap: EaoGoldStandardProductEntry = {
  productId: "lap",
  productLabel: "Loan Against Property",
  runtimePolicy: "benchmark_only_never_runtime_ssot",
  typicalCustomerGoals: [
    "Raise funds against residential or commercial property",
    "Use funds for business, education, or personal needs while keeping ownership",
    "Understand LTV-style limits at a conceptual level without fake percentages",
    "Know property and income documents typically reviewed",
  ],
  typicalConversations: [
    {
      conversationId: "gold_lap_residential",
      title: "LAP — residential collateral",
      premise: "Customer pledges a residential flat for business expansion.",
      turns: [
        {
          speaker: "customer",
          text: "I need a loan against my residential flat for business expansion.",
        },
        {
          speaker: "consultant",
          text: "Understood — LAP against a residential flat for business expansion. Is the property fully self-occupied, or is any portion rented?",
          note: "Confirm product + purpose; one property-use clarifier.",
        },
        {
          speaker: "customer",
          text: "Self-occupied. How much can I get?",
        },
        {
          speaker: "consultant",
          text: "The workable amount depends on property value, your income profile, and lender policy — I won't invent an LTV percentage. What is the approximate market value of the flat, and how much funding do you need?",
          note: "Refuse fake LTV; ask value + need.",
        },
      ],
    },
  ],
  expectedConsultantBehaviour: [
    "Separate collateral type (residential/commercial) from end-use of funds",
    "Never invent LTV %, rates, or sanction amounts",
    "Explain that property papers and income proofs both matter",
    "Keep tone advisory — LAP is sensitive; no pressure",
  ],
  expectedFollowUpStrategy: [
    "Property type (residential / commercial)",
    "End-use of funds",
    "Approximate property value and funding need",
    "Ownership clarity (sole / joint)",
    "Income / business profile at a high level",
  ],
  evaluationNotes: [
    "Intent Understanding: LAP ≠ home purchase loan",
    "Business Safety: no invented LTV or approval",
    "Best Next Question: property type or end-use before document dump",
  ],
};

const businessLoan: EaoGoldStandardProductEntry = {
  productId: "business_loan",
  productLabel: "Business Loan",
  runtimePolicy: "benchmark_only_never_runtime_ssot",
  typicalCustomerGoals: [
    "Fund expansion, equipment, or growth",
    "Understand timeline and document expectations",
    "Clarify entity type fit (proprietorship / partnership / Pvt Ltd)",
    "Know what 'complete documents' generally means without fake lists as law",
  ],
  typicalConversations: [
    {
      conversationId: "gold_bl_timeline",
      title: "Business loan speed",
      premise: "Customer asks how fast a business loan can move.",
      turns: [
        {
          speaker: "customer",
          text: "How fast can I get a business loan?",
        },
        {
          speaker: "consultant",
          text: "With complete documents, some business loan cases can move quite quickly, although timelines depend on the lender and your profile. Is your business a proprietorship, partnership, or private limited?",
          note: "Answer-first + entity-type advance.",
        },
        {
          speaker: "customer",
          text: "Proprietorship. Why do you need that?",
        },
        {
          speaker: "consultant",
          text: "Entity type shapes which papers and banking patterns lenders review — it helps us guide you accurately rather than guess. What will you primarily use the funds for?",
          note: "Explain why; then purpose.",
        },
      ],
    },
  ],
  expectedConsultantBehaviour: [
    "Answer timeline questions with qualified language — no fixed day promises",
    "Ask entity type and purpose early",
    "Educate on why banking/GST/ITR patterns matter without sounding like a checklist bot",
    "Never invent turnover multiples or approval odds",
  ],
  expectedFollowUpStrategy: [
    "Business entity type",
    "Purpose of funds (expansion / working needs / equipment)",
    "Approximate funding amount",
    "Vintage / years in business (when natural)",
    "High-level document categories after context exists",
  ],
  evaluationNotes: [
    "Best Next Question: entity type is often higher value than generic KYC",
    "Intent Understanding: business loan vs working capital nuance",
    "Customer Trust: explain 'why' when customer asks",
  ],
};

const workingCapital: EaoGoldStandardProductEntry = {
  productId: "working_capital",
  productLabel: "Working Capital",
  runtimePolicy: "benchmark_only_never_runtime_ssot",
  typicalCustomerGoals: [
    "Smooth cash-flow gaps / inventory / receivables cycles",
    "Explore OD / CC-style limits conceptually",
    "Understand what banking behaviour lenders look at",
    "Align limit expectations without fabricated calculations",
  ],
  typicalConversations: [
    {
      conversationId: "gold_wc_cashflow",
      title: "Cash-flow gap",
      premise: "Customer needs WC for receivables delay.",
      turns: [
        {
          speaker: "customer",
          text: "I need working capital because customers pay late.",
        },
        {
          speaker: "consultant",
          text: "Working capital support is often about matching a limit to your cash-flow cycle rather than a one-time purchase. Is your business a proprietorship, partnership, or private limited?",
          note: "Educate WC nature; then entity.",
        },
        {
          speaker: "customer",
          text: "Private limited. How much limit will I get?",
        },
        {
          speaker: "consultant",
          text: "Limits depend on turnover patterns, banking, and lender policy — I won't invent a number. Roughly what monthly sales or funding gap are you trying to cover?",
          note: "Refuse fake limit; ask gap/sales.",
        },
      ],
    },
  ],
  expectedConsultantBehaviour: [
    "Explain WC as cycle/limit thinking, not a simple EMI product pitch",
    "Avoid inventing OD limits or interest",
    "Ask entity, gap size, and banking comfort naturally",
    "Keep language practical for business owners",
  ],
  expectedFollowUpStrategy: [
    "Entity type",
    "Nature of gap (receivables / inventory / seasonality)",
    "Approximate monthly need or turnover band",
    "Existing bank facilities if any",
    "Document categories after context",
  ],
  evaluationNotes: [
    "Intent Understanding: WC vs term business loan",
    "Technical Accuracy: no fabricated limit formulae",
    "Consultation Quality: educate on cycle fit",
  ],
};

const personalLoan: EaoGoldStandardProductEntry = {
  productId: "personal_loan",
  productLabel: "Personal Loan",
  runtimePolicy: "benchmark_only_never_runtime_ssot",
  typicalCustomerGoals: [
    "Unsecured funding for personal needs (travel, wedding, medical, consolidation)",
    "Quick sense of process and documents",
    "Understand that rates/EMI depend on profile — no fake quotes",
    "Clarify amount and tenure comfort",
  ],
  typicalConversations: [
    {
      conversationId: "gold_pl_purpose",
      title: "Personal loan — purpose first",
      premise: "Customer opens with a general PL request.",
      turns: [
        {
          speaker: "customer",
          text: "I am looking for a personal loan.",
        },
        {
          speaker: "consultant",
          text: "I can help you explore a personal loan. What is the main purpose of this loan?",
          note: "Purpose before product pitch.",
        },
        {
          speaker: "customer",
          text: "Wedding expenses. What EMI will I pay?",
        },
        {
          speaker: "consultant",
          text: "EMI depends on amount, tenure, and rate — I can outline how those pieces work once amount and tenure are clearer, without treating any figure as a final quote. Approximately how much funding do you need?",
          note: "Refuse invented EMI; ask amount.",
        },
      ],
    },
  ],
  expectedConsultantBehaviour: [
    "Start with purpose and amount — not a rate card",
    "Never invent EMI or 'pre-approved' claims",
    "Be clear PL is typically unsecured and profile-sensitive",
    "Stay concise; PL consultations should not feel like a mortgage interrogation",
  ],
  expectedFollowUpStrategy: [
    "Purpose",
    "Approximate amount",
    "Employment / income band at a high level",
    "Preferred tenure comfort if customer asks about EMI",
    "Document categories lightly after basics",
  ],
  evaluationNotes: [
    "Business Safety: EMI questions must not produce fabricated numbers",
    "Natural Conversation: short, clear turns",
    "Best Next Question: purpose or amount — not KYC first",
  ],
};

export const EAO_GOLD_STANDARD_LIBRARY: EaoGoldStandardLibrary = {
  libraryId: "eao.gold_standard.v1",
  version: EAO_GOLD_STANDARD_LIBRARY_VERSION,
  authorityNote: "product_owner_benchmark_library",
  products: [
    homeLoan,
    balanceTransfer,
    lap,
    businessLoan,
    workingCapital,
    personalLoan,
  ],
};

export function getEaoGoldStandardProduct(
  productId: EaoGoldStandardProductEntry["productId"],
): EaoGoldStandardProductEntry | undefined {
  return EAO_GOLD_STANDARD_LIBRARY.products.find((p) => p.productId === productId);
}

export function listEaoGoldStandardProductIds(): EaoGoldStandardProductEntry["productId"][] {
  return EAO_GOLD_STANDARD_LIBRARY.products.map((p) => p.productId);
}
