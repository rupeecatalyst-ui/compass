"use client";

import { Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";
import "@/styles/executive-intelligence.css";
import { cn } from "@/lib/utils";

const eiDisplay = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-ei-display",
  display: "swap",
});

/** Premium visual canvas for Executive Intelligence. */
export function EiPremiumCanvas({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ei-canvas min-h-full", eiDisplay.variable, className)}>{children}</div>
  );
}
