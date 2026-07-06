import {
  buildInitialCustomerProfiles,
  customerCities,
  lenders,
  loanProducts,
  relationshipManagers,
} from "@/data/catalyst-one/customer-360-seed";
export { CUSTOMER_SEED } from "@/data/catalyst-one/customer-seed";
export { getInitialCustomers } from "@/lib/customers-storage";

export {
  buildInitialCustomerProfiles,
  customerCities,
  lenders,
  loanProducts,
  relationshipManagers,
};

/** @deprecated Use getInitialCustomers / loadCustomers */
export const customers = buildInitialCustomerProfiles();

export const customerStatusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "in_progress", label: "In Progress" },
  { value: "sanctioned", label: "Sanctioned" },
  { value: "disbursed", label: "Disbursed" },
  { value: "closed", label: "Closed" },
  { value: "dropped", label: "Dropped" },
] as const;
