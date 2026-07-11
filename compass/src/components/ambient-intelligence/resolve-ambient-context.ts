import type { DiscoveryAnswers } from "@/components/home-loan-experience/discovery/discovery-context";
import type { DiscoveryStepId } from "@/config/home-loan-discovery";
import type { AmbientContext } from "@/config/ambient-intelligence";

export function resolveAmbientContext(
  step: DiscoveryStepId | null,
  answers: DiscoveryAnswers,
  sarathiActivated: boolean,
): AmbientContext {
  if (sarathiActivated) return "sarathi";

  if (!step) return "explore";

  switch (step) {
    case "advantage":
      return "advantage";
    case "lenders":
      return "lenders";
    case "propertyType":
    case "loanAmount":
    case "propertyValue":
    case "mobile":
      return answers.propertyType === "construction" ? "construction" : "before-income";
    case "incomeType":
      return "before-income";
    case "monthlyIncome":
    case "existingEmi":
      return "after-income";
    case "city":
    case "analysing":
      return answers.propertyType === "construction" ? "construction" : "after-income";
    case "welcome":
    default:
      return "explore";
  }
}
