"use client";

import Link from "next/link";
import {
  Calculator,
  FilePlus,
  FolderUp,
  Receipt,
  UserPlus,
  FileText,
  ListTodo,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

const actions = [
  { label: "New Loan", icon: FilePlus, href: `${ROUTES.LOAN_FILES}?action=new` },
  { label: "Add Customer", icon: UserPlus, href: ROUTES.CUSTOMERS },
  { label: "Create Task", icon: ListTodo, href: ROUTES.TASKS },
  { label: "Upload Folder", icon: FolderUp, href: `${ROUTES.DOCUMENTS}?action=upload` },
  { label: "Eligibility Calculator", icon: Calculator, href: `${ROUTES.AI_ASSISTANT}?tool=eligibility` },
  { label: "Generate Report", icon: FileText, href: ROUTES.REPORTS },
  { label: "Create Invoice", icon: Receipt, href: `${ROUTES.ACCOUNTING}?action=invoice` },
];

export function QuickActionsBar() {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-3 mt-4 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-0.5">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2",
              "text-xs font-medium text-slate-300 hover:text-teal-300 hover:border-teal-500/40 hover:bg-slate-800/80 transition-all",
            )}
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
