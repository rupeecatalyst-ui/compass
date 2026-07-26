/**
 * CO-FOUNDATION-010 — Relationship Intelligence Canvas (RIC) types.
 * Mock-data MVP only. No persistence / APIs / scoring engine.
 */

export type RicCategory =
  | "CA"
  | "Customer"
  | "Builder"
  | "Bank"
  | "NBFC"
  | "Relationship Manager"
  | "Lawyer"
  | "Valuer";

/** Maps to existing ERW colour families — do not invent new palettes. */
export type RicColourFamily =
  | "family"
  | "business"
  | "financial"
  | "professional"
  | "organisation"
  | "government_legal";

export interface RicContact {
  id: string;
  name: string;
  category: RicCategory;
  businessRole: string;
  company: string;
  /** Display-only mock score — not from an engine. */
  relationshipScore: number;
  colourFamily: RicColourFamily;
  lastMeeting?: string;
  lastCall?: string;
  lastFollowUp?: string;
}

/** Undirected first-level link between two contacts. */
export interface RicRelationship {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
}
