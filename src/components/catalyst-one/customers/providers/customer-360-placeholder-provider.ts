/**
 * Customer 360 placeholder action provider.
 * In-memory only — no APIs, database, AI, or Supabase.
 */

export interface C360ContactInfo {
  id: string;
  label: string;
  value: string;
  kind: "mobile" | "email" | "other";
}

export interface C360AddressRecord {
  id: string;
  type: "registered" | "correspondence" | "office";
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  primary: boolean;
}

export interface C360EmploymentRecord {
  id: string;
  employerOrBusiness: string;
  role: string;
  employmentType: string;
  incomeBand: string;
}

export interface C360FamilyRecord {
  id: string;
  name: string;
  relation: string;
  mobile?: string;
}

export interface C360BankAccount {
  id: string;
  bankName: string;
  accountNumberMasked: string;
  ifsc: string;
  primary: boolean;
}

export interface C360FinancialSnapshot {
  estimatedIncome: number;
  estimatedObligations: number;
  netSurplus: number;
  creditScore: number;
  refreshedOn: string;
}

export interface C360OpportunityStub {
  id: string;
  title: string;
  stage: string;
  archived: boolean;
  createdOn: string;
}

export interface C360DocumentMeta {
  previewText: string;
  lastAction?: string;
}

type Bucket = {
  contacts: C360ContactInfo[];
  addresses: C360AddressRecord[];
  employment: C360EmploymentRecord[];
  family: C360FamilyRecord[];
  bankAccounts: C360BankAccount[];
  financial: C360FinancialSnapshot | null;
  opportunities: C360OpportunityStub[];
  documentMeta: Record<string, C360DocumentMeta>;
  lastStatus: string | null;
  seeded: boolean;
};

const store = new Map<string, Bucket>();

function bucket(customerId: string): Bucket {
  let b = store.get(customerId);
  if (!b) {
    b = {
      contacts: [],
      addresses: [],
      employment: [],
      family: [],
      bankAccounts: [],
      financial: null,
      opportunities: [],
      documentMeta: {},
      lastStatus: null,
      seeded: false,
    };
    store.set(customerId, b);
  }
  return b;
}

function status(customerId: string, message: string) {
  bucket(customerId).lastStatus = message;
}

export function getC360Status(customerId: string): string | null {
  return bucket(customerId).lastStatus;
}

export function ensureC360PlaceholderSeed(
  customerId: string,
  seed: {
    mobile: string;
    email?: string;
    addresses: Array<{
      type: C360AddressRecord["type"];
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
    }>;
    occupation: string;
    employmentType?: string;
    incomeBand: string;
    company: string;
    relationships: Array<{ id: string; name: string; relation?: string; mobile?: string; type: string }>;
    creditScore?: number;
  },
): void {
  const b = bucket(customerId);
  if (b.seeded) return;
  b.seeded = true;

  b.contacts = [
    { id: crypto.randomUUID(), label: "Primary mobile", value: seed.mobile, kind: "mobile" },
    ...(seed.email
      ? [{ id: crypto.randomUUID(), label: "Primary email", value: seed.email, kind: "email" as const }]
      : []),
  ];

  b.addresses = seed.addresses.map((a, i) => ({
    id: crypto.randomUUID(),
    ...a,
    primary: i === 0,
  }));

  b.employment = [
    {
      id: crypto.randomUUID(),
      employerOrBusiness: seed.company || "—",
      role: seed.occupation,
      employmentType: seed.employmentType ?? "Salaried",
      incomeBand: seed.incomeBand,
    },
  ];

  b.family = seed.relationships
    .filter((r) => r.type === "family" || r.relation)
    .map((r) => ({
      id: r.id || crypto.randomUUID(),
      name: r.name,
      relation: r.relation ?? r.type,
      mobile: r.mobile,
    }));

  b.bankAccounts = [
    {
      id: crypto.randomUUID(),
      bankName: "HDFC Bank",
      accountNumberMasked: "XXXXXX4321",
      ifsc: "HDFC0001234",
      primary: true,
    },
  ];

  const credit = seed.creditScore ?? 720;
  b.financial = {
    estimatedIncome: 1200000,
    estimatedObligations: 240000,
    netSurplus: 960000,
    creditScore: credit,
    refreshedOn: new Date().toISOString(),
  };

  b.opportunities = [
    {
      id: `opp-stub-${customerId.slice(0, 6)}`,
      title: "Home loan follow-up",
      stage: "processing",
      archived: false,
      createdOn: new Date().toISOString(),
    },
  ];
}

