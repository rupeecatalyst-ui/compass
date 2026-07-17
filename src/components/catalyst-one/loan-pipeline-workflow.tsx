"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { pipelineStages } from "@/data/catalyst-one/dashboard";
import { ROUTES } from "@/constants/routes";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { scaleCount, scaleCurrency } from "@/lib/dashboard-metrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LoanPipelineWorkflow() {
  const router = useRouter();
  const { dateRange } = useDashboardFilter();

  const stages = pipelineStages.map((stage) => ({
    ...stage,
    count: scaleCount(stage.count, dateRange.scaleFactor),
    valueLabel: scaleCurrency(stage.value / 10_000_000, dateRange.scaleFactor),
  }));

  const totalCount = stages.reduce((sum, s) => sum + s.count, 0);
  const totalValue = scaleCurrency(42.8, dateRange.scaleFactor);

  return (
    <Card className="glass-card border-border/60 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Loan Pipeline</CardTitle>
            <CardDescription>
              {totalCount} files across 9 stages · {totalValue} total value · {dateRange.label}
            </CardDescription>
          </div>
          <Link
            href={ROUTES.MY_DEALS}
            className="text-xs font-medium text-primary hover:underline shrink-0"
          >
            Open My Deals
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="relative overflow-x-auto scrollbar-thin -mx-2 px-2">
          <div className="flex min-w-max items-stretch gap-0 py-2">
            {stages.map((stage, index) => {
              const isLast = index === stages.length - 1;
              const intensity = index / (stages.length - 1);

              return (
                <div key={stage.id} className="flex items-stretch">
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => router.push(ROUTES.MY_DEALS)}
                    className="group relative w-[132px] sm:w-[145px] text-left"
                  >
                    <div
                      className={cn(
                        "relative rounded-xl border p-2.5 transition-all duration-200",
                        "bg-gradient-to-br hover:shadow-md cursor-pointer",
                        intensity < 0.3 && "from-primary/10 to-primary/5 border-primary/20",
                        intensity >= 0.3 && intensity < 0.7 && "from-accent/10 to-accent/5 border-accent/20",
                        intensity >= 0.7 && "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-[9px] font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="text-base font-bold">{stage.count}</span>
                      </div>
                      <p className="text-[11px] font-semibold leading-tight mb-1">{stage.label}</p>
                      <p className="text-[10px] text-muted-foreground">{stage.valueLabel}</p>
                      <div className="mt-1.5 h-1 rounded-full bg-background/50 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(stage.count / totalCount) * 100}%` }}
                          transition={{ delay: 0.2 + index * 0.04, duration: 0.5 }}
                          className={cn(
                            "h-full rounded-full",
                            intensity < 0.3 && "bg-primary",
                            intensity >= 0.3 && intensity < 0.7 && "bg-accent",
                            intensity >= 0.7 && "bg-emerald-500",
                          )}
                        />
                      </div>
                    </div>
                  </motion.button>
                  {!isLast && (
                    <div className="flex items-center px-0.5 sm:px-1 self-center">
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
