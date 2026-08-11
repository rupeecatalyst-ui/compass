import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

/** AI-11: AI Assistant placeholder replaced by SARATHI Conversation Experience. */
export default function AiAssistantPage() {
  redirect(ROUTES.SARATHI);
}
