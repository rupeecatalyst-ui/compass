import { CUSTOMER_SEED } from "@/data/catalyst-one/customer-seed";
import type {
  Customer360Detail,
  CustomerHealth,
  CustomerProfile,
  CustomerStatus,
  CustomerTag,
} from "@/types/catalyst-one";
import { LEAD_SOURCES } from "@/constants/customer-360";

const statuses: CustomerStatus[] = [
  "active",
  "in_progress",
  "sanctioned",
  "disbursed",
  "closed",
  "dropped",
];
const products = [
  "Home Loan",
  "Loan Against Property",
  "Business Loan",
  "Personal Loan",
  "Working Capital",
  "Construction Finance",
];
const LENDER_POOL = [
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "SBI",
  "Kotak Mahindra",
  "IndusInd Bank",
  "Bajaj Finserv",
  "Federal Bank",
];
const rms = [
  "Amit Sharma",
  "Priya Mehta",
  "Rahul Verma",
  "Neha Patel",
  "Sanjay Gupta",
  "Kavita Iyer",
  "Rohit Desai",
  "Anjali Nair",
];

const TAG_POOL: CustomerTag[][] = [
  ["VIP", "High Value"],
  ["MSME", "Repeat Customer"],
  ["Builder", "Priority"],
  ["Doctor"],
  ["CA", "NRI"],
  ["Repeat Customer"],
  ["MSME"],
  ["High Value", "Priority"],
  ["VIP"],
  ["Builder"],
];

const HEALTH_POOL: CustomerHealth[] = [
  "healthy",
  "healthy",
  "attention_required",
  "healthy",
  "dormant",
  "healthy",
  "risk",
  "healthy",
  "attention_required",
  "inactive",
];

const CONSTITUTIONS = ["Individual", "Proprietorship", "Partnership", "Pvt Ltd", "LLP"];
const OCCUPATIONS = ["Business Owner", "Salaried Professional", "Doctor", "CA", "Builder", "Trader"];
const INCOME_BANDS = ["₹5–10 LPA", "₹10–25 LPA", "₹25–50 LPA", "₹50 LPA+", "₹1 Cr+ turnover"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!;
}

function maskPan(i: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const a = letters[i % 26]!;
  const b = letters[(i + 5) % 26]!;
  const c = letters[(i + 11) % 26]!;
  return `${a}${b}${c}PK${(1000 + i).toString().slice(-4)}${letters[(i + 3) % 26]!}`;
}

function maskAadhaar(i: number): string {
  return `XXXX-XXXX-${(1000 + (i % 9000)).toString()}`;
}

function isCompanyName(name: string): boolean {
  return /Pvt|LLP|Ltd|Co\.|Industries|Traders|Manufacturing|Exports|Enterprises|Solutions|Constructions|Hospitality|Developers|Distributors|Service|Works|Farms|Textiles|Fisheries|Pharma|Electronics|Steel|Agro|Logistics/i.test(
    name,
  );
}

