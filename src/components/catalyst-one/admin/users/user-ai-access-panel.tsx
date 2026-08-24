"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAccessToken } from "@/lib/api-client";
import {
  AI_CAPABILITY_LABELS,
  AI_CAPABILITIES,
} from "@/constants/enterprise-ai-access";
import type { UserAiCapabilitiesDto } from "@/types/enterprise-ai-access";

type Props = {
  userId: string;
  userLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body?.error?.message || `Request failed (${res.status})`);
  }
  return body.data as T;
}

export function UserAiAccessPanel({ userId, userLabel, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caps, setCaps] = useState<UserAiCapabilitiesDto["capabilities"] | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ aiAccess: UserAiCapabilitiesDto }>(
        `/api/admin/users/${userId}/ai-access`,
      );
      setCaps(data.aiAccess.capabilities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI access");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const setCap = (key: keyof UserAiCapabilitiesDto["capabilities"], value: boolean) => {
    setCaps((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      if (key === AI_CAPABILITIES.AI_ACCESS && !value) {
        next.AI_TEXT = false;
        next.AI_VOICE = false;
        next.AI_CHANAKYA = false;
        next.AI_CATALYST_INTELLIGENCE = false;
      }
      next.AI_ACTIONS = false;
      return next;
    });
  };

  const save = async () => {
    if (!caps) return;
    setSaving(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/users/${userId}/ai-access`, {
        method: "PATCH",
        body: JSON.stringify(caps),
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const subCaps = [
    AI_CAPABILITIES.AI_TEXT,
    AI_CAPABILITIES.AI_VOICE,
    AI_CAPABILITIES.AI_CHANAKYA,
    AI_CAPABILITIES.AI_CATALYST_INTELLIGENCE,
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>AI Access — {userLabel}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading AI permissions…
          </div>
        ) : caps ? (
          <div className="space-y-4 py-1">
            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div>
                <Label htmlFor="ai-access-master">AI Access</Label>
                <p className="text-xs text-muted-foreground">
                  Master gate — off by default. Not inherited from role.
                </p>
              </div>
              <Switch
                id="ai-access-master"
                checked={caps.AI_ACCESS}
                onCheckedChange={(v) => setCap(AI_CAPABILITIES.AI_ACCESS, v)}
              />
            </div>

            <div className="space-y-2 rounded-md border px-3 py-2">
              <p className="text-sm font-medium">Capabilities</p>
              {subCaps.map((key) => (
                <div key={key} className="flex items-center justify-between gap-3 py-1">
                  <Label htmlFor={`cap-${key}`}>{AI_CAPABILITY_LABELS[key]}</Label>
                  <Switch
                    id={`cap-${key}`}
                    checked={caps[key]}
                    disabled={!caps.AI_ACCESS}
                    onCheckedChange={(v) => setCap(key, v)}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t pt-2 py-1 opacity-70">
                <div>
                  <Label>{AI_CAPABILITY_LABELS.AI_ACTIONS}</Label>
                  <p className="text-xs text-muted-foreground">
                    AI Actions are not available in Read-Only V1.
                  </p>
                </div>
                <Switch checked={false} disabled />
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving || loading || !caps}>
            {saving ? "Saving…" : "Save AI access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
