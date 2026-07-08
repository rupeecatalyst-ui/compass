import type { Metadata } from "next";
import { PlaceholderPageContent } from "@/components/pages/placeholder-page-content";

export const metadata: Metadata = {
  title: "Financial Fitness",
  description: "Know your borrowing strength before you apply. Financial Fitness Score — coming soon on COMPASS.",
};

export default function FinancialFitnessPage() {
  return <PlaceholderPageContent page="financialFitness" />;
}
