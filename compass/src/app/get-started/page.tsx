import type { Metadata } from "next";
import { GetStartedPageContent } from "@/components/pages/get-started-page-content";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Choose Borrow or Invest to begin your COMPASS financial journey.",
};

export default function GetStartedPage() {
  return <GetStartedPageContent />;
}
