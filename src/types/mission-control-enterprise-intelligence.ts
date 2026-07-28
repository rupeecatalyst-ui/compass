/**
 * CO-MC-002 — Precomputed Mission Control Enterprise Intelligence datasets.
 */

import type {
  MissionControlEiChartKind,
  MissionControlEiSectionId,
} from "@/constants/mission-control-enterprise-intelligence";

export type McEiNamedValue = {
  name: string;
  value: number;
  secondary?: number;
};

export type McEiKpi = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "attention";
};

export type McEiInsight = {
  id: string;
  text: string;
  reason: string;
  tone: "danger" | "warning" | "info" | "success";
  recommendedAction?: string;
};

export type McEiChartCard = {
  id: string;
  title: string;
  subtitle?: string;
  kind: MissionControlEiChartKind;
  /** Precomputed series — Mission Control never re-aggregates. */
  series: McEiNamedValue[];
  kpis?: McEiKpi[];
  insights?: McEiInsight[];
  emptyLabel?: string;
};

export type McEiSection = {
  id: MissionControlEiSectionId;
  title: string;
  subtitle: string;
  cards: McEiChartCard[];
};

export type MissionControlEnterpriseIntelligencePack = {
  version: string;
  program: "CO-MC-002";
  asOf: string;
  generatedAt: string;
  refreshScheduleLabel: string;
  sections: McEiSection[];
  sourceModules: string[];
};
