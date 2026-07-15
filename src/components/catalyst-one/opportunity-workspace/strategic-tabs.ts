/**
 * Lead Stage Strategic Workspace — tab model (presentation only).
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
 * Left Strategic Navigation — Phase 1A order.
 * Timeline remains available via deep-focus from Loan Workspace only (not in nav).
 * Internal id `funding_strategy` retained; UI label is LIFE.
 */
export const OW_STRATEGIC_NAV: Array<{ id: OwStrategicTabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "customer", label: "Customer Profile" },
  { id: "requirement", label: "Requirement" },
  { id: "product", label: "Product Interest" },
  { id: "relationships", label: "Relationships" },
  { id: "competition", label: "Competition" },
  { id: "deviation_mitigant", label: "Deviation & Mitigant" },
  { id: "funding_strategy", label: "LIFE" },
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
        headline: "Product Interest",
        message: "Keep product interest aligned with the funding requirement and customer profile.",
        nudges: ["Avoid product drift once lender conversations begin."],
      };
    case "funding_strategy":
      return {
        headline: "LIFE",
        message: "This requirement appears suitable for LAP. Select one primary institution.",
        nudges: ["Assign one lender contact before entering Loan Workspace."],
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
    case "deviation_mitigant":
      return {
        headline: "Deviation & Mitigant",
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
        headline: "Timeline",
        message: "Timeline for this opportunity lives in Loan Workspace.",
        nudges: ["Open Loan Workspace after LIFE assignment and document gates."],
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
          "Analyse, plan, structure, and qualify this opportunity before Loan Workspace.",
        nudges: [
          "Credit Workbench = verification desk.",
          "Document Center = collection.",
          "LIFE = institution assignment.",
        ],
      };
  }
}
