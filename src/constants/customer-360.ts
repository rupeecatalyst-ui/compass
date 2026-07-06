import type {
  CustomerHealth,
  CustomerListColumnKey,
  CustomerTag,
} from "@/types/catalyst-one";

export const CUSTOMER_TAGS: CustomerTag[] = [
  "VIP",
  "Repeat Customer",
  "High Value",
  "MSME",
  "Builder",
  "Doctor",
  "CA",
  "NRI",
  "Priority",
];

export const CUSTOMER_HEALTH_LABELS: Record<CustomerHealth, string> = {
  healthy: "Healthy",
  attention_required: "Attention Required",
  dormant: "Dormant",
  inactive: "Inactive",
  risk: "Risk",
};

export const CUSTOMER_HEALTH_STYLES: Record<
  CustomerHealth,
  { className: string; dotClass: string }
> = {
  healthy: {
    className: "text-success border-success/30 bg-success/10",
    dotClass: "bg-success",
  },
  attention_required: {
    className: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
    dotClass: "bg-amber-500",
  },
  dormant: {
    className: "text-muted-foreground border-border bg-muted/50",
    dotClass: "bg-muted-foreground",
  },
  inactive: {
    className: "text-muted-foreground border-border bg-muted/30",
    dotClass: "bg-muted-foreground/60",
  },
  risk: {
    className: "text-destructive border-destructive/30 bg-destructive/10",
    dotClass: "bg-destructive",
  },
};

export const CUSTOMER_LIST_COLUMNS: {
  key: CustomerListColumnKey;
  label: string;
  defaultVisible: boolean;
}[] = [
  { key: "customer", label: "Customer", defaultVisible: true },
  { key: "mobile", label: "Mobile", defaultVisible: true },
  { key: "company", label: "Company", defaultVisible: true },
  { key: "city", label: "City", defaultVisible: true },
  { key: "rm", label: "RM", defaultVisible: true },
  { key: "activeLoans", label: "Active Loans", defaultVisible: true },
  { key: "pipelineValue", label: "Pipeline Value", defaultVisible: true },
  { key: "revenue", label: "Revenue", defaultVisible: true },
  { key: "lastContact", label: "Last Contact", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
];

export const DEFAULT_CUSTOMER_COLUMNS: CustomerListColumnKey[] = CUSTOMER_LIST_COLUMNS.filter(
  (c) => c.defaultVisible,
).map((c) => c.key);

export const CUSTOMER_SAVED_VIEWS = [
  { id: "all", label: "All Customers" },
  { id: "my_customers", label: "My Customers" },
  { id: "high_value", label: "High Value" },
  { id: "vip", label: "VIP" },
  { id: "attention", label: "Attention Required" },
  { id: "dormant", label: "Dormant" },
  { id: "msme", label: "MSME" },
  { id: "repeat", label: "Repeat Customers" },
] as const;

export const LEAD_SOURCES = [
  "Referral",
  "Walk-in",
  "Digital Campaign",
  "DSA Partner",
  "Existing Customer",
  "Cold Outreach",
  "Builder Tie-up",
] as const;

export const DEMO_CURRENT_RM = "Amit Sharma";
