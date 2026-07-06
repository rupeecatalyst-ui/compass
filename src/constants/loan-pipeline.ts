import type { PipelineStage } from "@/types/catalyst-one";

export {
  ACTIVE_PIPELINE_STAGES,
  computeTopUpRequested,
  getProductsForLendingType,
  getStageIndex,
  getStageProgress,
  getSubStatusesForStage,
  getSubStatusLabel,
  searchPipelineStages,
  searchSubStatusesForStage,
  isBalanceTransferVisible,
  isLoanWon,
  isPropertyQualificationVisible,
  isPropertySectionVisible,
  isStageAtOrBeyond,
  isStageBeyond,
  LENDING_TYPES,
  LEGACY_STAGE_MAP,
  migrateLegacyStage,
  PIPELINE_STAGE_MASTER,
  PIPELINE_STAGES,
  PROPERTY_TYPES,
  requiresFinalLoanAmount,
  SECURED_PRODUCTS,
  shouldShowFinalLoanAmount,
  STAGE_COLORS,
  STAGE_LABELS,
  STAGE_ORDER,
  TRANSACTION_TYPES,
  UNSECURED_PRODUCTS,
} from "@/constants/loan-stage-master";

/** @deprecated Import from loan-stage-master — kept for backward compatibility. */
export { DEMO_CURRENT_RM } from "@/constants/customer-360";

// Re-export with legacy alias for any external imports
export type { PipelineStage };
