import homeLoanImg from "@/assets/products/home-loan.jpg";
import homeLoanBtImg from "@/assets/products/home-loan-bt.jpg";
import personalLoanImg from "@/assets/products/personal-loan.jpg";
import workingCapitalImg from "@/assets/products/working-capital.jpg";
import mutualFundsImg from "@/assets/products/mutual-funds.jpg";
import lapImg from "@/assets/products/lap.jpg";

export interface BlogPost {
  slug: string;
  title: string;
  category: string;
  read: string;
  excerpt: string;
  cover: string;
  content: string[]; // paragraphs
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "save-10-lakh-home-loan-balance-transfer",
    title: "How to Save ₹10 Lakh on Your Home Loan with a Balance Transfer",
    category: "Balance Transfer",
    read: "6 min",
    excerpt: "A simple framework to decide if a balance transfer is right for you — with worked examples.",
    cover: homeLoanBtImg,
    content: [
      "A home loan balance transfer (BT) is one of the most under-used wealth-creation moves in Indian personal finance. A modest 0.5–1.0% rate drop on a ₹50 lakh loan can save you ₹6–12 lakh over a 20-year tenure — yet most borrowers never check.",
      "The thumb rule: if your outstanding loan is above ₹20 lakh, you have 10+ years of tenure left, and your current rate is at least 0.50% higher than the best market rate, a balance transfer is almost always worth the paperwork.",
      "Worked example: A ₹50 lakh loan at 9.25% for 20 years has an EMI of ₹45,793. Transferring to 7.50% drops the EMI to ₹40,280 — saving ₹5,513 per month, or ₹13.2 lakh over the remaining tenure.",
      "What to watch out for: processing fees (negotiate to nil), prepayment charges from your existing lender (zero for floating-rate home loans to individuals as per RBI), and the fresh legal/technical verification of your property.",
      "Pro tip: ask for a top-up loan along with the BT. Top-ups at home-loan rates (7–8%) are dramatically cheaper than personal loans (11%+) for goals like home renovation or child education.",
      "Rupee Catalyst evaluates 100+ lenders in one shot and handles the entire BT process end-to-end — so you only sign the final papers.",
    ],
  },
  {
    slug: "personal-loan-vs-credit-card",
    title: "Personal Loan vs Credit Card: Which is Cheaper?",
    category: "Personal Loans",
    read: "5 min",
    excerpt: "When a personal loan beats a credit card, and the rare scenarios where it doesn't.",
    cover: personalLoanImg,
    content: [
      "Credit cards are convenient, but the interest rate kicks in at 36–48% p.a. the moment you carry a balance. A personal loan, by contrast, is priced at 10.5–18% p.a. for most salaried borrowers.",
      "For any expense you cannot clear within one billing cycle, a personal loan is significantly cheaper. Convert your card outstanding into an EMI or take a personal loan to pay off the card in full.",
      "Exceptions where the card wins: zero-cost EMI offers on consumer durables, lounge access or reward-point redemptions that genuinely offset the cost, and 45–50 day interest-free periods if you pay in full.",
      "Bottom line: use credit cards as a payment instrument, not a credit instrument. For any borrowing need above ₹50,000 that you cannot repay in 30 days, take a personal loan.",
    ],
  },
  {
    slug: "step-up-sip-power",
    title: "SIP Stepping: Why Increasing Your SIP by 10% Every Year Matters",
    category: "Mutual Funds",
    read: "7 min",
    excerpt: "The math behind step-up SIPs and how they can multiply your retirement corpus.",
    cover: mutualFundsImg,
    content: [
      "A flat ₹10,000 SIP for 25 years at 12% CAGR grows to ~₹1.9 Cr. A step-up SIP starting at ₹10,000 and growing 10% every year grows to ~₹4.6 Cr — over 2.4× the wealth.",
      "Why it works: your income typically grows 8–12% per year. Increasing your SIP at the same pace means investing stays painless while compounding gets a much larger base every year.",
      "Implementation: most fund platforms support an auto step-up mandate. Pick a fixed-percentage increase (we recommend 10%) and a yearly trigger date — set once, forget forever.",
      "Pair it with goal-based investing — retirement, child education, dream home — and your step-up SIP becomes the single most powerful wealth-building tool available to a salaried Indian.",
    ],
  },
  {
    slug: "working-capital-101",
    title: "Working Capital 101: OD vs CC vs Invoice Discounting",
    category: "Working Capital",
    read: "8 min",
    excerpt: "Pick the right working capital instrument for your cash conversion cycle.",
    cover: workingCapitalImg,
    content: [
      "Overdraft (OD), Cash Credit (CC) and Invoice Discounting solve the same problem — bridging the gap between paying suppliers and collecting from customers — but they work very differently.",
      "OD: a revolving limit, usually against property or fixed deposits. Best for businesses with lumpy, unpredictable cash needs.",
      "CC: a revolving limit against stock and receivables, monitored monthly. Best for manufacturers and traders with steady inventory cycles.",
      "Invoice Discounting / Bill Discounting: short-tenure funding against verified invoices to large buyers. Best for service exporters and B2B vendors with strong corporate clients.",
      "Most growing MSMEs use a combination — a CC for day-to-day cycles and invoice discounting for occasional large orders.",
    ],
  },
  {
    slug: "home-loan-eligibility-explained",
    title: "How Lenders Calculate Your Home Loan Eligibility",
    category: "Home Loans",
    read: "6 min",
    excerpt: "FOIR, LTV, age, tenure — decoded with simple examples and lender benchmarks.",
    cover: homeLoanImg,
    content: [
      "Three numbers decide your home loan eligibility: FOIR (Fixed Obligations to Income Ratio), LTV (Loan to Value) and your repayment age.",
      "FOIR: most banks cap your total EMI obligations (existing + new) at 50–60% of your net monthly income. So a ₹1 lakh income with ₹15,000 of existing EMIs leaves ₹35–45,000 for a new EMI.",
      "LTV: lenders fund 75–90% of the property value depending on the loan size. The rest is your down payment.",
      "Tenure: typically capped at your retirement age (60 for salaried, 70 for self-employed). Longer tenures = higher eligibility but more interest paid.",
      "Boost your eligibility by: adding a co-applicant (especially a spouse with income), clearing small EMIs before applying, and improving your credit score above 750.",
    ],
  },
  {
    slug: "elss-vs-ppf-vs-nps",
    title: "ELSS vs PPF vs NPS: The 80C Showdown",
    category: "Mutual Funds",
    read: "9 min",
    excerpt: "Compare lock-in, returns, taxation and flexibility across India's top 80C investments.",
    cover: lapImg,
    content: [
      "All three save tax under Section 80C (up to ₹1.5 lakh), but they're built for very different goals.",
      "ELSS: equity mutual funds with the shortest 3-year lock-in. Historical CAGR of 12–15%. Best for wealth creation when you can stomach equity volatility.",
      "PPF: government-backed, 15-year lock-in, ~7.1% tax-free returns. Best for the debt portion of your retirement portfolio.",
      "NPS: market-linked retirement product with partial equity exposure. Additional ₹50,000 deduction under 80CCD(1B). Locked till age 60, with 40% mandatory annuity at maturity.",
      "Most investors should split: ELSS for growth, PPF for safety, and NPS for the extra ₹50,000 deduction on top of 80C.",
    ],
  },
];

export const blogBySlug = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug);
