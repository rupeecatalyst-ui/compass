import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

/**
 * Legacy Dialogue route — redirects to unified Activity & Dialogue.
 * Preserves query string for opportunityId / dealId / inboundEmailId deep links.
 */
export default async function DialoguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) q.set(key, value);
    else if (Array.isArray(value) && value[0]) q.set(key, value[0]);
  }
  const qs = q.toString();
  redirect(qs ? `${ROUTES.ACTIVITY}?${qs}` : ROUTES.ACTIVITY);
}
