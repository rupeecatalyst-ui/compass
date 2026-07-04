"use client";

import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatInitials } from "@/lib/utils";
import { getFullName } from "@/lib/permissions";
import { ROLE_LABELS } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";

export function UserMenu() {
  const { user, logout } = useAuthContext();

  if (!user) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href={ROUTES.LOGIN}>Sign in</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={getFullName(user)} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {formatInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{getFullName(user)}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <p className="text-xs text-primary">{ROLE_LABELS[user.role]}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={ROUTES.SETTINGS}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={ROUTES.SETTINGS}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void logout()} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
