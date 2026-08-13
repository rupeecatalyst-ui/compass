/**
 * CO-MARKETING-MKT-11 — Live ECM identity resolution (calls existing ECM APIs only).
 * Does not change Contact Registry architecture. Default handoff mode remains fixture.
 */

import { normalizePersonName } from "@/lib/enterprise-contact-master/name-normalize";
import type { MarketingIdentityResolutionPort } from "@/lib/enterprise-marketing-engine/ports/qualification-handoff.port";
import {
  normalizeMarketingMatchEmail,
  normalizeMarketingMatchPhone,
} from "@/lib/enterprise-marketing-engine/qualification/match-identity";
import { ecmContactRepository } from "@server/repositories/ecm/contact.repository";
import { ecmContactService } from "@server/services/ecm/contact.service";

export function createLiveIdentityResolutionPort(): MarketingIdentityResolutionPort {
  return {
    async matchOrCreate(input) {
      const email = normalizeMarketingMatchEmail(input.email);
      const phone = normalizeMarketingMatchPhone(input.phone);
      if (!email && !phone) {
        throw Object.assign(new Error("Email or phone is required to resolve a Contact"), {
          statusCode: 400,
          code: "IDENTITY_REQUIRED",
        });
      }

      if (email) {
        const byEmail = await ecmContactRepository.findByOfficialEmail(input.organizationId, email);
        if (byEmail) {
          return {
            contactId: byEmail.id,
            created: false,
            matchedBy: "email",
            name: byEmail.name,
          };
        }
      }
      if (phone) {
        const byPhone = await ecmContactRepository.findByMobile(input.organizationId, phone);
        if (byPhone) {
          return {
            contactId: byPhone.id,
            created: false,
            matchedBy: "phone",
            name: byPhone.name,
          };
        }
      }

      if (!phone) {
        throw Object.assign(
          new Error("Progressive Contact create requires a mobile number when no existing Contact matches."),
          { statusCode: 400, code: "MOBILE_REQUIRED_FOR_CREATE" },
        );
      }

      const created = await ecmContactService.register({
        name: normalizePersonName(input.name) || "Marketing recipient",
        mobilePrimary: phone,
        personalEmail: email ?? undefined,
        officialEmail: email ?? undefined,
        createdBy: input.actorUserId,
        roles: ["customer"],
        status: "provisional",
      });
      return {
        contactId: created.id,
        created: true,
        matchedBy: "created",
        name: created.name,
      };
    },
  };
}
