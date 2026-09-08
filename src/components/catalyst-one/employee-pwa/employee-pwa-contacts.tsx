"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmployeePwaRecordCard } from "@/components/catalyst-one/employee-pwa/employee-pwa-record-card";
import { employeePwaJson } from "@/lib/employee-pwa/api";

type ContactRow = {
  id: string;
  name?: string;
  mobilePrimary?: string;
  createdOn?: string;
};

export function EmployeePwaContacts() {
  const [items, setItems] = useState<ContactRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void employeePwaJson<{ items?: ContactRow[] }>("/api/ecm/contacts?pageSize=40&sortBy=createdOn&sortDir=desc")
      .then((data) => setItems(data.items ?? []))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div data-employee-pwa-contacts="true" className="space-y-3">
      <h1 className="text-xl font-semibold">Contacts</h1>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {items.map((row) => (
        <EmployeePwaRecordCard
          key={row.id}
          href={`/pwa/work/contacts/${row.id}`}
          title={row.name || "Contact"}
          lines={[row.mobilePrimary || "Mobile not specified", row.createdOn || ""]}
        />
      ))}
      <Link className="text-sm text-primary" href="/pwa/create/contact">
        Create Contact
      </Link>
    </div>
  );
}
