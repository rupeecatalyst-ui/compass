"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export function EmployeePwaDashboards() {
  return (
    <div data-employee-pwa-dashboards="true" className="space-y-3">
      <h1 className="text-xl font-semibold">Dashboards</h1>
      <Link className="block min-h-12 rounded-xl border px-3 py-3 text-sm" href="/pwa">
        Personal operational Home
      </Link>
      <Link className="block min-h-12 rounded-xl border px-3 py-3 text-sm" href={ROUTES.DASHBOARD}>
        Desktop User Home
      </Link>
      <Link className="block min-h-12 rounded-xl border px-3 py-3 text-sm" href="/pwa/chanakya/radar">
        CHANAKYA Radar
      </Link>
    </div>
  );
}
