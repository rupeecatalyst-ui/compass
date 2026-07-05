import type { DigitalSignature } from "@/types/organization";

export const digitalSignaturesSeed: DigitalSignature[] = [
  {
    id: "sig-001",
    person: "Rajesh Mehta",
    designation: "Managing Director",
    status: "active",
    expiry: "2026-12-15",
    initials: "RM",
  },
  {
    id: "sig-002",
    person: "Priya Sharma",
    designation: "Executive Director",
    status: "expiring",
    expiry: "2025-09-30",
    initials: "PS",
  },
  {
    id: "sig-003",
    person: "Anil Desai",
    designation: "Independent Director",
    status: "active",
    expiry: "2027-03-22",
    initials: "AD",
  },
];
