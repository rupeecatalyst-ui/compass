import { STORAGE_KEYS } from "@/constants/animations";
import { buildInitialCustomerProfiles } from "@/data/catalyst-one/customer-360-seed";
import type { CustomerProfile } from "@/types/catalyst-one";

export function getInitialCustomers(): CustomerProfile[] {
  return buildInitialCustomerProfiles();
}

export function loadCustomers(): CustomerProfile[] {
  if (typeof window === "undefined") return getInitialCustomers();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS_DATA);
    if (!raw) return getInitialCustomers();
    const parsed = JSON.parse(raw) as CustomerProfile[];
    if (!Array.isArray(parsed) || parsed.length === 0) return getInitialCustomers();
    return parsed.filter((c) => c && typeof c.id === "string" && typeof c.name === "string");
  } catch {
    return getInitialCustomers();
  }
}

export function saveCustomers(customers: CustomerProfile[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS_DATA, JSON.stringify(customers));
}
