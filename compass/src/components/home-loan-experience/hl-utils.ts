"use client";

import { useEffect, useState } from "react";

/** Gentle mouse parallax for premium hero layers. */
export function useMouseParallax(intensity = 1) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * intensity;
      const y = (e.clientY / window.innerHeight - 0.5) * intensity;
      setOffset({ x, y });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [intensity]);

  return offset;
}

export function parallaxStyle(offset: { x: number; y: number }, depth: number) {
  return {
    transform: `translate3d(${offset.x * depth}px, ${offset.y * depth}px, 0)`,
    transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
  };
}

/** Parse Indian-formatted number string to number. */
export function parseInr(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function formatInr(value: number): string {
  if (!value) return "";
  return value.toLocaleString("en-IN");
}

export function formatInrInput(raw: string): string {
  return formatInr(parseInr(raw));
}

/** Standard EMI calculation (monthly). */
export function calculateEmi(principal: number, annualRate = 8.5, tenureYears = 20): number {
  if (!principal) return 0;
  const r = annualRate / 12 / 100;
  const n = tenureYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function eligibilityLabel(income: number, existingEmi: number, proposedEmi: number): string {
  const capacity = income * 0.5 - existingEmi;
  if (!income) return "Add your income to see";
  if (proposedEmi <= capacity * 0.85) return "Comfortable";
  if (proposedEmi <= capacity) return "Within reach";
  return "Needs adjustment";
}

export function affordabilityLabel(income: number, existingEmi: number, proposedEmi: number): string {
  const total = existingEmi + proposedEmi;
  if (!income) return "—";
  const ratio = total / income;
  if (ratio <= 0.35) return "Comfortable buffer";
  if (ratio <= 0.45) return "Manageable";
  if (ratio <= 0.55) return "Tight — consider tenure";
  return "Above comfort zone";
}

export function confidenceFromScore(score: number): string {
  if (score >= 80) return "High";
  if (score >= 60) return "Growing";
  if (score >= 40) return "Building";
  return "Early stage";
}
