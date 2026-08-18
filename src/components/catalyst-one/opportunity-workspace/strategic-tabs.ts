/**
 * Lead Stage Strategic Workspace — tab model (Strategic Workspace v2.0).
 */

export type OwStrategicTabId =
  | "overview"
  | "customer"
  | "requirement"
  | "product"
  | "relationships"
  | "competition"
  | "deviation_mitigant"
  | "funding_strategy"
  | "notes"
  | "timeline"
  | "documents"
  | "tasks"
  | "workflow";

/**
 * Horizontal Strategic Tabs — frozen order (Business Certified UX Spec v2.0).
 * CO-DOC-001: Document Requests (LOD) is the single WorkspaceDocumentRequestsPanel
 * implementation, surfaced both on Opportunity Creation (Credit Bench) and here.
 * Internal id `funding_strategy` retained; UI label is Lender Strategy (LIFE).
 * Internal id `product` retained; UI label is Solution Design.
 */
export const OW_STRATEGIC_NAV: Array<{ id: OwStrategicTabId; label: string }> = [
  { id: "overview", label: "Overview" },
  /** CO-C1-DIALOGUE-002A — early placement for discoverability */
  { id: "timeline", label: "Activity Timeline" },
  { id: "customer", label: "Customer Profile" },
  { id: "requirement", label: "Requirement" },
  { id: "documents", label: "Documents (LOD)" },
  { id: "product", label: "Solution Design" },
  { id: "relationships", label: "Relationships" },
  { id: "competition", label: "Competition" },
  { id: "deviation_mitigant", label: "Deviation & Mitigation" },
  { id: "funding_strategy", label: "Lender Strategy (LIFE)" },
  { id: "notes", label: "Notes" },
];

export function getOwChanakyaTabGuidance(tab: OwStrategicTabId): {
  headline: string;
  message: string;
  nudges: string[];
} {
  switch (tab) {
    case "customer":
      return {
        headline: "Customer Profile",
        message: "I recommend adding promoter details before progressing this opportunity.",
        nudges: [
          "Confirm decision-maker and promoter context.",
          "Use Add Contact for co-applicant, director, partner, guarantor, or banker.",
        ],
      };
    case "requirement":
      return {
        headline: "Requirement",
        message: "Funding purpose needs additional clarification.",
        nudges: ["Confirm amount, purpose, and urgency before LIFE."],
      };
    case "product":
      return {
        headline: "Solution Design",
        message: "Keep product interest aligned with the funding requirement and customer profile.",
        nudges: ["Avoid product drift once lender conversations begin."],
      };
    case "funding_strategy":
      return {
        headline: "Lender Strategy (LIFE)",
        message: "Which lender should receive this opportunity? Select into the Execution Queue.",
        nudges: ["Competition lenders stay excluded unless you override."],
      };
    case "relationships":
      return {
        headline: "Relationships",
        message: "Review the business relationship graph — not Loan Structure.",
        nudges: ["Mark the primary contact for banker and customer conversations."],
      };
    case "competition":
      return {
        headline: "Competition",
        message: "Is this opportunity already being processed by another lender?",
        nudges: ["Marked competition lenders are excluded from LIFE selection."],
      };
    case "deviation_mitigant":
      return {
        headline: "Deviation & Mitigation",
        message: "Record RM observations only — auto-detection arrives in a later phase.",
        nudges: ["Log policy deviations and the mitigants you will present."],
      };
    case "notes":
      return {
        headline: "Notes",
        message: "I recommend documenting today's customer discussion.",
        nudges: ["Capture decisions, not transcript dumps."],
      };
    case "timeline":
      return {
        headline: "Activity Timeline",
        message:
          "Review the chronological work history for this Opportunity — notes, documents, tasks, and stage events.",
        nudges: [
          "Add a Business Note from this tab when you capture a customer discussion.",
          "Deal-specific stage history also appears on the Deal Workspace timeline.",
        ],
      };
    case "documents":
      return {
        headline: "Documents",
        message: "Collection belongs in Document Center; verification continues in Credit Workbench.",
        nudges: [],
      };
    case "tasks":
      return {
        headline: "Tasks",
        message: "Keep opportunity tasks focused on qualification and follow-ups.",
        nudges: [],
      };
    case "workflow":
      return {
        headline: "Workflow",
        message: "Advance stages only when planning gates are clear.",
        nudges: [],
      };
    case "overview":
    default:
      return {
        headline: "Strategic Workspace",
        message:
          "How should this opportunity be structured for maximum probability of success?",
        nudges: [
          "Analyse · Qualify · Design · Compete · Select lenders via LIFE.",
          "Execution happens in Loan Workspace and Lender Pipeline.",
        ],
      };
  }
}
