"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";
import { formatINR } from "@/lib/format-currency";
import type { CustomerProfile } from "@/types/catalyst-one";
import {
  c360AddAddress,
  c360AddBank,
  c360AddContact,
  c360AddEmployment,
  c360AddFamily,
  c360ArchiveOpportunity,
  c360CreateOpportunity,
  c360DeleteAddress,
  c360DeleteBank,
  c360DeleteContact,
  c360DeleteEmployment,
  c360DeleteFamily,
  c360EditAddress,
  c360EditBank,
  c360EditContact,
  c360EditEmployment,
  c360EditFamily,
  c360RefreshFinancial,
  c360SetPrimaryAddress,
  ensureC360PlaceholderSeed,
  getC360Bucket,
  getC360Status,
} from "./providers/customer-360-placeholder-provider";

interface Props {
  customer: CustomerProfile;
  refreshKey: number;
  onRefresh: () => void;
  onSaveProfile: (patch: Partial<CustomerProfile>) => void;
}

export function Customer360OperationalSections({
  customer,
  refreshKey,
  onRefresh,
  onSaveProfile,
}: Props) {
  const [tick, setTick] = useState(0);
  const bump = () => {
    setTick((n) => n + 1);
    onRefresh();
  };

  useEffect(() => {
    ensureC360PlaceholderSeed(customer.id, {
      mobile: customer.mobile,
      email: customer.email,
      addresses: customer.addresses ?? [],
      occupation: customer.occupation,
      employmentType: customer.employmentType,
      incomeBand: customer.incomeBand,
      company: customer.company,
      relationships: customer.relationships ?? [],
      creditScore: customer.creditScore,
    });
    bump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id]);

  const data = getC360Bucket(customer.id);
  const status = getC360Status(customer.id);
  void refreshKey;
  void tick;

  return (
    <div className="space-y-6">
      {status && <p className="text-[10px] text-muted-foreground">{status}</p>}

      <ProfileSection customer={customer} onSaveProfile={onSaveProfile} onRefresh={bump} />
      <ContactsSection customerId={customer.id} contacts={data.contacts} onChange={bump} />
      <AddressesSection customerId={customer.id} addresses={data.addresses} onChange={bump} />
      <EmploymentSection customerId={customer.id} rows={data.employment} onChange={bump} />
      <FamilySection customerId={customer.id} rows={data.family} onChange={bump} />
      <BankSection customerId={customer.id} rows={data.bankAccounts} onChange={bump} />
      <FinancialSection
        customerId={customer.id}
        creditScore={customer.creditScore}
        snapshot={data.financial}
        onChange={bump}
      />
      <OpportunitiesSection customerId={customer.id} rows={data.opportunities} onChange={bump} />
    </div>
  );
}

function SectionShell({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {actions}
      </div>
      {children}
    </section>
  );
}

function ProfileSection({
  customer,
  onSaveProfile,
  onRefresh,
}: {
  customer: CustomerProfile;
  onSaveProfile: (patch: Partial<CustomerProfile>) => void;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email ?? "");
  const [mobile, setMobile] = useState(customer.mobile);
  const [occupation, setOccupation] = useState(customer.occupation);

  useEffect(() => {
    setName(customer.name);
    setEmail(customer.email ?? "");
    setMobile(customer.mobile);
    setOccupation(customer.occupation);
  }, [customer]);

  return (
    <SectionShell
      title="Customer Profile"
      actions={
        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onSaveProfile({ name, email, mobile, occupation });
                setEditing(false);
              }}
            >
              Save
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      }
    >
      {editing ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Mobile" value={mobile} onChange={setMobile} />
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Occupation" value={occupation} onChange={setOccupation} />
        </div>
      ) : (
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <ReadRow label="Name" value={customer.name} />
          <ReadRow label="Mobile" value={customer.mobile} />
          <ReadRow label="Email" value={customer.email ?? "—"} />
          <ReadRow label="Occupation" value={customer.occupation} />
          <ReadRow label="Company" value={customer.company} />
          <ReadRow label="PAN" value={customer.pan} />
        </dl>
      )}
    </SectionShell>
  );
}

