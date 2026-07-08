import { redirect } from "next/navigation";
import { toolRoute } from "@/constants/routes";

export default function FinancialFitnessPage() {
  redirect(toolRoute("financial-fitness-calculator"));
}