function companyFromName(name: string): string {
  if (isCompanyName(name)) return name;
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0]} ${parts[1]} Associates`;
  return `${name} Enterprises`;
}

function build360Detail(seedIndex: number, seed: (typeof CUSTOMER_SEED)[0]): Customer360Detail {
  const company = companyFromName(seed.name);
  const isBiz = isCompanyName(seed.name) || seed.employmentType === "Self Employed";
  const daysAgo = (seedIndex % 12) * 7 + 3;
  const lastContact = new Date(Date.now() - daysAgo * 86400000).toISOString();
  const customerSince = new Date(Date.now() - (seedIndex + 4) * 86400000 * 30).toISOString();

  const relationships: Customer360Detail["relationships"] = [];
  if (seedIndex % 3 === 0) {
    relationships.push({
      id: `rel-${seed.id}-1`,
      type: "co_applicant",
      name: seedIndex % 2 === 0 ? "Spouse — Co-applicant" : "Business Partner",
      mobile: "+91 98XXX XXXXX",
      relation: "Co-applicant",
    });
  }
  if (seedIndex % 4 === 0) {
    relationships.push({
      id: `rel-${seed.id}-2`,
      type: "guarantor",
      name: "Guarantor — Family",
      relation: "Father",
    });
  }
  if (isBiz && seedIndex % 2 === 0) {
    relationships.push({
      id: `rel-${seed.id}-3`,
      type: "director",
      name: "Director — Board",
      relation: "Managing Director",
    });
  }

  const timeline: Customer360Detail["timeline"] = [
    {
      id: `tl-${seed.id}-1`,
      title: "Relationship review call",
      description: "Discussed upcoming disbursement and document status",
      timestamp: lastContact,
      type: "call",
      actor: pick(rms, seedIndex),
    },
    {
      id: `tl-${seed.id}-2`,
      title: "KYC documents received",
      description: "PAN and Aadhaar verified",
      timestamp: new Date(Date.now() - (daysAgo + 5) * 86400000).toISOString(),
      type: "document",
      actor: pick(rms, seedIndex + 1),
    },
    {
      id: `tl-${seed.id}-3`,
      title: "Follow-up scheduled",
      description: "RM scheduled next touchpoint",
      timestamp: new Date(Date.now() - (daysAgo + 12) * 86400000).toISOString(),
      type: "meeting",
      actor: pick(rms, seedIndex),
    },
  ];

  const notes: Customer360Detail["notes"] = [
    {
      id: `note-${seed.id}-1`,
      content: "Strong repayment track record. Open to cross-sell LAP on next cycle.",
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      createdBy: pick(rms, seedIndex),
      pinned: seedIndex % 5 === 0,
    },
  ];

  const documents: Customer360Detail["documents"] = [
    {
      id: `doc-${seed.id}-1`,
      name: "PAN Card",
      status: seedIndex % 7 === 0 ? "pending" : "verified",
      uploadedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      category: "KYC",
      uploadedBy: pick(rms, seedIndex),
      version: 1,
    },
    {
      id: `doc-${seed.id}-2`,
      name: "Aadhaar Card",
      status: "verified",
      uploadedAt: new Date(Date.now() - 58 * 86400000).toISOString(),
      category: "KYC",
      uploadedBy: pick(rms, seedIndex + 1),
      version: 1,
    },
    {
      id: `doc-${seed.id}-3`,
      name: isBiz ? "GST Certificate" : "Salary Slips (3 months)",
      status: seedIndex % 4 === 0 ? "received" : "verified",
      uploadedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      category: isBiz ? "Business" : "Income",
      uploadedBy: pick(rms, seedIndex),
      version: seedIndex % 3 === 0 ? 2 : 1,
    },
  ];

  const health = pick(HEALTH_POOL, seedIndex);
  const kycVerified = documents.filter((d) => d.status === "verified").length;
  const kycStatus: Customer360Detail["kycStatus"] =
    kycVerified === documents.length
      ? "verified"
      : kycVerified > 0
        ? "partial"
        : "pending";

  const riskRating: Customer360Detail["riskRating"] =
    health === "risk" ? "high" : health === "attention_required" || health === "dormant" ? "medium" : "low";

  const auditTrail: Customer360Detail["auditTrail"] = [
    {
      id: `audit-${seed.id}-1`,
      action: "Customer profile created",
      description: "Contact registered in Catalyst One",
      timestamp: customerSince,
      actor: "System",
      source: "system",
    },
    {
      id: `audit-${seed.id}-2`,
      action: "KYC verification updated",
      description: `Status: ${kycStatus}`,
      timestamp: new Date(Date.now() - 30 * 86400000).toISOString(),
      actor: pick(rms, seedIndex),
      source: "user",
    },
  ];

  return {
    company,
    pan: maskPan(seedIndex),
    aadhaar: maskAadhaar(seedIndex),
    gst: isBiz ? `27${maskPan(seedIndex).slice(0, 5)}1Z${String.fromCharCode(65 + (seedIndex % 26))}` : undefined,
    constitution: isBiz ? pick(CONSTITUTIONS, seedIndex + 2) : "Individual",
    occupation: pick(OCCUPATIONS, seedIndex),
    incomeBand: pick(INCOME_BANDS, seedIndex),
    leadSource: pick([...LEAD_SOURCES], seedIndex),
    tags: pick(TAG_POOL, seedIndex),
    health,
    relationshipScore: 55 + (seedIndex % 40),
    creditScore: 680 + (seedIndex % 140),
    riskRating,
    kycStatus,
    auditTrail,
    isActive: health !== "inactive",
    lastContact,
    customerSince,
    addresses: [
      {
        type: "registered",
        line1: `${10 + (seedIndex % 90)}, Main Road`,
        line2: seed.city,
        city: seed.city,
        state: seed.state,
        pincode: `${400000 + seedIndex * 111}`,
      },
      {
        type: "correspondence",
        line1: `Office Block ${seedIndex % 5 + 1}`,
        city: seed.city,
        state: seed.state,
        pincode: `${400000 + seedIndex * 111 + 1}`,
      },
    ],
    relationships,
    documents,
    timeline,
    notes,
    annualTurnover: isBiz ? 50_00_000 + seedIndex * 15_00_000 : undefined,
    businessVintage: isBiz ? 3 + (seedIndex % 15) : undefined,
  };
}

export function buildInitialCustomerProfiles(): CustomerProfile[] {
  return CUSTOMER_SEED.map((seed, i) => {
    const detail = build360Detail(i, seed);
    return {
      id: seed.id,
      name: seed.name,
      mobile: seed.mobile,
      email: seed.email,
      city: seed.city,
      state: seed.state,
      employmentType: seed.employmentType,
      loanProduct: pick(products, i),
      lender: pick(LENDER_POOL, i),
      loanAmount: Math.round((15_00_000 + (i % 20) * 8_00_000) / 50_000) * 50_000,
      status: pick(statuses, i + 2),
      relationshipManager: pick(rms, i),
      createdAt: new Date(Date.now() - (i + 1) * 86400000 * 3).toISOString(),
      ...detail,
    };
  });
}

const INITIAL_CUSTOMER_PROFILES = buildInitialCustomerProfiles();

export function getInitialCustomerProfiles(): CustomerProfile[] {
  return INITIAL_CUSTOMER_PROFILES;
}

export const loanProducts = [...new Set(INITIAL_CUSTOMER_PROFILES.map((c) => c.loanProduct))].sort();
export const lenders = [...new Set(INITIAL_CUSTOMER_PROFILES.map((c) => c.lender))].sort();
export const relationshipManagers = [...rms];
export const customerCities = [...new Set(CUSTOMER_SEED.map((c) => c.city))].sort();
