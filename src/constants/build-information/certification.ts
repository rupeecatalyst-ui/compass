/**
 * CO-OPS-001.1 — Release certification stage (manual operational SSOT).
 * Update when a stage is certified. Do not invent Production certification.
 */
import type { BuildDeploymentEnvironment } from "@/types/build-information";

export type BuildCertificationStageStatus = "certified" | "pending" | "blocked";

export type BuildCertificationStage = {
  id: "local" | "preview" | "production";
  label: string;
  status: BuildCertificationStageStatus;
  note?: string;
};

/**
 * Current release certification board for Build Information.
 * CO-P0-006 Wave 1 Local Certification complete 2026-07-23 — Preview/Production blocked until approved.
 */
export const BUILD_INFORMATION_CERTIFICATION: BuildCertificationStage[] = [
  {
    id: "local",
    label: "Local Certification",
    status: "pending",
    note: "CO-ARCH-003 Phase 0 complete; Phase 1 Opportunity schema AWAITING APPROVAL (Plan Mode) — 2026-07-23",
  },
  {
    id: "preview",
    label: "Preview Certification",
    status: "pending",
    note: "Blocked until Local Certification accepted and Preview deploy approved (CO-GOV-001)",
  },
  {
    id: "production",
    label: "Production Certification",
    status: "pending",
    note: "Blocked until Preview Certification and Production deploy approved (CO-GOV-001)",
  },
];

export function certificationStatusLabel(status: BuildCertificationStageStatus): string {
  if (status === "certified") return "Certified";
  if (status === "blocked") return "Blocked";
  return "Pending";
}

export function certificationStatusEmoji(status: BuildCertificationStageStatus): string {
  if (status === "certified") return "✅";
  if (status === "blocked") return "🔴";
  return "⏳";
}

/** Highlight which certification row matches the running environment. */
export function isCertificationStageForEnvironment(
  stageId: BuildCertificationStage["id"],
  env: BuildDeploymentEnvironment,
): boolean {
  if (stageId === "local" && env === "Local") return true;
  if (stageId === "preview" && env === "Preview") return true;
  if (stageId === "production" && env === "Production") return true;
  return false;
}
