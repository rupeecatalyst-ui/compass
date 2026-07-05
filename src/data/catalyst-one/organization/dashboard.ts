import type {
  DocumentCategoryStat,
  OrganizationActivity,
  OrganizationDashboardStat,
  StorageUsage,
} from "@/types/organization";
import { ROUTES } from "@/constants/routes";

export const organizationDashboardStats: OrganizationDashboardStat[] = [
  {
    id: "corp-docs",
    label: "Corporate Documents",
    value: "12",
    subValue: "Across 11 categories",
    icon: "documents",
    accent: "primary",
    href: ROUTES.ORGANIZATION_CORPORATE_REPOSITORY,
  },
  {
    id: "directors",
    label: "Directors",
    value: "4",
    subValue: "3 active · 1 inactive",
    icon: "directors",
    accent: "info",
    href: ROUTES.ORGANIZATION_DIRECTORS,
  },
  {
    id: "bank-accounts",
    label: "Bank Accounts",
    value: "3",
    subValue: "1 primary account",
    icon: "bank",
    accent: "accent",
    href: ROUTES.ORGANIZATION_BANK_ACCOUNTS,
  },
  {
    id: "digital-signatures",
    label: "Digital Signatures",
    value: "3",
    subValue: "1 expiring soon",
    icon: "signature",
    accent: "warning",
    href: ROUTES.ORGANIZATION_DIGITAL_SIGNATURES,
  },
  {
    id: "compliance",
    label: "Compliance",
    value: "—",
    subValue: "Coming in Sprint 8B",
    icon: "compliance",
    accent: "info",
    placeholder: true,
  },
  {
    id: "document-studio",
    label: "Document Studio",
    value: "—",
    subValue: "Coming in Sprint 8B",
    icon: "studio",
    accent: "primary",
    placeholder: true,
  },
];

export const organizationRecentActivity: OrganizationActivity[] = [
  {
    id: "act-1",
    title: "GST certificate renewed",
    description: "Corporate repository updated to v2.1",
    timestamp: "2025-01-10T10:30:00",
    type: "document",
  },
  {
    id: "act-2",
    title: "Board resolution filed",
    description: "FY25 audit appointment resolution added",
    timestamp: "2025-04-01T14:15:00",
    type: "compliance",
  },
  {
    id: "act-3",
    title: "Director profile updated",
    description: "Priya Sharma — contact details revised",
    timestamp: "2025-05-18T09:00:00",
    type: "director",
  },
  {
    id: "act-4",
    title: "Primary bank verified",
    description: "HDFC current account marked as primary",
    timestamp: "2025-06-02T11:45:00",
    type: "bank",
  },
  {
    id: "act-5",
    title: "DSC expiry alert",
    description: "Priya Sharma signature expires Sep 2025",
    timestamp: "2025-06-28T08:20:00",
    type: "signature",
  },
];

export const organizationStorageUsage: StorageUsage = {
  usedGb: 2.4,
  totalGb: 10,
  label: "Corporate document storage",
};

export const organizationDocumentCategories: DocumentCategoryStat[] = [
  { id: "cat-moa", label: "MOA / AOA", count: 2, color: "primary" },
  { id: "cat-reg", label: "Registrations", count: 4, color: "info" },
  { id: "cat-board", label: "Board & Shareholding", count: 2, color: "accent" },
  { id: "cat-bank", label: "Banking", count: 1, color: "warning" },
  { id: "cat-other", label: "Insurance & Licences", count: 3, color: "primary" },
];
