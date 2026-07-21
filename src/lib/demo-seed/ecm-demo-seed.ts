/**
 * ECM Directory demo seeds — Development Only.
 */

import {
  listEcmContacts,
  registerEcmContact,
  updateEcmContact,
} from "@/lib/enterprise-contact-master";
import { runDemoSeedIfEnabled } from "@/lib/demo-seed/environment";

export function seedEcmContactsDemoIfEmpty(): void {
  runDemoSeedIfEnabled(() => {
    if (listEcmContacts().length > 0) return;
    const seeds = [
      {
        name: "Rahul Kapoor",
        mobilePrimary: "9811100099",
        roles: ["customer" as const],
        strategic: true,
      },
      {
        name: "Amit Shah",
        mobilePrimary: "9811100003",
        roles: ["customer" as const],
        strategic: false,
      },
      {
        name: "Suresh Patel",
        mobilePrimary: "9811100001",
        roles: ["customer" as const],
        strategic: false,
      },
      {
        name: "Priya Nair",
        mobilePrimary: "9811100002",
        roles: ["employee" as const],
        strategic: true,
      },
    ];
    for (const s of seeds) {
      try {
        const created = registerEcmContact({
          name: s.name,
          mobilePrimary: s.mobilePrimary,
          roles: [...s.roles],
          ownerName: "Platform Admin",
          createdBy: "demo-seed",
        });
        if (s.strategic) {
          updateEcmContact(created.id, { strategicContact: true }, "demo-seed");
        }
      } catch {
        /* duplicate mobile */
      }
    }
  });
}