export function getC360Bucket(customerId: string): Bucket {
  return bucket(customerId);
}

/* —— Contacts —— */
export function c360AddContact(customerId: string, input: Omit<C360ContactInfo, "id">): C360ContactInfo {
  const row = { ...input, id: crypto.randomUUID() };
  bucket(customerId).contacts.push(row);
  status(customerId, `Contact added · ${row.label}`);
  return row;
}

export function c360EditContact(
  customerId: string,
  id: string,
  patch: Partial<Omit<C360ContactInfo, "id">>,
): void {
  const list = bucket(customerId).contacts;
  const i = list.findIndex((c) => c.id === id);
  if (i < 0) return;
  list[i] = { ...list[i]!, ...patch };
  status(customerId, `Contact updated · ${list[i]!.label}`);
}

export function c360DeleteContact(customerId: string, id: string): void {
  const b = bucket(customerId);
  b.contacts = b.contacts.filter((c) => c.id !== id);
  status(customerId, "Contact deleted");
}

/* —— Addresses —— */
export function c360AddAddress(
  customerId: string,
  input: Omit<C360AddressRecord, "id" | "primary"> & { primary?: boolean },
): void {
  const b = bucket(customerId);
  const primary = input.primary ?? b.addresses.length === 0;
  if (primary) b.addresses.forEach((a) => (a.primary = false));
  b.addresses.push({ ...input, id: crypto.randomUUID(), primary });
  status(customerId, "Address added");
}

export function c360EditAddress(
  customerId: string,
  id: string,
  patch: Partial<Omit<C360AddressRecord, "id">>,
): void {
  const list = bucket(customerId).addresses;
  const i = list.findIndex((a) => a.id === id);
  if (i < 0) return;
  if (patch.primary) list.forEach((a) => (a.primary = false));
  list[i] = { ...list[i]!, ...patch };
  status(customerId, "Address updated");
}

export function c360DeleteAddress(customerId: string, id: string): void {
  const b = bucket(customerId);
  b.addresses = b.addresses.filter((a) => a.id !== id);
  if (b.addresses.length && !b.addresses.some((a) => a.primary)) {
    b.addresses[0]!.primary = true;
  }
  status(customerId, "Address deleted");
}

export function c360SetPrimaryAddress(customerId: string, id: string): void {
  const list = bucket(customerId).addresses;
  list.forEach((a) => (a.primary = a.id === id));
  status(customerId, "Primary address set");
}

/* —— Employment —— */
export function c360AddEmployment(
  customerId: string,
  input: Omit<C360EmploymentRecord, "id">,
): void {
  bucket(customerId).employment.push({ ...input, id: crypto.randomUUID() });
  status(customerId, "Employment record added");
}

export function c360EditEmployment(
  customerId: string,
  id: string,
  patch: Partial<Omit<C360EmploymentRecord, "id">>,
): void {
  const list = bucket(customerId).employment;
  const i = list.findIndex((e) => e.id === id);
  if (i < 0) return;
  list[i] = { ...list[i]!, ...patch };
  status(customerId, "Employment updated");
}

export function c360DeleteEmployment(customerId: string, id: string): void {
  const b = bucket(customerId);
  b.employment = b.employment.filter((e) => e.id !== id);
  status(customerId, "Employment deleted");
}

