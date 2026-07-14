/**
 * Business Completion Framework — CF-WF-001
 * Reusable enterprise types for guiding users to fill only what a process needs.
 */

export type BusinessCompletionControl =
  | "text"
  | "number"
  | "property_type"
  | "occupancy"
  | "lending_type"
  | "transaction_type"
  | "loan_product"
  | "bt_institution"
  | "bt_amount"
  | "final_loan_amount";

export interface BusinessCompletionField {
  /** Stable field key on the domain entity (e.g. propertyType). */
  fieldKey: string;
  /** Business-facing label shown in the card. */
  label: string;
  /** Validation / rule code from configuration layer. */
  code: string;
  /** Control used to collect the value. */
  control: BusinessCompletionControl;
  /** Short guidance under the field (optional). */
  helpText?: string;
  required?: boolean;
}

export interface BusinessCompletionRequest {
  /** Product / process title shown on the card (e.g. "Loan Against Property"). */
  processTitle: string;
  /** Module owning the process — for future analytics / routing. */
  module: "loan" | "contact" | "partner" | "document" | "life" | "generic";
  /** Only fields required to continue the current process. */
  fields: BusinessCompletionField[];
  /** Optional subtitle under the title. */
  message?: string;
  /** Opaque resume token — caller restores original action on Save & Continue. */
  resumeToken?: string;
}

export type BusinessCompletionValues = Record<string, string | number | undefined>;

/** Link-style completion guidance (no inline fields) — e.g. LIFE blockers. */
export interface BusinessCompletionGuide {
  code: string;
  title: string;
  message: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
}
