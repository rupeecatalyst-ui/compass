"use client";

import { useEffect, useState } from "react";
import { employeePwaJson } from "@/lib/employee-pwa/api";
import { formatEmployeePwaDate } from "@/lib/employee-pwa/source-identity";

type ActivityRow = {
  id?: string;
  title?: string;
  eventKind?: string;
  occurredAt?: string;
  createdAt?: string;
};

export function EmployeePwaActivity() {
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void employeePwaJson<{ items?: ActivityRow[] }>("/api/enterprise-activity?limit=40")
      .then((data) => setItems(data.items ?? []))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div data-employee-pwa-activity="true" className="space-y-3">
      <h1 className="text-xl font-semibold">Activity & Dialogue</h1>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={item.id || String(index)} className="rounded-xl border p-3 text-sm">
            <p className="font-medium">{item.title || item.eventKind}</p>
            <p className="text-xs text-muted-foreground">
              {formatEmployeePwaDate(item.occurredAt || item.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
