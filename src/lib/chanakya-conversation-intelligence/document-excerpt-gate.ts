/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
 * Document excerpt gate — apply existing document download permission before extraction.
 */

import { ROLES, type Role } from "@/constants/roles";
import { canDownloadDocuments } from "@/lib/document-registry/permissions";
import type { User } from "@/types/auth";

function isRole(value: string | null | undefined): value is Role {
  return Boolean(value && (Object.values(ROLES) as string[]).includes(value));
}

export function actorMayIncludeDocumentExcerpts(role?: string | null): boolean {
  if (!isRole(role)) return false;
  const user: User = {
    id: "chanakya-actor",
    email: "",
    firstName: "",
    lastName: "",
    role,
    isActive: true,
    createdAt: "",
    updatedAt: "",
  };
  return canDownloadDocuments(user);
}
