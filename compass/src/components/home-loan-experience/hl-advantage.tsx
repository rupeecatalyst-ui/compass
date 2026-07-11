"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  affordabilityLabel,
  calculateEmi,
  confidenceFromScore,
  eligibilityLabel,
  formatInr,
  formatInrInput,
  parseInr,
} from "@/components/home-loan-experience/hl-utils";
import { HlBody, HlChapter, HlEyebrow, HlGlassCard, HlHeadline } from "@/components/home-loan-experience/hl-chapter";
import { homeLoanExperience } from "@/config/home-loan-experience";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

function InrField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
        <input
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(formatInrInput(e.target.value))}
          className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] pl-8 pr-4 text-sm outline-none transition focus:border-primary/35 focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </label>
  );
}

function OutputTile({
  label,
  value,
  highlight,
  delay,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  delay: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay, ease: smoothEase }}
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        highlight
          ? "border-primary/30 bg-primary/[0.08] shadow-[0_0_40px_-16px_var(--glow)]"
          : "border-white/[0.06] bg-white/[0.02]",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-lg font-semibold tracking-tight", highlight && "text-gradient")}>{value}</p>
    </motion.div>
  );
}

export function HlAdvantage() {
  const { advantage } = homeLoanExperience;
  const f = advantage.fields;

  const [loanAmount, setLoanAmount] = useState(formatInr(Number(f.loanAmount.default)));
  const [income, setIncome] = useState(formatInr(Number(f.income.default)));
  const [propertyValue, setPropertyValue] = useState(formatInr(Number(f.propertyValue.default)));
  const [existingEmi, setExistingEmi] = useState(formatInr(Number(f.existingEmi.default)));
  const [city, setCity] = useState<string>(f.city.placeholder);

  const loan = parseInr(loanAmount);
  const inc = parseInr(income);
  const prop = parseInr(propertyValue);
  const existing = parseInr(existingEmi);

  const outputs = useMemo(() => {
    const emi = calculateEmi(loan);
    const ltv = prop ? Math.round((loan / prop) * 100) : 0;
    const fitnessScore = Math.min(
      95,
      Math.round(
        (inc ? Math.min(40, (inc / 200000) * 40) : 0) +
          (loan && inc ? Math.min(35, ((inc * 0.5 - existing) / emi) * 35) : 0) +
          (ltv ? Math.min(20, ltv <= 80 ? 20 : 80 / ltv * 20) : 10),
      ),
    );
    return {
      eligibility: eligibilityLabel(inc, existing, emi),
      emi: emi ? `₹${formatInr(Math.round(emi))} / mo` : "—",
      affordability: affordabilityLabel(inc, existing, emi),
      fitnessScore: String(fitnessScore),
      confidence: confidenceFromScore(fitnessScore),
    };
  }, [loan, inc, prop, existing]);

  return (
    <HlChapter id="compass-advantage" className="border-t border-white/[0.04] bg-[#06080d]">
      <div className="mb-12 text-center">
        <HlEyebrow className="text-center">{advantage.eyebrow}</HlEyebrow>
        <HlHeadline className="mx-auto max-w-2xl">{advantage.headline}</HlHeadline>
        <HlBody className="mx-auto mt-4 max-w-lg">{advantage.subheadline}</HlBody>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <HlGlassCard className="space-y-5">
          <InrField label={f.loanAmount.label} value={loanAmount} placeholder={f.loanAmount.placeholder} onChange={setLoanAmount} />
          <InrField label={f.income.label} value={income} placeholder={f.income.placeholder} onChange={setIncome} />
          <InrField label={f.propertyValue.label} value={propertyValue} placeholder={f.propertyValue.placeholder} onChange={setPropertyValue} />
          <InrField label={f.existingEmi.label} value={existingEmi} placeholder={f.existingEmi.placeholder} onChange={setExistingEmi} />
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{f.city.label}</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={f.city.placeholder}
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm outline-none transition focus:border-primary/35 focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </HlGlassCard>

        <div className="grid gap-3 sm:grid-cols-2">
          <OutputTile label={advantage.outputs.eligibility} value={outputs.eligibility} delay={0} />
          <OutputTile label={advantage.outputs.emi} value={outputs.emi} highlight delay={0.05} />
          <OutputTile label={advantage.outputs.affordability} value={outputs.affordability} delay={0.1} />
          <OutputTile label={advantage.outputs.fitnessScore} value={outputs.fitnessScore} highlight delay={0.15} />
          <div className="sm:col-span-2">
            <OutputTile label={advantage.outputs.confidence} value={outputs.confidence} delay={0.2} />
          </div>
        </div>
      </div>
    </HlChapter>
  );
}
