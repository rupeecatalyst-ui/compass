import type { StaticImageData } from "next/image";
import logoAsset from "@/assets/logo.asset.json";
import homeLoanImg from "@/assets/products/home-loan.jpg";
import homeLoanBtImg from "@/assets/products/home-loan-bt.jpg";
import lapImg from "@/assets/products/lap.jpg";
import personalLoanImg from "@/assets/products/personal-loan.jpg";
import workingCapitalImg from "@/assets/products/working-capital.jpg";
import businessLoanImg from "@/assets/products/business-loan.jpg";
import mutualFundsImg from "@/assets/products/mutual-funds.jpg";

export const SITE = {
  name: "Rupee Catalyst",
  tagline: "Funding Growth. Building Wealth.",
  logoUrl: logoAsset.url,
  contactName: "Ketan Kapoor",
  phone: "+91 98219 84181",
  email: "champion@rupeecatalyst.com",
  whatsapp: "+919821984181",
  address: "B724, Jaswanti Allied Business Centre, Malad West, Mumbai – 400064",
  social: {
    linkedin: "https://www.linkedin.com/company/13662122/",
    facebook: "https://www.facebook.com/RupeeCatalyst1",
    instagram: "https://www.instagram.com/_rupee_catalyst",
    twitter: "#",
    youtube: "#",
  },
  foundedYear: 2017,
};

export type ProductSlug =
  | "home-loan"
  | "home-loan-balance-transfer"
  | "loan-against-property"
  | "personal-loan"
  | "working-capital"
  | "unsecured-business-loan"
  | "mutual-funds";

export interface Product {
  slug: ProductSlug;
  name: string;
  short: string;
  rate: string;
  rateNum: number;
  tagline: string;
  image: string | StaticImageData;
  benefits: string[];
  features: string[];
  eligibility: string[];
  documents: string[];
  calculator: "home-loan" | "personal-loan" | "business-loan" | "lap" | "balance-transfer" | "sip";
  faqs: { q: string; a: string }[];
}

