/**

 * Prompt 019 — Resolve Source Contact options from Enterprise Contact Registry.

 * Presentation filtering only — no registry mutation.

 */



import {
  listLoanJourneySourceContacts,
  type LoanJourneySourceContactOption,
} from "@/lib/loan-journey/ecm-registry-options";



export type SourceContactOption = LoanJourneySourceContactOption;



/**

 * Contacts eligible for the Source Contact picker for a given Source.

 * SSOT: Enterprise Contact Registry (session cache hydrated from PostgreSQL).

 */

export function listSourceContactOptions(source: string): SourceContactOption[] {
  return listLoanJourneySourceContacts(source);
}



export function findSourceContactOption(

  source: string,

  contactId: string | undefined,

): SourceContactOption | undefined {

  if (!contactId) return undefined;

  return listSourceContactOptions(source).find((o) => o.id === contactId);

}



export function normalizeLoanJourneySource(source: string): string {

  if (source === "Builder Tie-up") return "Builder";

  return source;

}

