"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { pipelineStages } from "@/data/catalyst-one/dashboard";
import { formatINRCompact } from "@/lib/format-currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LoanPipelineWorkflow() {
  const totalCount = pipelineStages.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card className="glass-card border-border/60 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Loan Pipeline</CardTitle>
            <CardDescription>{totalCount} files across 9 stages · ₹42.8 Cr total value</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="relative overflow-x-auto scrollbar-thin -mx-2 px-2">
          <div className="flex min-w-max items-stretch gap-0 py-4">
            {pipelineStages.map((stage, index) => {
              const isLast = index === pipelineStages.length - 1;
              const intensity = index / (pipelineStages.length - 1);

              return (
                <div key={stage.id} className="flex items-stretch">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative w-[140px] sm:w-[155px]"
                  >
                    <div
                      className={cn(
                        "relative rounded-xl border p-3 transition-all duration-200",
                        "bg-gradient-to-br hover:shadow-md hover:-translate-y-0.5",
                        intensity < 0.3 && "from-primary/10 to-primary/5 border-primary/20",
                        intensity >= 0.3 && intensity < 0.7 && "from-accent/10 to-accent/5 border-accent/20",
                        intensity >= 0.7 && "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-[10px] font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="text-lg font-bold">{stage.count}</span>
                      </div>
                      <p className="text-xs font-semibold leading-tight mb-1">{stage.label}</p>
                      <p className="text-[10px] text-muted-foreground">{formatINRCompact(stage.value)}</p>
                      <div className="mt-2 h-1 rounded-full bg-background/50 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(stage.count / totalCount) * 100}%` }}
                          transition={{ delay: 0.3 + index * 0.05, duration: 0.5 }}
                          className={cn(
                            "h-full rounded-full",
                            intensity < 0.3 && "bg-primary",
                            intensity >= 0.3 && intensity < 0.7 && "bg-accent",
                            intensity >= 0.7 && "bg-emerald-500",
                          )}
                        />
                      </div>
                    </div>
                  </motion.div>
                  {!isLast && (
                    <div className="flex items-center px-1 sm:px-1.5 self-center">
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
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
