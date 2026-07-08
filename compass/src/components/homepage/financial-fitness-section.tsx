"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Activity } from "lucide-react";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { Button } from "@/components/ui/button";
import { homepageV2 } from "@/config/homepage";
import { ROUTES } from "@/constants/routes";

function FitnessGauge({ score }: { score: number }) {
  const maxScore = 900;
  const pct = score / maxScore;
  const angle = pct * 180;
  const radius = 90;
  const cx = 110;
  const cy = 110;

  const polar = (degrees: number) => {
    const rad = ((degrees - 180) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const end = polar(angle);
  const largeArc = angle > 180 ? 1 : 0;

  return (
    <div className="relative mx-auto w-full max-w-xs">
      <svg viewBox="0 0 220 130" className="w-full" role="img" aria-label={`Sample Financial Fitness Score: ${score}`}>
        <defs>
          <linearGradient id="fitnessGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <motion.path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`}
          fill="none"
          stroke="url(#fitnessGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground text-4xl font-bold">
          {score}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="fill-muted-foreground text-[11px]">
          Sample Score
        </text>
      </svg>
      <div className="mt-1 flex justify-between px-3 text-[10px] text-muted-foreground">
        <span>300</span>
        <span className="text-primary font-medium">Strong</span>
        <span>900</span>
      </div>
    </div>
  );
}

export function FinancialFitnessSection() {
  const { fitness } = homepageV2;

  return (
    <SectionReveal id="fitness">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative order-2 lg:order-1"
        >
          <div className="rounded-2xl glass-panel p-8 sm:p-10">
            <FitnessGauge score={fitness.sampleScore} />
            <div className="mt-8 grid grid-cols-2 gap-3">
              {fitness.dimensions.map((dim, i) => (
                <motion.div
                  key={dim}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-2 rounded-xl border border-border/40 bg-white/[0.02] px-3 py-2.5"
                >
                  <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">{dim}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="order-1 lg:order-2">
          <SectionHeader
            align="left"
            eyebrow="Financial Fitness"
            headline={fitness.headline}
            subheadline={fitness.subheadline}
          />
          <p className="mt-6 text-sm text-muted-foreground leading-relaxed">{fitness.description}</p>
          <Button size="lg" className="mt-8 h-12" asChild>
            <Link href={ROUTES.FINANCIAL_FITNESS}>
              {fitness.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </SectionReveal>
  );
}
