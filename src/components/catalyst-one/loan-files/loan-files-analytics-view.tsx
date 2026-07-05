"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, Funnel, FunnelChart, LabelList, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { loanLenders, loanManagers, loanProducts } from "@/data/catalyst-one/loan-files";
import { formatINR, formatINRCompact } from "@/lib/format-currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const COLORS = ["#0F766E", "#22C55E", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#6366F1"];

export function LoanFilesAnalyticsView() {
  const { files, columnStats, aiInsights } = useLoanFiles();

  const stageChartData = columnStats.map((s) => ({
    name: s.label,
    files: s.count,
    value: s.totalValue,
  }));

  const funnelData = columnStats
    .filter((s) => s.count > 0)
    .map((s) => ({ name: s.label, value: s.count, fill: COLORS[columnStats.indexOf(s) % COLORS.length] }));

  const productData = loanProducts
    .map((product) => ({
      name: product.length > 18 ? `${product.slice(0, 16)}…` : product,
      fullName: product,
      count: files.filter((f) => f.loanProduct === product).length,
      value: files.filter((f) => f.loanProduct === product).reduce((s, f) => s + f.loanAmount, 0),
    }))
    .filter((d) => d.count > 0);

  const lenderData = loanLenders
    .map((lender) => ({
      name: lender.replace(" Bank", "").replace(" Housing", ""),
      count: files.filter((f) => f.lender === lender).length,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const rmData = loanManagers
    .map((rm) => ({
      name: rm.split(" ")[0],
      revenue: files.filter((f) => f.relationshipManager === rm).reduce((s, f) => s + f.expectedRevenue, 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const priorityData = [
    { name: "Urgent", value: files.filter((f) => f.priority === "urgent").length, fill: "#EF4444" },
    { name: "High", value: files.filter((f) => f.priority === "high").length, fill: "#F59E0B" },
    { name: "Medium", value: files.filter((f) => f.priority === "medium").length, fill: "#3B82F6" },
    { name: "Low", value: files.filter((f) => f.priority === "low").length, fill: "#94A3B8" },
  ];

  const monthlyDisbursement = useMemo(() => {
    const months = new Map<string, number>();
    files.forEach((f) => {
      const d = new Date(f.expectedDisbursement);
      const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      months.set(key, (months.get(key) ?? 0) + (f.disbursementAmount || f.loanAmount * 0.9));
    });
    return Array.from(months.entries())
      .slice(0, 6)
      .map(([month, amount]) => ({ month, amount }));
  }, [files]);

  const chartConfig = {
    files: { label: "Files", color: "hsl(var(--primary))" },
    value: { label: "Value", color: "hsl(var(--accent))" },
    revenue: { label: "Revenue", color: "hsl(var(--accent))" },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Files", value: String(files.length) },
          { label: "Pipeline Value", value: formatINRCompact(files.reduce((s, f) => s + f.loanAmount, 0)) },
          { label: "Expected Revenue", value: formatINRCompact(aiInsights.expectedRevenue) },
          { label: "Urgent + Delayed", value: `${aiInsights.urgentCount + aiInsights.delayedCount}` },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Pipeline Funnel</CardTitle>
            <CardDescription>Files by stage — conversion view</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <FunnelChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" />
                </Funnel>
              </FunnelChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={stageChartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="files" fill="var(--color-files)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Files by Product</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={productData}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip formatter={(v) => [v, "Files"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {productData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Files by Lender</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={lenderData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Revenue by RM</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={rmData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatINRCompact(Number(v))} width={55} tick={{ fontSize: 9 }} />
                <ChartTooltip formatter={(v) => formatINR(Number(v))} />
                <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Priority Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90}>
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Disbursement (Expected)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <LineChart data={monthlyDisbursement}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatINRCompact(Number(v))} width={55} tick={{ fontSize: 9 }} />
                <ChartTooltip formatter={(v) => formatINR(Number(v))} />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
