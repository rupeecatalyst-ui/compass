import { ECM_CONTACT_SCORE_CONFIG } from "@/constants/enterprise-contact-master";
import type { EcmContact } from "@/types/enterprise-contact-master";

/** Configuration-driven Contact Score — grid displays the result only. */
export function computeEcmContactScore(
  contact: Pick<
    EcmContact,
    "personalEmail" | "officialEmail" | "mobileSecondary" | "roles" | "status" | "primaryRole" | "additionalRoles"
  >,
): number {
  const cfg = ECM_CONTACT_SCORE_CONFIG;
  let score = cfg.base;

  if (contact.personalEmail?.trim()) score += cfg.hasPersonalEmail;
  if (contact.officialEmail?.trim()) score += cfg.hasOfficialEmail;
  if (contact.mobileSecondary?.trim()) score += cfg.hasSecondaryMobile;

  const roleCount =
    contact.roles?.length ||
    1 + (contact.additionalRoles?.length ?? 0);
  score += Math.min(cfg.maxRolesContribution, roleCount * cfg.perRole);

  if ((contact.status ?? "active") === "active") score += cfg.activeStatus;

  return Math.max(0, Math.min(cfg.ceiling, Math.round(score)));
}
