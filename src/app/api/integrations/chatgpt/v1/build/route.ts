import { CHATGPT_INTEGRATION_ENDPOINT_CAPABILITIES } from "@/lib/chatgpt-integration/constants";
import { createChatGptIntegrationRouteHandlers } from "@/lib/chatgpt-integration/route-handler";
import { composeChatGptBuildDto } from "@server/services/chatgpt-integration/compose-build";

const ENDPOINT = "/api/integrations/chatgpt/v1/build";

export const { GET, POST, PUT, PATCH, DELETE } = createChatGptIntegrationRouteHandlers(
  ENDPOINT,
  CHATGPT_INTEGRATION_ENDPOINT_CAPABILITIES[ENDPOINT],
  composeChatGptBuildDto,
);
