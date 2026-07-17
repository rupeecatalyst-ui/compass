import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

/** Loan Board removed — superseded by CHANAKYA Radar. */
export default function PipelineRedirectPage() {
  redirect(ROUTES.CHANAKYA_RADAR);
}
