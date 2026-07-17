"use client";

import { PageHeader } from "@/components/design-system/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";
import { useAuthContext } from "@/components/providers/auth-provider";
import { ROLE_LABELS } from "@/constants/roles";
import { getFullName } from "@/lib/permissions";

export default function SettingsPage() {
  const { isDark, setTheme } = useTheme();
  const { user } = useAuthContext();

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage your account and platform preferences" />

      <div className="grid gap-6 max-w-2xl">
        <Card id="profile">
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="text-sm font-medium">{user ? getFullName(user) : "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{user?.email ?? "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Role</Label>
              <p className="text-sm font-medium">{user ? ROLE_LABELS[user.role] : "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card id="preferences">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Personal workspace defaults (expandable over time)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Landing page, language, and notification channel preferences are managed from User
              Management Access Profile when provisioned, and will surface here for self-service.
            </p>
          </CardContent>
        </Card>

        <Card id="notifications">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>How Catalyst One reaches you</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Email, push, and SMS notification controls will consolidate here. Current defaults
              follow your User Account preferences.
            </p>
          </CardContent>
        </Card>

        <Card id="appearance">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how Catalyst One looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Dark mode</Label>
                <p className="text-sm text-muted-foreground">Use dark theme across the platform</p>
              </div>
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
