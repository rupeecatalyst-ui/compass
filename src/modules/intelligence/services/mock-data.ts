import type {
  BusinessOpportunity,
  BusinessRisk,
  CustomerInsights,
  ExecutiveBrief,
  ExecutiveInsight,
  LoanInsights,
  PriorityItem,
  Recommendation,
  UserInsights,
} from "@/modules/intelligence/types/intelligence.types";

const NOW = new Date().toISOString();

export const MOCK_PRIORITY_ITEMS: PriorityItem[] = [
  {
    id: "pri-001",
    level: "critical",
    title: "HDFC waiting for salary slip",
    description: "Login WIP stalled — customer document pending for 3 days.",
    owner: "Priya Mehta",
    dueLabel: "Today",
    loanRef: "LN-2026-0142",
  },
  {
    id: "pri-002",
    level: "critical",
    title: "Blocked revenue — sanction not released",
    description: "Final approval completed but disbursement workflow not initiated.",
    owner: "Amit Sharma",
    dueLabel: "Today",
    loanRef: "LN-2026-0098",
  },
  {
    id: "pri-003",
    level: "high",
    title: "SLA approaching — LIC valuation",
    description: "Valuation report pending; SLA breach in 48 hours.",
    owner: "Rahul Verma",
    dueLabel: "2 days",
    loanRef: "LN-2026-0115",
  },
  {
    id: "pri-004",
    level: "high",
    title: "Pending valuation — Axis Bank",
    description: "Property valuation assigned; no lender response in 5 days.",
    owner: "Neha Patel",
    loanRef: "LN-2026-0131",
  },
  {
    id: "pri-005",
    level: "medium",
    title: "Customer inactive — follow-up required",
    description: "No customer touchpoint in 7 days on active Home Loan file.",
    owner: "Kavita Iyer",
    loanRef: "LN-2026-0104",
  },
  {
    id: "pri-006",
    level: "medium",
    title: "Revenue opportunity — top-up eligible",
    description: "Existing customer qualifies for top-up based on repayment track.",
    owner: "Sanjay Gupta",
  },
  {
    id: "pri-007",
    level: "low",
    title: "Document refresh — ITR FY25",
    description: "Annual ITR update recommended before credit review.",
    owner: "Anjali Nair",
  },
  {
    id: "pri-008",
    level: "low",
    title: "Ready for disbursal — ICICI",
    description: "All closure documents received; awaiting RM sign-off.",
    owner: "Rohit Desai",
    loanRef: "LN-2026-0127",
  },
];

export const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec-001",
    title: "Prioritise HDFC salary slip collection",
    reason: "HDFC case is leading the lender race with highest momentum and best ROI.",
    expectedOutcome: "Unblock login WIP and advance to soft approval within 3 days.",
    estimatedTimeSaved: "4–6 hours RM time",
    businessValue: "₹2.4L expected revenue protected",
    confidence: 91,
    priority: "critical",
    owner: "Priya Mehta",
  },
  {
    id: "rec-002",
    title: "Initiate ICICI disbursement workflow",
    reason: "File is ready for disbursal with complete documentation.",
    expectedOutcome: "Revenue recognition this week; customer satisfaction uplift.",
    estimatedTimeSaved: "1 day processing",
    businessValue: "₹1.8L booked revenue",
    confidence: 88,
    priority: "high",
    owner: "Rohit Desai",
  },
  {
    id: "rec-003",
    title: "Escalate LIC valuation to lender RM",
    reason: "SLA breach risk on high-value Home Loan case.",
    expectedOutcome: "Valuation report received before SLA deadline.",
    estimatedTimeSaved: "2 days average TAT reduction",
    businessValue: "Avoid SLA penalty; protect primary lender path",
    confidence: 84,
    priority: "high",
    owner: "Rahul Verma",
  },
  {
    id: "rec-004",
    title: "Schedule customer re-engagement call",
    reason: "Customer inactive on active pipeline file.",
    expectedOutcome: "Restore engagement and prevent case stagnation.",
    estimatedTimeSaved: "Prevents 1–2 week delay",
    confidence: 72,
    priority: "medium",
    owner: "Kavita Iyer",
  },
];

export const MOCK_INSIGHTS: ExecutiveInsight[] = [
  {
    id: "ins-001",
    type: "warning",
    title: "SLA approaching on 3 files",
    description: "Final approval and closure WIP cases are within 48-hour SLA window.",
    businessImpact: "Potential revenue delay of ₹6.2L if not actioned.",
    recommendedAction: "Review closure WIP queue with operations head.",
    confidence: 86,
    owner: "Operations",
    createdAt: NOW,
  },
  {
    id: "ins-002",
    type: "success",
    title: "Ready for disbursal pipeline healthy",
    description: "4 lender cases cleared for disbursement this week.",
    businessImpact: "₹12.5L expected revenue within 7 days.",
    confidence: 90,
    createdAt: NOW,
  },
  {
    id: "ins-003",
    type: "recommendation",
    title: "Revenue opportunity in top-up segment",
    description: "8 existing customers show top-up eligibility signals.",
    businessImpact: "Estimated ₹45L incremental disbursement potential.",
    recommendedAction: "Assign RM outreach campaign for Q2.",
    confidence: 78,
    owner: "Business Development",
    createdAt: NOW,
  },
  {
    id: "ins-004",
    type: "information",
    title: "Portfolio login velocity stable",
    description: "Login-to-soft-approval TAT improved 12% vs last month.",
    businessImpact: "Improved conversion without additional headcount.",
    confidence: 82,
    createdAt: NOW,
  },
  {
    id: "ins-005",
    type: "critical",
    title: "Blocked revenue on 2 sanctions",
    description: "Sanction letters issued but disbursement not initiated.",
    businessImpact: "₹3.1L revenue at risk this fortnight.",
    recommendedAction: "Operations review — same-day disbursement push.",
    confidence: 93,
    owner: "Operations Head",
    createdAt: NOW,
  },
];