export const PRODUCTS: Product[] = [
  {
    slug: "home-loan",
    name: "Home Loan",
    short: "Buy your dream home with the lowest EMI.",
    rate: "7.10%*",
    rateNum: 7.10,
    tagline: "Home Loans starting at 7.10%* with high eligibility and quick approvals.",
    image: homeLoanImg,
    benefits: ["Starting from 7.10%* p.a.", "High loan eligibility", "Minimal documentation", "Quick approvals", "Balance transfer available", "Top-up facility"],
    features: ["Loan up to ₹15 Cr", "Tenure up to 30 years", "Step-up & step-down EMI", "Tax benefits under 80C & 24(b)"],
    eligibility: ["Salaried or self-employed", "Age 21–65 years", "Minimum income ₹25,000/month", "Stable employment / business vintage"],
    documents: ["KYC: PAN, Aadhaar", "Income proof: 3 months salary slips / 2 years ITR", "6 months bank statements", "Property documents"],
    calculator: "home-loan",
    faqs: [
      { q: "What is the maximum home loan I can get?", a: "Most lenders fund up to 75–90% of the property value, subject to income eligibility and credit profile." },
      { q: "Can I prepay my home loan?", a: "Yes. Floating-rate home loans to individuals carry zero foreclosure charges as per RBI guidelines." },
    ],
  },
  {
    slug: "home-loan-balance-transfer",
    name: "Home Loan Balance Transfer",
    short: "Transfer your home loan & save lakhs.",
    rate: "7.10%*",
    rateNum: 7.10,
    tagline: "Lower EMI, top-up loan and nil processing fees on balance transfer.",
    image: homeLoanBtImg,
    benefits: ["Starting from 7.10%*", "Nil processing fees*", "Lower EMI", "Top-up loan available", "Minimal documentation", "Quick approval"],
    features: ["Save up to ₹25 lakh in interest", "Top-up at home loan rates", "Transparent process", "End-to-end assistance"],
    eligibility: ["Existing home loan with min. 12 EMIs paid", "Clean repayment track record", "Age 21–65 years"],
    documents: ["KYC documents", "Existing loan statement & sanction letter", "Last 12 months loan repayment track", "Income proof"],
    calculator: "balance-transfer",
    faqs: [
      { q: "How much can I save with a balance transfer?", a: "Even a 0.50% rate drop on a ₹50 lakh loan over 20 years can save you ₹5–7 lakh in interest." },
      { q: "Are there any processing fees?", a: "Many lenders waive processing fees on balance transfer. We negotiate the best deal for you." },
    ],
  },
  {
    slug: "loan-against-property",
    name: "Loan Against Property",
    short: "Unlock the value of your property.",
    rate: "8.50%*",
    rateNum: 8.50,
    tagline: "High-value financing against your residential or commercial property.",
    image: lapImg,
    benefits: ["Starting from 8.50%*", "High loan amount", "Flexible repayment", "Use for business / education / medical / working capital"],
    features: ["Loan up to ₹25 Cr", "Tenure up to 15 years", "Residential & commercial property accepted", "OD / Term Loan options"],
    eligibility: ["Salaried or self-employed", "Owner of residential / commercial property", "Age 25–70 years"],
    documents: ["KYC documents", "Income proof / ITR", "Property documents", "Bank statements"],
    calculator: "lap",
    faqs: [
      { q: "What kind of properties are accepted?", a: "Self-occupied or rented residential and commercial properties with clear title are eligible." },
      { q: "How much loan can I get against my property?", a: "Up to 60–70% of the market value, depending on property type and your income profile." },
    ],
  },
  {
    slug: "personal-loan",
    name: "Personal Loan",
    short: "Instant funds for life's important moments.",
    rate: "9.99%*",
    rateNum: 9.99,
    tagline: "Collateral-free personal loans with quick approval and disbursal.",
    image: personalLoanImg,
    benefits: ["Starting from 9.99%*", "No collateral", "Minimal documents", "Instant approval", "Quick disbursal", "Flexible tenure"],
    features: ["Loan up to ₹40 lakh", "Tenure 12–72 months", "100% digital process", "Pre-approved offers"],
    eligibility: ["Salaried with min. ₹25,000/month income", "Self-employed with ITR", "Age 21–60 years"],
    documents: ["KYC documents", "Last 3 months salary slips", "Last 6 months bank statements", "Form 16 / ITR"],
    calculator: "personal-loan",
    faqs: [
      { q: "How fast can I get a personal loan?", a: "Many of our partner lenders disburse within 24–48 hours of approval for eligible applicants." },
      { q: "Will it affect my credit score?", a: "An approved loan, repaid on time, actually improves your credit score." },
    ],
  },
  {
    slug: "working-capital",
    name: "Working Capital Loan",
    short: "Smooth cash flow for your business.",
    rate: "8.50%*",
    rateNum: 8.50,
    tagline: "OD, CC and invoice financing to power day-to-day operations.",
    image: workingCapitalImg,
    benefits: ["Starting from 8.50%*", "Cash flow support", "OD & CC limits", "Invoice financing", "Quick processing"],
    features: ["Limit up to ₹50 Cr", "Renewable annually", "Interest only on utilised amount", "Secured & unsecured options"],
    eligibility: ["Business vintage 2+ years", "Positive net worth", "GST registration", "Banking conduct"],
    documents: ["KYC of business & promoters", "Last 2 years financials & ITR", "GST returns", "12 months bank statements"],
    calculator: "business-loan",
    faqs: [
      { q: "What is the difference between OD and CC?", a: "Cash Credit is typically against stock and receivables; Overdraft can be against property, FD or banking limits." },
      { q: "Is collateral always needed?", a: "Not always. We arrange both secured and unsecured working capital facilities depending on your profile." },
    ],
  },
  {
    slug: "unsecured-business-loan",
    name: "Unsecured Business Loan",
    short: "Grow your business without collateral.",
    rate: "13.00%*",
    rateNum: 13.00,
    tagline: "Collateral-free funding for MSMEs based on GST and banking.",
    image: businessLoanImg,
    benefits: ["Starting from 13.00%*", "No property required", "Fast approval", "Minimal documentation", "GST-based funding", "Bank-statement-based funding"],
    features: ["Loan up to ₹2 Cr", "Tenure 12–60 months", "Flexible EMI options", "Pre-payment friendly"],
    eligibility: ["Business vintage 2+ years", "Min. annual turnover ₹40 lakh", "GST returns filed regularly"],
    documents: ["KYC of business & promoters", "Last 12 months bank statements", "Last 12 months GST returns", "ITR & financials"],
    calculator: "business-loan",
    faqs: [
      { q: "How is my eligibility decided?", a: "Lenders look at GST turnover, bank-statement averages, EMI obligations and credit history." },
      { q: "How quickly can I get funded?", a: "Pre-approved digital loans can disburse in 48–72 hours; underwritten loans in 5–7 working days." },
    ],
  },
  {
    slug: "mutual-funds",
    name: "Mutual Fund Investments",
    short: "Build wealth with goal-based investing.",
    rate: "12–15%*",
    rateNum: 12,
    tagline: "SIPs, lumpsum, ELSS and retirement planning curated for your goals.",
    image: mutualFundsImg,
    benefits: ["Goal-based investing", "Tax saving via ELSS", "Retirement planning", "Portfolio review", "Expert consultation"],
    features: ["Direct & regular plans", "100% digital onboarding", "Free portfolio health check", "Dedicated relationship manager"],
    eligibility: ["Indian resident / NRI", "PAN & Aadhaar (KYC compliant)", "Bank account for SIP mandate"],
    documents: ["PAN card", "Aadhaar card", "Cancelled cheque / bank proof"],
    calculator: "sip",
    faqs: [
      { q: "How much should I start a SIP with?", a: "You can start a SIP with as little as ₹500/month. We help you size it based on your goals." },
      { q: "Are returns guaranteed?", a: "Mutual fund returns are market-linked. We help you choose funds aligned to your risk profile and goals." },
    ],
  },
];

export const productBySlug = (slug: string) =>
  PRODUCTS.find((p) => p.slug === slug);

export const LENDER_PARTNERS = [
  "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "SBI", "Yes Bank", "IDFC First", "IndusInd Bank",
  "Bajaj Finserv", "Tata Capital", "Aditya Birla Capital", "L&T Finance", "Piramal Capital", "Hero FinCorp",
  "PNB Housing", "LIC Housing Finance", "DHFL", "Federal Bank",
];

export const TRUST_STATS = [
  { value: "₹2,200+ Cr", label: "Loans Disbursed" },
  { value: "2,500+", label: "Happy Customers" },
  { value: "100+", label: "Lending Partners" },
  { value: "8+ Yrs", label: "Industry Experience" },
];

export const RATE_TABLE = PRODUCTS.filter((p) => p.slug !== "mutual-funds").map((p) => ({
  name: p.name,
  rate: p.rate,
  slug: p.slug,
}));

/**
 * CO-LM-004 — Lender–product commercial catalogue removed from marketing site.
 * SSOT: `@/lib/enterprise-lender-product-catalogue` (Enterprise Master Data).
 * Do not reintroduce LENDERS_BY_PRODUCT / LenderOffer here.
 */
