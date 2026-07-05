import type { CompanySealRecord } from "@/types/organization";

export const companySealSeed: CompanySealRecord = {
  lastUpdated: "2024-08-15",
  version: "v2.0",
  initials: "RC",
};

export const companySealHistoryPlaceholder = [
  { id: "seal-h1", label: "Seal updated — v2.0", date: "2024-08-15" },
  { id: "seal-h2", label: "Seal updated — v1.1", date: "2022-01-10" },
  { id: "seal-h3", label: "Initial seal registered", date: "2020-03-12" },
];
