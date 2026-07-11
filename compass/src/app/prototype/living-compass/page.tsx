import type { Metadata } from "next";
import { LivingCompassDemo } from "@/components/prototype/living-compass-demo";

export const metadata: Metadata = {
  title: "SARATHI Guidance Prototype",
  description: "Living Compass with Progress Narrative — SARATHI guidance exploration prototype.",
  robots: { index: false, follow: false },
};

export default function LivingCompassPrototypePage() {
  return <LivingCompassDemo />;
}
