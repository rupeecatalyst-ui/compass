import type { Metadata } from "next";
import { BorrowPageContent } from "@/components/pages/borrow-page-content";

export const metadata: Metadata = {
  title: "Borrow",
  description:
    "Choose your borrowing goal. COMPASS recommends the right strategy before recommending a lender.",
};

export default function BorrowPage() {
  return <BorrowPageContent />;
}
