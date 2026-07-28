import type {
  ProductionResetEntitySelection,
  ProductionResetPresetId,
} from "@/types/production-reset";

export const PRODUCTION_RESET_ENTITY_LABELS: Record<
  keyof ProductionResetEntitySelection,
  string
> = {
  contacts: "Contacts",
  opportunities: "Opportunities",
  deals: "Deals",
  tasks: "Tasks",
  documents: "Documents (deal links)",
  notes: "Notes",
  timeline: "Timeline Events",
  notifications: "Notifications",
  activities: "Activities",
};

export const EMPTY_SELECTION: ProductionResetEntitySelection = {
  contacts: false,
  opportunities: false,
  deals: false,
  tasks: false,
  documents: false,
  notes: false,
  timeline: false,
  notifications: false,
  activities: false,
};

export const ALL_TRANSACTIONAL_SELECTION: ProductionResetEntitySelection = {
  contacts: true,
  opportunities: true,
  deals: true,
  tasks: true,
  documents: true,
  notes: true,
  timeline: true,
  notifications: true,
  activities: true,
};

/** CO-CUTOVER-001 — demo transactional families (masters + live records preserved). */
export const DEMO_DATA_SELECTION: ProductionResetEntitySelection = {
  contacts: true,
  opportunities: true,
  deals: true,
  tasks: true,
  documents: true,
  notes: true,
  timeline: true,
  notifications: true,
  activities: true,
};

export function selectionForPreset(
  preset: ProductionResetPresetId,
  custom?: ProductionResetEntitySelection,
): ProductionResetEntitySelection {
  if (preset === "production_cutover") return { ...ALL_TRANSACTIONAL_SELECTION };
  if (preset === "demo_data_only") return { ...DEMO_DATA_SELECTION };
  return { ...(custom ?? EMPTY_SELECTION) };
}

export const PRODUCTION_RESET_PRESET_META: Record<
  ProductionResetPresetId,
  { title: string; description: string }
> = {
  demo_data_only: {
    title: "Remove Demo Data Only (CO-CUTOVER-001)",
    description:
      "Targets demo/test heuristics (DEMO/TEST/UAT prefixes, demo-seed creator, .demo emails) while preserving live production transactions and all masters.",
  },
  production_cutover: {
    title: "Production Cutover (all transactions)",
    description:
      "Selects all transactional business entities for a controlled wipe. Masters and identity remain untouched. Prefer demo_data_only when live records must be kept.",
  },
  custom: {
    title: "Custom",
    description: "Independently select which transactional entity families to include.",
  },
};
