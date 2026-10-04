import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export type ProgrammePolicySurfaceStatus =
  | "not_mapped"
  | "draft_policy"
  | "expired_policy"
  | "resolution_failure"
  | "available_published";

export function resolveProgrammePolicySurface(input: {
  program: Pick<
    EnterpriseLenderProgramRecord,
    "policyVersionId" | "creditRiskPolicyRef" | "publicationState" | "effectiveUntil" | "isLivePublished"
  >;
  policyStatus?: string | null;
  resolved?: boolean;
  resolutionError?: string | null;
}): { status: ProgrammePolicySurfaceStatus; label: string } {
  const ref = (input.program.policyVersionId || input.program.creditRiskPolicyRef || "").trim();
  if (!ref) return { status: "not_mapped", label: "Not mapped" };
  if (input.resolutionError) return { status: "resolution_failure", label: "Resolution failure" };
  if (input.policyStatus === "draft" || input.policyStatus === "pending_approval") {
    return { status: "draft_policy", label: "Draft policy" };
  }
  const expiry = input.program.effectiveUntil ? Date.parse(input.program.effectiveUntil) : NaN;
  if (Number.isFinite(expiry) && expiry < Date.now()) {
    return { status: "expired_policy", label: "Expired policy" };
  }
  if (input.resolved === false) return { status: "resolution_failure", label: "Resolution failure" };
  if (input.program.isLivePublished || input.policyStatus === "published") {
    return { status: "available_published", label: "Available and published" };
  }
  return { status: "draft_policy", label: "Draft policy" };
}

export function resolveProgrammeDocumentSurface(count: number): { status: string; label: string } {
  if (count <= 0) return { status: "not_mapped", label: "Not mapped" };
  return { status: "available_published", label: `${count} required document(s)` };
}
