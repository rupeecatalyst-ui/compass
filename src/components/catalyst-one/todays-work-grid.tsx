"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { todaysWork } from "@/data/catalyst-one/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/design-system/status-pill";
import { cn } from "@/lib/utils";

const priorityVariant = {
  high: "error" as const,
  medium: "warning" as const,
  low: "muted" as const,
};

export function TodaysWorkGrid() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Today&apos;s Work</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {todaysWork.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <Card className="glass-card border-border/60 h-full group hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                  <StatusPill variant={priorityVariant[item.priority]}>
                    {item.priority}
                  </StatusPill>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className={cn("text-3xl font-bold tracking-tight", item.priority === "high" && "text-primary")}>
                  {item.count}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                {item.href && (
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    View details
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
