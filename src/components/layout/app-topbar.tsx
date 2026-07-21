"use client";

import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useSidebar } from "@/hooks/use-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { GlobalChanakyaButton } from "@/components/layout/global-chanakya-assistant";
import { ChanakyaLiveIntelligenceBar } from "@/components/enterprise/chanakya-live-intelligence";
import { ChanakyaRadarViewSwitcher } from "@/components/catalyst-one/chanakya-radar/chanakya-radar-view-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppTopbarProps {
  onSearchClick?: () => void;
}

/**
 * EUX-007 enterprise header layout:
 * Logo/Workspace · Page controls · Live Intelligence · Notifications · Switchers · CHANAKYA AI · Profile
 */
export function AppTopbar({ onSearchClick }: AppTopbarProps) {
  const { toggleTheme, isDark, mounted } = useTheme();
  const { openMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 overflow-hidden border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 lg:px-6">
      {/* Logo / Workspace */}
      <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={openMobile}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="shrink-0">
        <WorkspaceSwitcher />
      </div>

      {/* Page controls — compact search (⌘K); does not take ticker space */}
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

      {/* CHANAKYA Live Intelligence Bar — flex fills remaining width */}
      <ChanakyaLiveIntelligenceBar appearance="dashboard" />

      {/* Actions — never wrap; preserved at all breakpoints */}
      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative shrink-0">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <NotificationsPanel />
          </DropdownMenuContent>
        </DropdownMenu>

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
