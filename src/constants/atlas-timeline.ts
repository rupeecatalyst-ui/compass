import type { ArchitectureTimelineAction } from "@/types/atlas";

export const ARCHITECTURE_TIMELINE_ACTION_LABELS: Record<ArchitectureTimelineAction, string> = {
  created: "Created",
  updated: "Updated",
  validated: "Validated",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};
