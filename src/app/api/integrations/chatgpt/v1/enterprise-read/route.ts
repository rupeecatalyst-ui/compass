import { CHATGPT_INTEGRATION_ENDPOINT_CAPABILITIES } from "@/lib/chatgpt-integration/constants";
import { createChatGptIntegrationRouteHandlers } from "@/lib/chatgpt-integration/route-handler";
import { composeChatGptEnterpriseReadDto } from "@server/services/chatgpt-integration/compose-enterprise-read";

const ENDPOINT = "/api/integrations/chatgpt/v1/enterprise-read";

export const { GET, POST, PUT, PATCH, DELETE } = createChatGptIntegrationRouteHandlers(
  ENDPOINT,
  CHATGPT_INTEGRATION_ENDPOINT_CAPABILITIES[ENDPOINT],
  composeChatGptEnterpriseReadDto,
);
