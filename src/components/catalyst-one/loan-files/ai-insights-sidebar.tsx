"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  Calendar,
  Clock,
  IndianRupee,
  MessageSquare,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import { useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { formatINR, formatINRCompact } from "@/lib/format-currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function AiInsightsSidebar() {
  const { aiInsights, setSelectedFileId } = useLoanFiles();

  const metrics = [
    { label: "Urgent Files", value: aiInsights.urgentCount, icon: AlertTriangle, color: "text-destructive" },
    { label: "Credit Queries", value: aiInsights.creditQueryCount, icon: MessageSquare, color: "text-info" },
    { label: "Today's Disbursement", value: aiInsights.todayDisbursementCount, icon: Calendar, color: "text-primary" },
    { label: "Expected Revenue", value: formatINRCompact(aiInsights.expectedRevenue), icon: TrendingUp, color: "text-accent" },
    { label: "Delayed Files", value: aiInsights.delayedCount, icon: Clock, color: "text-warning" },
  ];

  return (
    <aside className="hidden xl:flex w-72 shrink-0 flex-col border-l border-border/60 bg-card/30 backdrop-blur-sm">
      <div className="p-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI Insights</h3>
            <p className="text-[10px] text-muted-foreground">Catalyst One Intelligence</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="grid gap-2">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-border/50 bg-background/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <m.icon className={cn("h-4 w-4 shrink-0", m.color)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
                      <p className="text-lg font-bold">{m.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {aiInsights.topRm && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="py-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Top Performing RM
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0 text-xs">
                <p className="font-semibold">{aiInsights.topRm.rm}</p>
                <p className="text-muted-foreground mt-1">
                  {aiInsights.topRm.count} files · {formatINR(aiInsights.topRm.revenue)} revenue
                </p>
              </CardContent>
            </Card>
          )}

          {aiInsights.todaysFocus.length > 0 && (
            <Card className="border-accent/20 bg-accent/5">
              <CardHeader className="py-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5 text-accent">
                  <Sparkles className="h-3.5 w-3.5" /> Today&apos;s Focus
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0 space-y-1.5">
                {aiInsights.todaysFocus.map((item) => (
                  <p key={item} className="text-xs text-muted-foreground">
                    · {item}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {aiInsights.urgentFiles.length > 0 && (
            <InsightList
              title="Urgent Files"
              icon={AlertTriangle}
              color="destructive"
              files={aiInsights.urgentFiles}
              onSelect={setSelectedFileId}
            />
          )}

          {aiInsights.creditQueryFiles.length > 0 && (
            <InsightList
              title="Credit Queries"
              icon={MessageSquare}
              color="info"
              files={aiInsights.creditQueryFiles}
              onSelect={setSelectedFileId}
              subtitle={(f) => f.loanProduct ?? ""}
            />
          )}

          {aiInsights.todayDisbursementFiles.length > 0 && (
            <InsightList
              title="Today's Disbursement"
              icon={IndianRupee}
              color="primary"
              files={aiInsights.todayDisbursementFiles}
              onSelect={setSelectedFileId}
              subtitle={(f) => formatINR(f.loanAmount)}
            />
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function InsightList({
  title,
  icon: Icon,
  color,
  files,
  onSelect,
  subtitle,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  files: { id: string; customerName: string; loanAmount: number; loanProduct?: string; daysInStage?: number }[];
  onSelect: (id: string) => void;
  subtitle?: (f: (typeof files)[0]) => string;
}) {
  return (
    <Card className={`border-${color}/20`}>
      <CardHeader className="py-3 px-3">
        <CardTitle className={`text-xs flex items-center gap-1.5 text-${color}`}>
          <Icon className="h-3.5 w-3.5" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 space-y-1.5">
        {files.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            className="w-full text-left rounded-md px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors"
          >
            <p className="font-medium truncate">{f.customerName}</p>
            <p className="text-muted-foreground">
              {subtitle ? subtitle(f) : `${formatINR(f.loanAmount)} · ${f.daysInStage ?? 0}d`}
            </p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
