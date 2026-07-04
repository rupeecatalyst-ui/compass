"use client";

import { useAuthContext } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatInitials } from "@/lib/utils";
import { getFullName } from "@/lib/permissions";
import { ROLE_LABELS } from "@/constants/roles";
import { cn } from "@/lib/utils";

interface UserProfileProps {
  collapsed?: boolean;
}

export function UserProfile({ collapsed = false }: UserProfileProps) {
  const { user } = useAuthContext();

  if (!user) {
    return (
      <div className={cn("flex items-center gap-3 rounded-lg p-2", collapsed && "justify-center")}>
        <Avatar className="h-8 w-8">
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Guest</p>
            <p className="text-xs text-muted-foreground truncate">Not signed in</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 rounded-lg p-2", collapsed && "justify-center")}>
      <Avatar className="h-8 w-8">
        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={getFullName(user)} />}
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {formatInitials(user.firstName, user.lastName)}
        </AvatarFallback>
      </Avatar>
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{getFullName(user)}</p>
          <p className="text-xs text-muted-foreground truncate">{ROLE_LABELS[user.role]}</p>
        </div>
      )}
    </div>
  );
}
