import { CUSTOMER_SEED } from "@/data/catalyst-one/customer-seed";
import type { Customer, CustomerStatus } from "@/types/catalyst-one";

const statuses: CustomerStatus[] = ["active", "in_progress", "sanctioned", "disbursed", "closed", "dropped"];
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
const rms = ["Amit Sharma", "Priya Mehta", "Rahul Verma", "Neha Patel", "Sanjay Gupta", "Kavita Iyer", "Rohit Desai", "Anjali Nair"];

function seededPick<T>(arr: T[], index: number): T {
  return arr[index % arr.length]!;
}

export const customers: Customer[] = CUSTOMER_SEED.map((seed, i) => ({
  id: seed.id,
  name: seed.name,
  mobile: seed.mobile,
  email: seed.email,
  city: seed.city,
  state: seed.state,
  employmentType: seed.employmentType,
  loanProduct: seededPick(products, i),
  lender: seededPick(LENDER_POOL, i),
  loanAmount: Math.round((15_00_000 + (i % 20) * 8_00_000) / 50_000) * 50_000,
  status: seededPick(statuses, i + 2),
  relationshipManager: seededPick(rms, i),
  createdAt: new Date(Date.now() - (i + 1) * 86400000 * 3).toISOString(),
}));

export const loanProducts = [...new Set(customers.map((c) => c.loanProduct))].sort();
export const lenders = [...new Set(customers.map((c) => c.lender))].sort();
export const relationshipManagers = [...rms];
export const customerStatusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "in_progress", label: "In Progress" },
  { value: "sanctioned", label: "Sanctioned" },
  { value: "disbursed", label: "Disbursed" },
  { value: "closed", label: "Closed" },
  { value: "dropped", label: "Dropped" },
] as const;

export { CUSTOMER_SEED };