/* —— Family —— */
export function c360AddFamily(customerId: string, input: Omit<C360FamilyRecord, "id">): void {
  bucket(customerId).family.push({ ...input, id: crypto.randomUUID() });
  status(customerId, "Family relationship added");
}

export function c360EditFamily(
  customerId: string,
  id: string,
  patch: Partial<Omit<C360FamilyRecord, "id">>,
): void {
  const list = bucket(customerId).family;
  const i = list.findIndex((f) => f.id === id);
  if (i < 0) return;
  list[i] = { ...list[i]!, ...patch };
  status(customerId, "Family relationship updated");
}

export function c360DeleteFamily(customerId: string, id: string): void {
  const b = bucket(customerId);
  b.family = b.family.filter((f) => f.id !== id);
  status(customerId, "Family relationship deleted");
}

/* —— Bank —— */
export function c360AddBank(customerId: string, input: Omit<C360BankAccount, "id" | "primary"> & { primary?: boolean }): void {
  const b = bucket(customerId);
  const primary = input.primary ?? b.bankAccounts.length === 0;
  if (primary) b.bankAccounts.forEach((a) => (a.primary = false));
  b.bankAccounts.push({ ...input, id: crypto.randomUUID(), primary });
  status(customerId, "Bank account added");
}

export function c360EditBank(
  customerId: string,
  id: string,
  patch: Partial<Omit<C360BankAccount, "id">>,
): void {
  const list = bucket(customerId).bankAccounts;
  const i = list.findIndex((a) => a.id === id);
  if (i < 0) return;
  if (patch.primary) list.forEach((a) => (a.primary = false));
  list[i] = { ...list[i]!, ...patch };
  status(customerId, "Bank account updated");
}

export function c360DeleteBank(customerId: string, id: string): void {
  const b = bucket(customerId);
  b.bankAccounts = b.bankAccounts.filter((a) => a.id !== id);
  status(customerId, "Bank account deleted");
}

/* —— Financial —— */
export function c360RefreshFinancial(customerId: string, creditScore?: number): C360FinancialSnapshot {
  const b = bucket(customerId);
  const baseIncome = 900000 + Math.round(Math.random() * 600000);
  const obligations = Math.round(baseIncome * 0.2);
  const snap: C360FinancialSnapshot = {
    estimatedIncome: baseIncome,
    estimatedObligations: obligations,
    netSurplus: baseIncome - obligations,
    creditScore: creditScore ?? b.financial?.creditScore ?? 700,
    refreshedOn: new Date().toISOString(),
  };
  b.financial = snap;
  status(customerId, "Financial snapshot refreshed (placeholder)");
  return snap;
}

/* —— Documents meta —— */
export function c360PreviewDocument(customerId: string, docId: string, name: string): string {
  const meta = bucket(customerId).documentMeta;
  if (!meta[docId]) {
    meta[docId] = { previewText: `Placeholder preview · ${name}` };
  }
  meta[docId]!.lastAction = "preview";
  status(customerId, `Preview · ${name}`);
  return meta[docId]!.previewText;
}

export function c360DownloadDocument(customerId: string, docId: string, name: string): string {
  status(customerId, `Download simulated · ${name}`);
  return `${name.replace(/\s+/g, "-").toLowerCase()}.placeholder.pdf`;
}

/* —— Opportunities —— */
export function c360CreateOpportunity(customerId: string, title: string): C360OpportunityStub {
  const row: C360OpportunityStub = {
    id: crypto.randomUUID(),
    title: title || "New opportunity",
    stage: "intake",
    archived: false,
    createdOn: new Date().toISOString(),
  };
  bucket(customerId).opportunities.unshift(row);
  status(customerId, `Opportunity created · ${row.title}`);
  return row;
}

export function c360ArchiveOpportunity(customerId: string, id: string): void {
  const list = bucket(customerId).opportunities;
  const i = list.findIndex((o) => o.id === id);
  if (i < 0) return;
  list[i] = { ...list[i]!, archived: true };
  status(customerId, "Opportunity archived (placeholder)");
}
