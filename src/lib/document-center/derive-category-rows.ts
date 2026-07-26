/**
 * Derive Document Center category rows from EDIE resolved checklist.
 * One row per business category (module / choice group) — no hardcoded type lists.
 */

import type {
  EdieChecklistItem,
  EdieDocumentModuleId,
  EdieResolvedChecklist,
  EdieUploadMode,
} from "@/types/edie-certified-rules";

export type DocumentCategoryFulfillment = "choice_one" | "all_required" | "folder";

export type DocumentCategoryStatus = "complete" | "partial" | "pending";

export interface DocumentCategoryRow {
  key: string;
  moduleId: EdieDocumentModuleId;
  label: string;
  fulfillment: DocumentCategoryFulfillment;
  choiceGroupId?: string;
  /** Acceptable document types for the dropdown (from EDIE). */
  options: EdieChecklistItem[];
  /** Currently selected / focused typeRef for actions. */
  selectedTypeRef: string;
  /** Active checklist item for upload / view / replace. */
  activeItem: EdieChecklistItem;
  status: DocumentCategoryStatus;
  /** Mandatory children that must be satisfied for Complete. */
  requiredItems: EdieChecklistItem[];
}

export interface CategoryReadinessSnapshot {
  overallPct: number;
  completeCount: number;
  partialCount: number;
  pendingCount: number;
  totalCount: number;
  categories: Array<{ label: string; status: DocumentCategoryStatus }>;
}

function statusForRequired(
  required: EdieChecklistItem[],
  fileCountByType: (typeRef: string) => number,
): DocumentCategoryStatus {
  if (required.length === 0) return "pending";
  const completeFlags = required.map((item) => {
    const storageRef = item.folderId ?? item.typeRef;
    return item.complete || fileCountByType(storageRef) > 0;
  });
  if (completeFlags.every(Boolean)) return "complete";
  if (completeFlags.some(Boolean)) return "partial";
  return "pending";
}

/**
 * Build category rows from EDIE modules.
 * @param focusByKey optional UI focus overrides (moduleId or choiceGroupId → typeRef)
 */
export function deriveDocumentCategoryRows(
  checklist: EdieResolvedChecklist,
  options?: {
    focusByKey?: Record<string, string>;
    fileCountByType?: (typeRef: string) => number;
  },
): DocumentCategoryRow[] {
  const focusByKey = options?.focusByKey ?? {};
  const fileCountByType = options?.fileCountByType ?? (() => 0);
  const rows: DocumentCategoryRow[] = [];

  for (const mod of checklist.modules) {
    const choiceGroups = new Map<string, EdieChecklistItem[]>();
    const remainder: EdieChecklistItem[] = [];

    for (const item of mod.items) {
      if (item.choiceGroupId) {
        const list = choiceGroups.get(item.choiceGroupId) ?? [];
        list.push(item);
        choiceGroups.set(item.choiceGroupId, list);
      } else {
        remainder.push(item);
      }
    }

    for (const [groupId, groupItems] of choiceGroups) {
      const selectedFromRules =
        groupItems.find((i) => !i.optional)?.typeRef ?? groupItems[0]?.typeRef;
      const selectedTypeRef =
        focusByKey[groupId] || focusByKey[mod.id] || selectedFromRules || groupItems[0]!.typeRef;
      const activeItem =
        groupItems.find((i) => i.typeRef === selectedTypeRef) ?? groupItems[0]!;
      const requiredItems = groupItems.filter((i) => i.typeRef === selectedTypeRef);
      rows.push({
        key: groupId,
        moduleId: mod.id,
        label: mod.label,
        fulfillment: "choice_one",
        choiceGroupId: groupId,
        options: groupItems,
        selectedTypeRef,
        activeItem,
        status: statusForRequired(requiredItems, fileCountByType),
        requiredItems,
      });
    }

    const actionable = remainder.filter((i) => !i.optional || i.mandatory || i.critical);
    const folderItems = actionable.filter((i) => i.uploadMode === "folder");
    const individualItems = actionable.filter((i) => i.uploadMode !== "folder");

    for (const folder of folderItems) {
      rows.push({
        key: folder.folderId ?? folder.typeRef,
        moduleId: mod.id,
        label: mod.label,
        fulfillment: "folder",
        options: [folder],
        selectedTypeRef: folder.typeRef,
        activeItem: folder,
        status: statusForRequired([folder], fileCountByType),
        requiredItems: [folder],
      });
    }

    if (individualItems.length > 0) {
      // Avoid duplicating a category when choice_one already represents this module.
      if (choiceGroups.size > 0 && individualItems.every((i) => i.optional)) {
        continue;
      }
      const focusKey = mod.id;
      const selectedTypeRef =
        focusByKey[focusKey] ||
        individualItems.find((i) => i.mandatory && !i.complete)?.typeRef ||
        individualItems.find((i) => i.mandatory)?.typeRef ||
        individualItems[0]!.typeRef;
      const activeItem =
        individualItems.find((i) => i.typeRef === selectedTypeRef) ?? individualItems[0]!;
      const requiredItems = individualItems.filter((i) => i.mandatory || i.critical);
      const fulfillment: DocumentCategoryFulfillment =
        requiredItems.length > 1 ? "all_required" : "all_required";
      rows.push({
        key: `module:${mod.id}`,
        moduleId: mod.id,
        label: mod.label,
        fulfillment,
        options: individualItems,
        selectedTypeRef,
        activeItem,
        status: statusForRequired(
          requiredItems.length > 0 ? requiredItems : [activeItem],
          fileCountByType,
        ),
        requiredItems: requiredItems.length > 0 ? requiredItems : [activeItem],
      });
    }
  }

  return rows;
}

/** Category-level readiness — equal weight per business category. */
export function computeCategoryReadiness(
  rows: DocumentCategoryRow[],
): CategoryReadinessSnapshot {
  const totalCount = rows.length;
  if (totalCount === 0) {
    return {
      overallPct: 0,
      completeCount: 0,
      partialCount: 0,
      pendingCount: 0,
      totalCount: 0,
      categories: [],
    };
  }
  const completeCount = rows.filter((r) => r.status === "complete").length;
  const partialCount = rows.filter((r) => r.status === "partial").length;
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const earned = rows.reduce((sum, r) => {
    if (r.status === "complete") return sum + 1;
    if (r.status === "partial") return sum + 0.5;
    return sum;
  }, 0);
  return {
    overallPct: Math.round((earned / totalCount) * 100),
    completeCount,
    partialCount,
    pendingCount,
    totalCount,
    categories: rows.map((r) => ({ label: r.label, status: r.status })),
  };
}

export function categoryUploadMode(row: DocumentCategoryRow): EdieUploadMode {
  return row.activeItem.uploadMode;
}
