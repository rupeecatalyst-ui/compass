/**
 * Prompt 017 — Strategic tab presentation (UI only).
 * Maps to existing panels without changing WorkspaceFocus business APIs.
 */

export type OwStrategicTabId =
  | "overview"
  | "customer"
  | "requirement"
  | "product"
  | "funding_strategy"
  | "relationships"
  | "notes"
  | "timeline"
  | "documents"
  | "tasks"
  | "workflow";

export const OW_STRATEGIC_TABS: Array<{ id: OwStrategicTabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "customer", label: "Customer" },
  { id: "requirement", label: "Requirement" },
  { id: "product", label: "Product" },
  { id: "funding_strategy", label: "Funding Strategy" },
  { id: "relationships", label: "Relationships" },
  { id: "notes", label: "Notes" },
  { id: "timeline", label: "Timeline" },
];

/** Secondary execution surfaces — available without cluttering the primary strip. */
export const OW_SECONDARY_TABS: Array<{ id: OwStrategicTabId; label: string }> = [
  { id: "documents", label: "Documents" },
  { id: "tasks", label: "Tasks" },
  { id: "workflow", label: "Workflow" },
];

export function getOwChanakyaTabGuidance(tab: OwStrategicTabId): {
  headline: string;
  message: string;
  nudges: string[];
} {
  switch (tab) {
    case "customer":
      return {
        headline: "Customer readiness",
        message:
          "I recommend confirming the promoter and key applicant details before advancing this opportunity.",
        nudges: [
          "Ensure mobile and email are present for follow-ups.",
          "Capture decision-maker context before lender outreach.",
        ],
      };
    case "requirement":
      return {
        headline: "Requirement clarity",
        message: "The funding purpose needs additional clarification to qualify lenders accurately.",
        nudges: [
          "Confirm amount and intended use of funds.",
          "Align tenure expectations with the selected product path.",
        ],
      };
    case "product":
      return {
        headline: "Product fit",
        message: "Keep the product framing consistent with the funding requirement and customer profile.",
        nudges: [
          "Avoid switching products once lender conversations start.",
          "Use Product Master names exactly as planned for execution.",
        ],
      };
    case "funding_strategy":
      return {
        headline: "Funding strategy",
        message: "This requirement appears suitable for a Loan Against Property or a secured path — confirm fit before assigning a lender.",
        nudges: [
          "Select one primary institution from LIFE.",
          "Do not expand to multiple lenders until strategy is settled.",
        ],
      };
    case "relationships":
      return {
        headline: "Relationship map",
        message: "You have not identified the primary decision maker for this opportunity.",
        nudges: [
          "Mark the primary contact for banker conversations.",
          "Keep lender executor alignment with the selected institution.",
        ],
      };
    case "notes":
      return {
        headline: "Strategic notes",
        message: "Capture planning decisions here so execution teams inherit context without restarting discovery.",
        nudges: ["Prefer concise decisions over long narrative dumps."],
      };
    case "timeline":
      return {
        headline: "Planning timeline",
        message: "Use the timeline to confirm what has been qualified — not as an execution backlog.",
        nudges: ["Review stage movements before opening Credit Workbench."],
      };
    case "documents":
      return {
        headline: "Document readiness",
        message: "Planning documents belong here; credit assessment continues in Credit Workbench.",
        nudges: ["Open Credit Workbench when you need stated information with viewer context."],
      };
    case "tasks":
      return {
        headline: "Planning tasks",
        message: "Keep opportunity tasks focused on qualification and follow-ups — not loan execution chores.",
        nudges: [],
      };
    case "workflow":
      return {
        headline: "Strategic workflow",
        message: "Advance stages only when planning gates are clear — Catalyst One owns the workflow truth.",
        nudges: [],
      };
    case "overview":
    default:
      return {
        headline: "Strategic planning",
        message: "You are planning this opportunity. Qualify customer, requirement, product, and funding strategy before execution.",
        nudges: [
          "Use Credit Workbench for credit assessment.",
          "Use Loan Workspace when execution begins.",
        ],
      };
  }
}
