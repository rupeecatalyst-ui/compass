"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { workspaces } from "@/config/navigation";
import { STORAGE_KEYS } from "@/constants/animations";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function WorkspaceSwitcher() {
  const [activeWorkspace, setActiveWorkspace] = useLocalStorage(STORAGE_KEYS.WORKSPACE, workspaces[0].id);
  const current = workspaces.find((w) => w.id === activeWorkspace) ?? workspaces[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 h-9 max-w-[200px]">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
            {current.name.charAt(0)}
          </div>
          <span className="truncate text-sm">{current.name}</span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => setActiveWorkspace(workspace.id)}
            className="gap-2"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
              {workspace.name.charAt(0)}
            </div>
            <span className="flex-1">{workspace.name}</span>
            {workspace.id === activeWorkspace && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
