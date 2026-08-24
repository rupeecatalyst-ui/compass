import { CHATGPT_INTEGRATION_ENDPOINT_CAPABILITIES } from "@/lib/chatgpt-integration/constants";
import { createChatGptIntegrationRouteHandlers } from "@/lib/chatgpt-integration/route-handler";
import { composeChatGptEmailStatusDto } from "@server/services/chatgpt-integration/compose-email-status";

const ENDPOINT = "/api/integrations/chatgpt/v1/email-status";

export const { GET, POST, PUT, PATCH, DELETE } = createChatGptIntegrationRouteHandlers(
  ENDPOINT,
  CHATGPT_INTEGRATION_ENDPOINT_CAPABILITIES[ENDPOINT],
  composeChatGptEmailStatusDto,
);