function ContactsSection({
  customerId,
  contacts,
  onChange,
}: {
  customerId: string;
  contacts: ReturnType<typeof getC360Bucket>["contacts"];
  onChange: () => void;
}) {
  const [label, setLabel] = useState("Secondary mobile");
  const [value, setValue] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  return (
    <SectionShell title="Contact Information">
      <div className="space-y-2">
        {contacts.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs">
            <div>
              <p className="font-medium">{c.label}</p>
              {editId === c.id ? (
                <Input className="mt-1 h-7" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
              ) : (
                <p className="text-muted-foreground">{c.value}</p>
              )}
            </div>
            <div className="flex gap-1">
              {editId === c.id ? (
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    c360EditContact(customerId, c.id, { value: editValue });
                    setEditId(null);
                    onChange();
                  }}
                >
                  Save
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setEditId(c.id);
                    setEditValue(c.value);
                  }}
                >
                  Edit
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={() => {
                  c360DeleteContact(customerId, c.id);
                  onChange();
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input className="h-8 text-xs" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
        <Input className="h-8 text-xs" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" />
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            if (!value.trim()) return;
            c360AddContact(customerId, {
              label: label || "Contact",
              value: value.trim(),
              kind: value.includes("@") ? "email" : "mobile",
            });
            setValue("");
            onChange();
          }}
        >
          Add
        </Button>
      </div>
    </SectionShell>
  );
}

