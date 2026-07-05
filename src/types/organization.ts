/** Catalyst One — Organization module types (Rupee Catalyst internal records) */

export interface CompanyProfile {
  companyName: string;
  brandName: string;
  gst: string;
  pan: string;
  cin: string;
  msme: string;
  registeredAddress: string;
  corporateAddress: string;
  website: string;
  officialEmails: string[];
  phoneNumbers: string[];
  logoInitials: string;
}

export type DirectorStatus = "active" | "inactive";

export interface DirectorDocument {
  id: string;
  name: string;
  type: string;
}

export interface Director {
  id: string;
  name: string;
  designation: string;
  din: string;
  pan: string;
  email: string;
  mobile: string;
  status: DirectorStatus;
  photographInitials: string;
  address: string;
  documents: DirectorDocument[];
}

export type CorporateDocumentCategory =
  | "moa"
  | "aoa"
  | "certificate_of_incorporation"
  | "gst"
  | "pan"
  | "msme"
  | "board_resolutions"
  | "shareholding"
  | "cancelled_cheques"
  | "insurance"
  | "licences"
  | "other";

export interface CorporateDocument {
  id: string;
  category: CorporateDocumentCategory;
  categoryLabel: string;
  name: string;
  lastUpdated: string;
  version: string;
}

export interface BankAccount {
  id: string;
  bank: string;
  branch: string;
  accountNumber: string;
  ifsc: string;
  isCurrentAccount: boolean;
  cancelledChequeAvailable: boolean;
  isPrimary: boolean;
}

export type DigitalSignatureStatus = "active" | "expiring" | "expired";

export interface DigitalSignature {
  id: string;
  person: string;
  designation: string;
  status: DigitalSignatureStatus;
  expiry: string;
  initials: string;
}

export interface CompanySealRecord {
  lastUpdated: string;
  version: string;
  initials: string;
}

export interface OrganizationActivity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "document" | "director" | "bank" | "signature" | "compliance" | "system";
}

export interface StorageUsage {
  usedGb: number;
  totalGb: number;
  label: string;
}

export interface DocumentCategoryStat {
  id: string;
  label: string;
  count: number;
  color: "primary" | "accent" | "info" | "warning";
}

export interface OrganizationDashboardStat {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  icon: string;
  accent?: "primary" | "accent" | "warning" | "info";
  href?: string;
  placeholder?: boolean;
}
