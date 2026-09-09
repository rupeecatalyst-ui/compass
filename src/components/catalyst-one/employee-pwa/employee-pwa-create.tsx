"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/components/providers/auth-provider";
import { EMPLOYEE_PWA_CANONICAL_LEAD_OBJECTS_EXIST, EMPLOYEE_PWA_OFFLINE_MUTATION_BLOCKED } from "@/constants/employee-pwa";
import { employeePwaIsOnline, employeePwaJson } from "@/lib/employee-pwa/api";
import { registerEteTask, registerChanakyaTaskMonitoring } from "@/lib/enterprise-task-engine";

export function EmployeePwaCreate({ intent }: { intent?: "contact" | "opportunity" | "task" }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const [mode, setMode] = useState<"contact" | "opportunity" | "task">(intent || "contact");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<Array<{ id: string; name?: string; label?: string }>>([]);

  useEffect(() => {
    void employeePwaJson<{ items?: Array<{ id: string; name?: string; label?: string }> }>(
      "/api/product-registry/products?presentation=canonical&pageSize=50",
    )
      .then((data) => setProducts(data.items ?? []))
      .catch(() => undefined);
  }, []);

  const submitContact = async (form: FormData) => {
    if (!employeePwaIsOnline()) throw new Error(EMPLOYEE_PWA_OFFLINE_MUTATION_BLOCKED);
    const created = await employeePwaJson<{ id?: string }>("/api/ecm/contacts", {
      method: "POST",
      body: JSON.stringify({
        name: String(form.get("name") || ""),
        mobilePrimary: String(form.get("mobile") || ""),
        primaryRole: "customer",
        roles: ["customer"],
      }),
    });
    if (created.id) router.push(`/pwa/work/contacts/${created.id}`);
  };

  const submitOpportunity = async (form: FormData) => {
    if (!employeePwaIsOnline()) throw new Error(EMPLOYEE_PWA_OFFLINE_MUTATION_BLOCKED);
    const created = await employeePwaJson<{ id?: string }>("/api/enterprise-opportunities", {
      method: "POST",
      body: JSON.stringify({
        createAsDraft: true,
        primaryContactId: String(form.get("contactId") || ""),
        primaryContactName: String(form.get("contactName") || ""),
        productId: String(form.get("productId") || "") || undefined,
      }),
    });
    if (created.id) router.push(`/pwa/work/opportunities/${created.id}`);
  };

  const submitTask = async (form: FormData) => {
    if (!employeePwaIsOnline()) throw new Error(EMPLOYEE_PWA_OFFLINE_MUTATION_BLOCKED);
    const contactId = String(form.get("entityId") || "");
    const task = registerEteTask({
      taskType: "independent",
      predefinedDescription: "Follow-up Documents",
      title: String(form.get("title") || "Follow-up"),
      description: String(form.get("description") || ""),
      assigneeRef: user?.id || "user:unknown",
      assignedByRef: user?.id,
      dueOn: String(form.get("dueOn") || new Date().toISOString()),
      priority: "medium",
      commitmentLevel: "moderate",
      category: "workflow",
      createdBy: user?.id || "user:unknown",
      chanakyaMonitoring: true,
      contactId,
      entityKind: "Customer",
      entityId: contactId,
      entityLabel: String(form.get("entityLabel") || "Contact"),
    });
    registerChanakyaTaskMonitoring(task);
    router.push("/pwa/work/tasks");
  };

  return (
    <div data-employee-pwa-create="true" className="space-y-4">
      <h1 className="text-xl font-semibold">Create</h1>
      <p className="text-xs text-muted-foreground">
        Uses existing Catalyst One APIs and validations. Offline changes are not queued.
      </p>
      {!EMPLOYEE_PWA_CANONICAL_LEAD_OBJECTS_EXIST ? (
        <p className="text-xs text-muted-foreground">
          Canonical Lead objects are not a separate registry. Use Opportunity (Dialogue) instead.
        </p>
      ) : null}
      <div className="flex gap-2">
        {(["contact", "opportunity", "task"] as const).map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={mode === item ? "default" : "outline"}
            className="min-h-11 capitalize"
            onClick={() => setMode(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {mode === "contact" ? (
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              await submitContact(new FormData(event.currentTarget));
            } catch (err) {
              setError(err instanceof Error ? err.message : "Contact could not be created.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" required className="min-h-11" />
          <Label htmlFor="mobile">Mobile</Label>
          <Input id="mobile" name="mobile" required inputMode="tel" className="min-h-11" />
          <Button type="submit" disabled={busy} className="min-h-11 w-full">
            Save Contact
          </Button>
        </form>
      ) : null}

      {mode === "opportunity" ? (
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              await submitOpportunity(new FormData(event.currentTarget));
            } catch (err) {
              setError(err instanceof Error ? err.message : "Opportunity could not be created.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Label htmlFor="contactId">Contact ID</Label>
          <Input id="contactId" name="contactId" required className="min-h-11" />
          <Label htmlFor="contactName">Customer name</Label>
          <Input id="contactName" name="contactName" required className="min-h-11" />
          <Label htmlFor="productId">Product</Label>
          <select
            id="productId"
            name="productId"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select later</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.label || product.name || product.id}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={busy} className="min-h-11 w-full">
            Start Dialogue Opportunity
          </Button>
        </form>
      ) : null}

      {mode === "task" ? (
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              await submitTask(new FormData(event.currentTarget));
            } catch (err) {
              setError(err instanceof Error ? err.message : "Task could not be created.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Label htmlFor="title">Task name</Label>
          <Input id="title" name="title" required className="min-h-11" />
          <Label htmlFor="entityId">Linked Contact ID</Label>
          <Input id="entityId" name="entityId" required className="min-h-11" />
          <Label htmlFor="entityLabel">Linked name</Label>
          <Input id="entityLabel" name="entityLabel" required className="min-h-11" />
          <Label htmlFor="dueOn">Due</Label>
          <Input id="dueOn" name="dueOn" type="datetime-local" className="min-h-11" />
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" className="min-h-24" />
          <Button type="submit" disabled={busy} className="min-h-11 w-full">
            Create Task
          </Button>
        </form>
      ) : null}
    </div>
  );
}
