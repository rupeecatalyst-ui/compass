/** 10.3B — Chanakya intelligence data contracts (interfaces only). */

export type ChanakyaMode =
  | "executive"
  | "manager"
  | "relationship_manager"
  | "credit"
  | "operations";

export type ChanakyaPanelVariant = "compact" | "expanded";

export type PriorityLevel = "critical" | "high" | "medium" | "low";

export type InsightCardType =
  | "information"
  | "success"
  | "warning"
  | "critical"
  | "recommendation";

export interface ExecutiveInsight {
  id: string;
  type: InsightCardType;
  title: string;
  description: string;
  businessImpact?: string;
  recommendedAction?: string;
  confidence?: number;
  owner?: string;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  expectedOutcome: string;
  estimatedTimeSaved?: string;
  businessValue?: string;
  confidence: number;
  priority: PriorityLevel;
  owner?: string;
}

export interface PriorityItem {
  id: string;
  level: PriorityLevel;
  title: string;
  description: string;
  owner?: string;
  dueLabel?: string;
  loanRef?: string;
  customerRef?: string;
}

export interface BusinessRisk {
  id: string;
  title: string;
  description: string;
  severity: PriorityLevel;
  impact: string;
  mitigation?: string;
  eta?: string;
}

export interface BusinessOpportunity {
  id: string;
  title: string;
  description: string;
  estimatedValue?: number;
  confidence: number;
  owner?: string;
}

export interface UserBehaviour {
  userId: string;
  displayName: string;
  followUpDiscipline: number;
  responseLatencyHours: number;
  tasksCompletedToday: number;
  overdueTasks: number;
  notes?: string;
}

export interface TimelineIntegrity {
  loanId: string;
  completenessScore: number;
  missingEvents: string[];
  lastUpdated: string;
}

export interface ProcessDiscipline {
  scope: "loan" | "customer" | "portfolio";
  score: number;
  documentsOnTrack: number;
  tasksOnTrack: number;
  slaBreaches: number;
  notes?: string;
}

export interface ExecutiveBrief {
  greeting: string;
  headline: string;
  businessSummary: string;
  priorityItems: PriorityItem[];
  recommendedActions: Recommendation[];
  upcomingRisks: BusinessRisk[];
  insights: ExecutiveInsight[];
  opportunities?: BusinessOpportunity[];
}

export interface LoanInsights {
  loanId: string;
  fileNumber: string;
  insights: ExecutiveInsight[];
  recommendations: Recommendation[];
  priorityItems: PriorityItem[];
  risks: BusinessRisk[];
  timelineIntegrity?: TimelineIntegrity;
  processDiscipline?: ProcessDiscipline;
}

export interface CustomerInsights {
  customerId: string;
  customerName: string;
  insights: ExecutiveInsight[];
  recommendations: Recommendation[];
  priorityItems: PriorityItem[];
  opportunities: BusinessOpportunity[];
  behaviourNotes?: string;
}

export interface UserInsights {
  userId: string;
  displayName: string;
  insights: ExecutiveInsight[];
  recommendations: Recommendation[];
  priorityItems: PriorityItem[];
  behaviour: UserBehaviour;
  processDiscipline: ProcessDiscipline;
}

export interface ChanakyaIntelligenceContext {
  userId?: string;
  userName?: string;
  loanId?: string;
  customerId?: string;
  mode?: ChanakyaMode;
}
