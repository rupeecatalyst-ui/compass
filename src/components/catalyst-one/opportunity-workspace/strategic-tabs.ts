/**
 * Prompt 017 — Strategic Workflow navigation (UI only).
 */

export type OwStrategicTabId =
  | "overview"
  | "customer"
  | "requirement"
  | "product"
  | "funding_strategy"
  | "relationships"
  | "competition"
  | "notes"
  | "timeline"
  | "documents"
  | "tasks"
  | "workflow";

/** Left Strategic Navigation — primary workflow (mockup order). */
export const OW_STRATEGIC_NAV: Array<{ id: OwStrategicTabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "customer", label: "Customer Profile" },
  { id: "requirement", label: "Requirement" },
  { id: "product", label: "Product Interest" },
  { id: "funding_strategy", label: "Funding Strategy" },
  { id: "relationships", label: "Relationships" },
  { id: "competition", label: "Competition" },
  { id: "notes", label: "Notes & Summary" },
  { id: "timeline", label: "Timeline" },
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
        nudges: ["Confirm amount, purpose, and urgency before Funding Strategy."],
      };
    case "product":
      return {
        headline: "Product Interest",
        message: "Keep product interest aligned with the funding requirement and customer profile.",
        nudges: ["Avoid product drift once lender conversations begin."],
      };
    case "funding_strategy":
      return {
        headline: "Funding Strategy",
        message: "This requirement appears suitable for LAP.",
        nudges: ["Select one primary institution before expanding options."],
      };
    case "relationships":
      return {
        headline: "Relationships",
        message: "Primary decision maker has not yet been identified.",
        nudges: ["Mark the primary contact for banker and customer conversations."],
      };
    case "competition":
      return {
        headline: "Competition",
        message: "Capture competing offers or parallel channels so strategy stays intentional.",
        nudges: ["Note competing lenders or in-house options briefly."],
      };
    case "notes":
      return {
        headline: "Notes & Summary",
        message: "I recommend documenting today's customer discussion.",
        nudges: ["Capture decisions, not transcript dumps."],
      };
    case "timeline":
      return {
        headline: "Timeline",
        message: "Use the timeline to confirm what has been qualified — not as an execution backlog.",
        nudges: ["Review before opening Credit Workbench."],
      };
    case "documents":
      return {
        headline: "Documents",
        message: "Planning documents belong here; credit assessment continues in Credit Workbench.",
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
        headline: "Strategic Workflow",
        message:
          "Analyse, plan, structure, and qualify this opportunity before Credit Workbench.",
        nudges: [
          "Credit Workbench = Credit Workflow.",
          "Loan Workspace = Business Operations Workflow.",
        ],
      };
  }
}