export const MOCK_RISKS: BusinessRisk[] = [
  {
    id: "risk-001",
    title: "Valuation delays — LIC Housing",
    description: "Pending valuation on 2 active cases.",
    severity: "high",
    impact: "May shift primary lender recommendation.",
    mitigation: "Escalate to lender relationship desk.",
    eta: "48 hours",
  },
  {
    id: "risk-002",
    title: "Customer inactivity cluster",
    description: "5 files with no RM touchpoint in 7+ days.",
    severity: "medium",
    impact: "Increased drop-off risk in pre-login stage.",
    mitigation: "Batch follow-up assignment to RMs.",
  },
  {
    id: "risk-003",
    title: "Document gap — salary proof",
    description: "HDFC and Axis cases awaiting income documents.",
    severity: "critical",
    impact: "Login WIP cannot progress.",
    mitigation: "Customer document collection — priority queue.",
    eta: "24 hours",
  },
];

export const MOCK_OPPORTUNITIES: BusinessOpportunity[] = [
  {
    id: "opp-001",
    title: "Top-up cross-sell wave",
    description: "Eligible customers with strong repayment history.",
    estimatedValue: 4500000,
    confidence: 76,
    owner: "BD Team",
  },
  {
    id: "opp-002",
    title: "Balance transfer consolidation",
    description: "3 leads flagged for BT with better ROI than incumbent.",
    estimatedValue: 8200000,
    confidence: 81,
    owner: "RM Pool",
  },
];

export function buildMockExecutiveBrief(userName = "Rahul"): ExecutiveBrief {
  return {
    greeting: `Good Morning ${userName},`,
    headline: "Today's business is healthy.",
    businessSummary:
      "Pipeline velocity is stable with 4 files ready for disbursal. Focus on document collection for HDFC and valuation escalation for LIC to protect near-term revenue.",
    priorityItems: MOCK_PRIORITY_ITEMS,
    recommendedActions: MOCK_RECOMMENDATIONS,
    upcomingRisks: MOCK_RISKS,
    insights: MOCK_INSIGHTS,
    opportunities: MOCK_OPPORTUNITIES,
  };
}

export function buildMockLoanInsights(loanId: string): LoanInsights {
  return {
    loanId,
    fileNumber: loanId.startsWith("LN") ? loanId : `LN-2026-${loanId.slice(-4)}`,
    insights: MOCK_INSIGHTS.slice(0, 3),
    recommendations: MOCK_RECOMMENDATIONS.slice(0, 2),
    priorityItems: MOCK_PRIORITY_ITEMS.filter((p) => p.loanRef).slice(0, 4),
    risks: MOCK_RISKS.slice(0, 2),
    timelineIntegrity: {
      loanId,
      completenessScore: 78,
      missingEvents: ["Valuation received", "Customer consent logged"],
      lastUpdated: NOW,
    },
    processDiscipline: {
      scope: "loan",
      score: 82,
      documentsOnTrack: 7,
      tasksOnTrack: 5,
      slaBreaches: 1,
      notes: "One SLA watch on closure WIP.",
    },
  };
}

export function buildMockCustomerInsights(customerId: string, customerName = "Customer"): CustomerInsights {
  return {
    customerId,
    customerName,
    insights: MOCK_INSIGHTS.slice(1, 4),
    recommendations: MOCK_RECOMMENDATIONS.slice(2, 4),
    priorityItems: MOCK_PRIORITY_ITEMS.slice(4, 7),
    opportunities: MOCK_OPPORTUNITIES,
    behaviourNotes: "Last engagement 5 days ago. Responsive to WhatsApp follow-ups.",
  };
}

export function buildMockUserInsights(userId: string, displayName = "Rahul Verma"): UserInsights {
  return {
    userId,
    displayName,
    insights: MOCK_INSIGHTS.slice(0, 2),
    recommendations: MOCK_RECOMMENDATIONS.slice(0, 3),
    priorityItems: MOCK_PRIORITY_ITEMS.slice(0, 5),
    behaviour: {
      userId,
      displayName,
      followUpDiscipline: 88,
      responseLatencyHours: 4.2,
      tasksCompletedToday: 6,
      overdueTasks: 2,
      notes: "Strong closure WIP performance; document chase needs attention.",
    },
    processDiscipline: {
      scope: "portfolio",
      score: 85,
      documentsOnTrack: 24,
      tasksOnTrack: 18,
      slaBreaches: 2,
    },
  };
}
