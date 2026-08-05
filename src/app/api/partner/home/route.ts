import {

  partnerError,

  partnerOptionsResponse,

  partnerSuccess,

  requirePartnerAccessToken,

} from "@/lib/api/partner-route-utils";

import { partnerHomeService } from "@server/services/partner-gateway/partner-home.service";



/** CO-WP-103 — Partner Home Dashboard (Enterprise projection). */

export async function OPTIONS(request: Request) {

  return partnerOptionsResponse(request);

}



export async function GET(request: Request) {

  try {

    const actor = requirePartnerAccessToken(request);

    const dashboard = await partnerHomeService.getHomeDashboard(

      actor.userId,

      actor.partnerId,

    );

    return partnerSuccess(request, dashboard);

  } catch (err) {

    return partnerError(request, err);

  }

}


