import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

/** CO-REFINEMENT-004 — Legacy /reports alias redirects into Mission Control shell. */
export default function ReportsPage() {
  redirect(ROUTES.MISSION_CONTROL_ENTERPRISE_INTELLIGENCE);
}
