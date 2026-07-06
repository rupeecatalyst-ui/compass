"use client";

import { Plus, Search } from "lucide-react";
import {
  CatalystCommandBar,
  CommandBarActionGroup,
  CommandBarActions,
  CommandBarEyebrow,
  CommandBarHeader,
  CommandBarHeaderRow,
  CommandBarIdentity,
} from "@/components/catalyst-one/shared/catalyst-command-bar";
import { CREDIT_RISK_ENGINE_ICON } from "@/config/credit-risk-navigation";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreditRiskCommandBarProps {
  title: string;
  description?: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
}

export function CreditRiskCommandBar({
  title,
  description,
  showSearch = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search policies, lenders, products...",
  actions,
}: CreditRiskCommandBarProps) {
  const Icon = CREDIT_RISK_ENGINE_ICON;

  return (
    <CatalystCommandBar aria-label="Credit & Risk Engine command bar">
      <CommandBarHeader>
        <CommandBarHeaderRow>
          <CommandBarIdentity>
            <CommandBarEyebrow>Admin Console · Credit & Risk Engine</CommandBarEyebrow>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  {title}
                </h1>
                {description && (
                  <p className="text-xs text-muted-foreground sm:text-sm">{description}</p>
                )}
              </div>
              <StatusPill variant="info">SSOT · Policy Admin</StatusPill>
            </div>
          </CommandBarIdentity>
          <CommandBarActions>
            {showSearch && onSearchChange && (
              <div className="relative hidden sm:block w-56 lg:w-72">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 pl-8 text-xs"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            )}
            <CommandBarActionGroup>
              {actions ?? (
                <Button size="sm" className="h-8 text-xs" disabled title="Available in a future sprint">
                  <Plus className="h-3.5 w-3.5" />
                  New Policy
                </Button>
              )}
            </CommandBarActionGroup>
          </CommandBarActions>
        </CommandBarHeaderRow>
      </CommandBarHeader>
    </CatalystCommandBar>
  );
}
