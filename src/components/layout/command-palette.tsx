"use client";

import { useRouter } from "next/navigation";
import { Clock, LayoutDashboard, Palette, Settings } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { recentPages } from "@/config/navigation";
import { ROUTES } from "@/constants/routes";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickNav = [
  { title: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { title: "Design System", href: ROUTES.DESIGN_SYSTEM, icon: Palette },
  { title: "Settings", href: ROUTES.SETTINGS, icon: Settings },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  const navigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick Navigation">
          {quickNav.map((item) => (
            <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
              <CommandShortcut>↵</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Recent">
          {recentPages.map((page) => (
            <CommandItem key={page.href} onSelect={() => navigate(page.href)}>
              <Clock className="mr-2 h-4 w-4" />
              {page.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
