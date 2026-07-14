/**
 * CF-CHANAKYA-015 — Enterprise Learning foundation (explainable, threshold-gated).
 */

import {
  CP5_LEARNING_FILE_THRESHOLD_IDEAL,
  CP5_LEARNING_FILE_THRESHOLD_MIN,
} from "@/constants/chanakya-phase5-intelligence";
import type { ChanakyaLearningFoundation, ChanakyaLearningSignal } from "@/types/chanakya-phase5-intelligence";

export function getChanakyaLearningFoundation(processedFileCount = 0): ChanakyaLearningFoundation {
  const ready =
    processedFileCount >= CP5_LEARNING_FILE_THRESHOLD_MIN &&
    processedFileCount >= CP5_LEARNING_FILE_THRESHOLD_IDEAL * 0.5;

  const signals: ChanakyaLearningSignal[] = [
    {
      id: "learn:preferred_lender",
      category: "preferred_lender",
      observation: "Preferred lender patterns remain inactive until sufficient file history exists.",
      explainability: `Requires ≥ ${CP5_LEARNING_FILE_THRESHOLD_MIN} processed files with lender outcomes.`,
      sampleSize: processedFileCount,
      readyForInference: ready,
      learningThresholdFiles: CP5_LEARNING_FILE_THRESHOLD_MIN,
    },
    {
      id: "learn:communication_style",
      category: "communication_style",
      observation: "Communication style learning is foundation-only in Phase 5.",
      explainability: "Explainable signals will summarise cadence and channel preference — never opaque scores.",
      sampleSize: processedFileCount,
      readyForInference: false,
      learningThresholdFiles: CP5_LEARNING_FILE_THRESHOLD_MIN,
    },
    {
      id: "learn:follow_up",
      category: "successful_follow_up",
      observation: "Successful follow-up behaviour will be derived from completed CHANAKYA action tasks.",
      explainability: "Uses task completion and overdue feedback loops from nightly reflection.",
      sampleSize: processedFileCount,
      readyForInference: false,
      learningThresholdFiles: CP5_LEARNING_FILE_THRESHOLD_MIN,
    },
  ];

  return {
    processedFileThresholdMin: CP5_LEARNING_FILE_THRESHOLD_MIN,
    processedFileThresholdIdeal: CP5_LEARNING_FILE_THRESHOLD_IDEAL,
    signals,
    status: ready ? "explainable_inference" : processedFileCount > 0 ? "collecting" : "foundation_only",
  };
}
