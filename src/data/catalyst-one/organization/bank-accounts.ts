import type { BankAccount } from "@/types/organization";

export const bankAccountsSeed: BankAccount[] = [
  {
    id: "bank-001",
    bank: "HDFC Bank",
    branch: "Bandra Kurla Complex, Mumbai",
    accountNumber: "50200012345678",
    ifsc: "HDFC0000123",
    isCurrentAccount: true,
    cancelledChequeAvailable: true,
    isPrimary: true,
  },
  {
    id: "bank-002",
    bank: "ICICI Bank",
    branch: "Lower Parel, Mumbai",
    accountNumber: "006705012345",
    ifsc: "ICIC0000123",
    isCurrentAccount: true,
    cancelledChequeAvailable: true,
    isPrimary: false,
  },
  {
    id: "bank-003",
    bank: "Axis Bank",
    branch: "Andheri East, Mumbai",
    accountNumber: "912010012345678",
    ifsc: "UTIB0000123",
    isCurrentAccount: false,
    cancelledChequeAvailable: false,
    isPrimary: false,
  },
];
