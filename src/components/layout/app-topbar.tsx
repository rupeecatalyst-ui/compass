"use client";

import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useSidebar } from "@/hooks/use-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { GlobalChanakyaButton } from "@/components/layout/global-chanakya-assistant";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppTopbarProps {
  onSearchClick?: () => void;
}

export function AppTopbar({ onSearchClick }: AppTopbarProps) {
  const { toggleTheme, isDark, mounted } = useTheme();
  const { openMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={openMobile}>
        <Menu className="h-5 w-5" />
      </Button>

      <WorkspaceSwitcher />

      <div className="flex-1 max-w-md hidden sm:block">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-muted-foreground h-9"
          onClick={onSearchClick}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Search anything...</span>
          <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            ⌘K
          </kbd>
        </Button>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <Button variant="ghost" size="icon" className="sm:hidden" onClick={onSearchClick}>
          <Search className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <NotificationsPanel />
          </DropdownMenuContent>
        </DropdownMenu>

        <GlobalChanakyaButton />

        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {mounted && (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
        </Button>

        <UserMenu />
      </div>
    </header>
  );
}
