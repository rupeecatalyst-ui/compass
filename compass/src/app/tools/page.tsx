import type { Metadata } from "next";
import { ToolsHubContent } from "@/components/pages/tools-hub-content";

export const metadata: Metadata = {
  title: "Financial Intelligence Tools",
  description:
    "COMPASS financial intelligence tools powered by Catalyst One Intelligence — Coming Soon.",
};

export default function ToolsPage() {
  return <ToolsHubContent />;
}
