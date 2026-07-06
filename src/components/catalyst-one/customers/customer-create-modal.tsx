"use client";

import { useState } from "react";
import { LEAD_SOURCES } from "@/constants/customer-360";
import { CUSTOMER_TAGS } from "@/constants/customer-360";
import { relationshipManagers } from "@/data/catalyst-one/customer-360-seed";
import { useCustomersContext } from "@/components/catalyst-one/customers/customers-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomerProfile, CustomerTag } from "@/types/catalyst-one";
import { feedback } from "@/lib/action-feedback";

export function CustomerCreateModal() {
  const { createOpen, setCreateOpen, addCustomer, openCustomer } = useCustomersContext();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [company, setCompany] = useState("");
  const [rm, setRm] = useState(relationshipManagers[0]!);
  const [leadSource, setLeadSource] = useState<string>(LEAD_SOURCES[0]);
  const [tag, setTag] = useState<CustomerTag>("MSME");

  const reset = () => {
    setName("");
    setMobile("");
    setEmail("");
    setCity("");
    setCompany("");
  };

  const handleCreate = () => {
    if (!name.trim() || !mobile.trim() || !city.trim()) return;
    const id = `c-new-${Date.now()}`;
    const now = new Date().toISOString();
    const profile: CustomerProfile = {
      id,
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim() || undefined,
      city: city.trim(),
      state,
      employmentType: "Salaried",
      loanProduct: "Personal Loan",
      lender: "HDFC Bank",
      loanAmount: 25_00_000,
      status: "active",
      relationshipManager: rm,
      createdAt: now,
      company: company.trim() || `${name.trim()} Associates`,
      pan: "NEWXXXXXX",
      aadhaar: "XXXX-XXXX-0000",
      occupation: "Salaried Professional",
      incomeBand: "₹10–25 LPA",
      leadSource,
      tags: [tag],
      health: "healthy",
      relationshipScore: 60,
      isActive: true,
      lastContact: now,
      customerSince: now,
      addresses: [
        {
          type: "registered",
          line1: "New customer address",
          city: city.trim(),
          state,
          pincode: "400001",
        },
      ],
      relationships: [],
      documents: [],
      timeline: [
        {
          id: `tl-${id}-0`,
          title: "Customer onboarded",
          description: "Added to Customer Relationship Centre",
          timestamp: now,
          type: "note",
          actor: rm,
        },
      ],
      notes: [],
    };
    addCustomer(profile);
    reset();
    setCreateOpen(false);
    feedback.customerCreated();
    openCustomer(id);
  };

  return (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
          <DialogDescription>Create a new customer relationship profile.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="c-name">Full Name / Company</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-company">Company (optional)</Label>
            <Input id="c-company" value={company} onChange={(e) => setCompany(e.target.value)} className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="c-mobile">Mobile</Label>
              <Input id="c-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} className="h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="c-city">City</Label>
              <Input id="c-city" value={city} onChange={(e) => setCity(e.target.value)} className="h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-state">State</Label>
              <Input id="c-state" value={state} onChange={(e) => setState(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Relationship Manager</Label>
              <Select value={rm} onValueChange={setRm}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {relationshipManagers.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Lead Source</Label>
              <Select value={leadSource} onValueChange={setLeadSource}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Tag</Label>
            <Select value={tag} onValueChange={(v) => setTag(v as CustomerTag)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CUSTOMER_TAGS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Customer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
