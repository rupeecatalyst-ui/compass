"use client";

import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useSidebar } from "@/hooks/use-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { ActivityDialogueQuickAccess } from "@/components/catalyst-one/activity-dialogue/activity-dialogue-quick-access";
import { GlobalChanakyaButton } from "@/components/layout/global-chanakya-assistant";
import { ChanakyaLiveIntelligenceBar } from "@/components/enterprise/chanakya-live-intelligence";
import { ChanakyaRadarViewSwitcher } from "@/components/catalyst-one/chanakya-radar/chanakya-radar-view-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AppTopbarProps {
  onSearchClick?: () => void;
}

/**
 * EUX-007 enterprise header layout:
 * Logo/Workspace · Page controls · Live Intelligence · Notifications · Activity & Dialogue · Switchers · CHANAKYA AI · Profile
 */
export function AppTopbar({ onSearchClick }: AppTopbarProps) {
  const { toggleTheme, isDark, mounted } = useTheme();
  const { openMobile, collapsed, setPeekOpen, noteNavInteraction, navMode, setCollapsed } =
    useSidebar();

  const expandNavFromMenu = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      openMobile();
      return;
    }
    if (navMode === "auto") {
      setPeekOpen(true);
      noteNavInteraction();
      return;
    }
    setCollapsed(false);
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 overflow-hidden border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className={cn("shrink-0", collapsed ? "inline-flex" : "md:hidden")}
        onClick={expandNavFromMenu}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="shrink-0">
        <WorkspaceSwitcher />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="hidden shrink-0 sm:inline-flex"
        onClick={onSearchClick}
        title="Search (⌘K)"
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
      </Button>

      <ChanakyaLiveIntelligenceBar appearance="dashboard" />

      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative shrink-0"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <NotificationsPanel />
          </DropdownMenuContent>
        </DropdownMenu>

        <ActivityDialogueQuickAccess />

        <ChanakyaRadarViewSwitcher variant="dashboard" />

        <GlobalChanakyaButton density="compact" />

        <Button variant="ghost" size="icon" className="shrink-0" onClick={toggleTheme}>
          {mounted && (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
        </Button>

        <UserMenu />
      </div>
    </header>
  );
}
