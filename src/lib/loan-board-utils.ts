import {
  LOAN_BOARD_STAGE_IDS,
  LOAN_BOARD_STAGES,
  mapProductToTreemapCategory,
  PRODUCT_TREEMAP_CATEGORIES,
  type ProductTreemapCategory,
} from "@/constants/loan-board";
import type { LoanFile, PipelineFunnelStage, PipelineStage } from "@/types/catalyst-one";

export interface ProductTreemapItem {
  name: ProductTreemapCategory;
  value: number;
  count: number;
  fill: string;
}

const TREEMAP_COLORS: Record<ProductTreemapCategory, string> = {
  "Home Loan": "#14b8a6",
  "Business Loan": "#3b82f6",
  LAP: "#8b5cf6",
  "Personal Loan": "#f59e0b",
  "Working Capital": "#06b6d4",
  "Construction Finance": "#22c55e",
  Others: "#64748b",
};

export function getActiveLoanFiles(files: LoanFile[]): LoanFile[] {
  return files.filter((f) => !f.archived && f.status !== "completed" && f.stage !== "won");
}

export function computeFunnelFromActiveFiles(files: LoanFile[]): PipelineFunnelStage[] {
  const active = getActiveLoanFiles(files);
  const rawCount = active.filter((f) => f.stage === "raw_lead").length || 1;

  return LOAN_BOARD_STAGES.map(({ id, label, color }) => {
    const stageFiles = active.filter((f) => f.stage === id);
    const count = stageFiles.length;
    const value = stageFiles.reduce((sum, f) => sum + f.loanAmount, 0);
    const conversion = Math.round((count / rawCount) * 100);
    return { id, label, count, value, color, conversion };
  });
}

export function computeProductTreemap(files: LoanFile[]): ProductTreemapItem[] {
  const active = getActiveLoanFiles(files);
  const buckets = new Map<ProductTreemapCategory, { value: number; count: number }>();

  PRODUCT_TREEMAP_CATEGORIES.forEach((cat) => buckets.set(cat, { value: 0, count: 0 }));

  active.forEach((file) => {
    const cat = mapProductToTreemapCategory(file.loanProduct);
    const bucket = buckets.get(cat)!;
    bucket.value += file.loanAmount;
    bucket.count += 1;
  });

  return PRODUCT_TREEMAP_CATEGORIES.map((name) => ({
    name,
    value: buckets.get(name)!.value,
    count: buckets.get(name)!.count,
    fill: TREEMAP_COLORS[name],
  })).filter((item) => item.value > 0);
}

export function averageAgeingForStage(files: LoanFile[], stage: PipelineStage): number {
  const stageFiles = files.filter((f) => f.stage === stage);
  if (stageFiles.length === 0) return 0;
  return Math.round(stageFiles.reduce((sum, f) => sum + f.daysInStage, 0) / stageFiles.length);
}

export function isBoardStage(stage: PipelineStage): boolean {
  return LOAN_BOARD_STAGE_IDS.includes(stage);
}
