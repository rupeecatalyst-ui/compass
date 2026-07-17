"use client";

import Link from "next/link";
import {
  BarChart3,
  Calculator,
  FilePlus,
  FileText,
  FolderUp,
  ListTodo,
  PhoneCall,
  Receipt,
  UserPlus,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
} from "@/components/catalyst-one/dashboard/dashboard-card";

const actions = [
  { label: "New Loan File", icon: FilePlus, href: `${ROUTES.LOAN_FILES}?action=new` },
  { label: "Add Customer", icon: UserPlus, href: ROUTES.CUSTOMERS },
  { label: "Create Task", icon: ListTodo, href: ROUTES.TASKS },
  { label: "Upload Docs", icon: FolderUp, href: `${ROUTES.DOCUMENTS}?action=upload` },
  { label: "Eligibility", icon: Calculator, href: `${ROUTES.AI_ASSISTANT}?tool=eligibility` },
  { label: "Report", icon: FileText, href: ROUTES.REPORTS },
  { label: "Invoice", icon: Receipt, href: `${ROUTES.ACCOUNTING}?action=invoice` },
  { label: "Follow-up", icon: PhoneCall, href: `${ROUTES.TASKS}?action=followup` },
  { label: "CHANAKYA Radar", icon: BarChart3, href: ROUTES.CHANAKYA_RADAR },
];

export function QuickActionsGrid() {
  return (
    <DashboardCard>
      <DashboardCardHeader title="Quick Actions" description="Common operational shortcuts" />
      <DashboardCardContent className="pt-0 py-2">
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border border-slate-800/80 bg-slate-950/30 px-1.5 py-2",
                "text-center transition-all hover:border-teal-500/30 hover:bg-slate-900/60 group",
              )}
            >
              <action.icon className="h-3.5 w-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
              <span className="text-[9px] leading-tight text-slate-400 group-hover:text-slate-200">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </DashboardCardContent>
    </DashboardCard>
  );
}
