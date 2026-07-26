"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Customer360Modal } from "@/components/catalyst-one/customers/customer-360-modal";
import { CustomerColumnSettings } from "@/components/catalyst-one/customers/customer-column-settings";
import { CustomerCreateModal } from "@/components/catalyst-one/customers/customer-create-modal";
import { CustomersCardView } from "@/components/catalyst-one/customers/customers-card-view";
import { CustomersCompactView } from "@/components/catalyst-one/customers/customers-compact-view";
import {
  CustomersProvider,
  useCustomersContext,
} from "@/components/catalyst-one/customers/customers-context";
import { CustomersListView } from "@/components/catalyst-one/customers/customers-list-view";
import { CustomersToolbar } from "@/components/catalyst-one/customers/customers-toolbar";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

function CustomersQuerySync() {
  const searchParams = useSearchParams();
  const { setSelectedCustomerId, setCreateOpen } = useCustomersContext();

  useEffect(() => {
    const customerId = searchParams.get("customer");
    if (customerId) setSelectedCustomerId(customerId);

    const action = searchParams.get("action");
    if (action === "new") setCreateOpen(true);
  }, [searchParams, setSelectedCustomerId, setCreateOpen]);

  return null;
}

function CustomersInner() {
  const { mounted, viewMode } = useCustomersContext();

  if (!mounted) {
    return (
      <ChanakyaLoadingExperience
        module="customers"
        statusLabel="Opening Customers…"
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background -mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8">
      <CustomersQuerySync />
      <div className="px-2 md:px-3 pt-1 shrink-0">
        <CustomersToolbar />
      </div>
      <div className="flex-1 min-h-0 px-2 md:px-3 pb-1">
        {viewMode === "list" && <CustomersListView />}
        {viewMode === "card" && <CustomersCardView />}
        {viewMode === "compact" && <CustomersCompactView />}
      </div>

      <CustomerColumnSettings />
      <CustomerCreateModal />
      <Customer360Modal />
    </div>
  );
}

export function CustomersWorkspace() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="customers"
          statusLabel="Opening Customers…"
        />
      }
    >
      <CustomersProvider>
        <CustomersInner />
      </CustomersProvider>
    </Suspense>
  );
}
