"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { employeePwaJson } from "@/lib/employee-pwa/api";

type ContactDetail = {
  id: string;
  name?: string;
  mobilePrimary?: string;
  personalEmail?: string;
  officialEmail?: string;
};

export function EmployeePwaContactDetail() {
  const params = useParams<{ contactId: string }>();
  const [row, setRow] = useState<ContactDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void employeePwaJson<ContactDetail>(`/api/ecm/contacts/${params.contactId}`)
      .then(setRow)
      .catch((err: Error) => setError(err.message));
  }, [params.contactId]);

  if (!row) return <p className="text-sm">{error || "Loading…"}</p>;
  const email = row.officialEmail || row.personalEmail;

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{row.name}</h1>
      <p className="text-sm">{row.mobilePrimary}</p>
      <div className="flex gap-2">
        {row.mobilePrimary ? (
          <Button asChild className="min-h-11">
            <a href={`tel:${row.mobilePrimary}`}>Call</a>
          </Button>
        ) : null}
        {email ? (
          <Button asChild variant="outline" className="min-h-11">
            <a href={`mailto:${email}`}>Email</a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
