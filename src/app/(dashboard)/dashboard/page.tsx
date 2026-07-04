"use client";

import { motion } from "framer-motion";
import { Activity, Shield, Zap, Users } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusPill } from "@/components/design-system/status-pill";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cardHoverVariants } from "@/lib/animations";
import { siteConfig } from "@/config/site";

const stats = [
  { title: "Platform Status", value: "Operational", icon: Activity, variant: "success" as const },
  { title: "Active Sessions", value: "—", icon: Users, variant: "info" as const },
  { title: "Security", value: "Protected", icon: Shield, variant: "default" as const },
  { title: "Performance", value: "Optimal", icon: Zap, variant: "success" as const },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Welcome to ${siteConfig.name} — your financial operating system foundation`}
        actions={<StatusPill variant="success">Sprint 1 Active</StatusPill>}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <motion.div key={stat.title} initial="rest" whileHover="hover" variants={cardHoverVariants}>
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <StatusPill variant={stat.variant} className="mt-2">
                  Live
                </StatusPill>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Platform Foundation</CardTitle>
          <CardDescription>
            Sprint 1 delivers the enterprise architecture. Business modules will be built in future sprints.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            "Authentication & Session Management",
            "Role-Based Access Control",
            "Responsive Navigation",
            "Design System & Theme Engine",
            "Command Palette (⌘K)",
            "API Layer & Error Handling",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm">
              <StatusPill variant="success" dot />
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