function AddressesSection({
  customerId,
  addresses,
  onChange,
}: {
  customerId: string;
  addresses: ReturnType<typeof getC360Bucket>["addresses"];
  onChange: () => void;
}) {
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  return (
    <SectionShell title="Addresses">
      <div className="space-y-2">
        {addresses.map((a) => (
          <div key={a.id} className="rounded-lg border border-border px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium capitalize">
                {a.type}
                {a.primary ? " · Primary" : ""}
              </p>
              <div className="flex gap-1">
                {!a.primary && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() => {
                      c360SetPrimaryAddress(customerId, a.id);
                      onChange();
                    }}
                  >
                    Primary address
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    c360EditAddress(customerId, a.id, {
                      line1: `${a.line1} (edited)`,
                    });
                    onChange();
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={() => {
                    c360DeleteAddress(customerId, a.id);
                    onChange();
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
            <p className="mt-1 text-muted-foreground">
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""} · {a.city}, {a.state} {a.pincode}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input className="h-8 text-xs" placeholder="Line 1" value={line1} onChange={(e) => setLine1(e.target.value)} />
        <Input className="h-8 text-xs" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input className="h-8 text-xs" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
        <Input className="h-8 text-xs" placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
      </div>
      <Button
        size="sm"
        className="h-8 text-xs"
        onClick={() => {
          if (!line1.trim() || !city.trim()) return;
          c360AddAddress(customerId, {
            type: "correspondence",
            line1: line1.trim(),
            city: city.trim(),
            state: state.trim() || "—",
            pincode: pincode.trim() || "000000",
          });
          setLine1("");
          setCity("");
          setState("");
          setPincode("");
          onChange();
        }}
      >
        Add
      </Button>
    </SectionShell>
  );
}

function EmploymentSection({
  customerId,
  rows,
  onChange,
}: {
  customerId: string;
  rows: ReturnType<typeof getC360Bucket>["employment"];
  onChange: () => void;
}) {
  const [employer, setEmployer] = useState("");
  const [role, setRole] = useState("");

  return (
    <SectionShell title="Employment / Business">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs">
            <div>
              <p className="font-medium">{r.employerOrBusiness}</p>
              <p className="text-muted-foreground">
                {r.role} · {r.employmentType} · {r.incomeBand}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  c360EditEmployment(customerId, r.id, { role: `${r.role} (updated)` });
                  onChange();
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={() => {
                  c360DeleteEmployment(customerId, r.id);
                  onChange();
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input className="h-8 text-xs" placeholder="Employer / Business" value={employer} onChange={(e) => setEmployer(e.target.value)} />
        <Input className="h-8 text-xs" placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            if (!employer.trim()) return;
            c360AddEmployment(customerId, {
              employerOrBusiness: employer.trim(),
              role: role.trim() || "—",
              employmentType: "Salaried",
              incomeBand: "—",
            });
            setEmployer("");
            setRole("");
            onChange();
          }}
        >
          Add
        </Button>
      </div>
    </SectionShell>
  );
}

function FamilySection({
  customerId,
  rows,
  onChange,
}: {
  customerId: string;
  rows: ReturnType<typeof getC360Bucket>["family"];
  onChange: () => void;
}) {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("Spouse");

  return (
    <SectionShell title="Family Relationships">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs">
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-muted-foreground">
                {r.relation}
                {r.mobile ? ` · ${r.mobile}` : ""}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  c360EditFamily(customerId, r.id, { relation: `${r.relation} (updated)` });
                  onChange();
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={() => {
                  c360DeleteFamily(customerId, r.id);
                  onChange();
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input className="h-8 text-xs" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input className="h-8 text-xs" placeholder="Relation" value={relation} onChange={(e) => setRelation(e.target.value)} />
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            if (!name.trim()) return;
            c360AddFamily(customerId, { name: name.trim(), relation: relation.trim() || "Family" });
            setName("");
            onChange();
          }}
        >
          Add
        </Button>
      </div>
    </SectionShell>
  );
}

function BankSection({
  customerId,
  rows,
  onChange,
}: {
  customerId: string;
  rows: ReturnType<typeof getC360Bucket>["bankAccounts"];
  onChange: () => void;
}) {
  const [bankName, setBankName] = useState("");
  const [masked, setMasked] = useState("");

  return (
    <SectionShell title="Bank Accounts">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs">
            <div>
              <p className="font-medium">
                {r.bankName}
                {r.primary ? " · Primary" : ""}
              </p>
              <p className="text-muted-foreground">
                {r.accountNumberMasked} · {r.ifsc}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  c360EditBank(customerId, r.id, { primary: true });
                  onChange();
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={() => {
                  c360DeleteBank(customerId, r.id);
                  onChange();
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input className="h-8 text-xs" placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        <Input className="h-8 text-xs" placeholder="Masked account" value={masked} onChange={(e) => setMasked(e.target.value)} />
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            if (!bankName.trim()) return;
            c360AddBank(customerId, {
              bankName: bankName.trim(),
              accountNumberMasked: masked.trim() || "XXXXXXXX",
              ifsc: "PLACE000000",
            });
            setBankName("");
            setMasked("");
            onChange();
          }}
        >
          Add
        </Button>
      </div>
    </SectionShell>
  );
}

function FinancialSection({
  customerId,
  creditScore,
  snapshot,
  onChange,
}: {
  customerId: string;
  creditScore?: number;
  snapshot: ReturnType<typeof getC360Bucket>["financial"];
  onChange: () => void;
}) {
  return (
    <SectionShell
      title="Financial Snapshot"
      actions={
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => {
            c360RefreshFinancial(customerId, creditScore);
            onChange();
          }}
        >
          Refresh
        </Button>
      }
    >
      {snapshot ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <ReadRow label="Est. Income" value={formatINR(snapshot.estimatedIncome)} />
          <ReadRow label="Obligations" value={formatINR(snapshot.estimatedObligations)} />
          <ReadRow label="Net Surplus" value={formatINR(snapshot.netSurplus)} />
          <ReadRow label="Credit Score" value={String(snapshot.creditScore)} />
          <ReadRow
            label="Refreshed"
            value={new Date(snapshot.refreshedOn).toLocaleString()}
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No snapshot yet — refresh to generate placeholder figures.</p>
      )}
    </SectionShell>
  );
}

function OpportunitiesSection({
  customerId,
  rows,
  onChange,
}: {
  customerId: string;
  rows: ReturnType<typeof getC360Bucket>["opportunities"];
  onChange: () => void;
}) {
  const [title, setTitle] = useState("");

  return (
    <SectionShell title="Opportunities">
      <div className="space-y-2">
        {rows.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs">
            <div>
              <p className="font-medium">
                {o.title}
                {o.archived ? " · Archived" : ""}
              </p>
              <p className="capitalize text-muted-foreground">{o.stage}</p>
            </div>
            <div className="flex gap-1">
              <Button asChild size="sm" variant="secondary" className="h-7 text-xs">
                <Link href={ROUTES.OPPORTUNITY_WORKSPACE}>Open Workspace</Link>
              </Button>
              {!o.archived && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    c360ArchiveOpportunity(customerId, o.id);
                    onChange();
                  }}
                >
                  Archive
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          className="h-8 max-w-xs text-xs"
          placeholder="Opportunity title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            c360CreateOpportunity(customerId, title.trim() || "New opportunity");
            setTitle("");
            onChange();
          }}
        >
          Create
        </Button>
      </div>
    </SectionShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <Input className="h-8 text-xs" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
