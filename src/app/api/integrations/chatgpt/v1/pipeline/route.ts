import { CHATGPT_INTEGRATION_ENDPOINT_CAPABILITIES } from "@/lib/chatgpt-integration/constants";
import { createChatGptIntegrationRouteHandlers } from "@/lib/chatgpt-integration/route-handler";
import { composeChatGptPipelineDto } from "@server/services/chatgpt-integration/compose-pipeline";

const ENDPOINT = "/api/integrations/chatgpt/v1/pipeline";

export const { GET, POST, PUT, PATCH, DELETE } = createChatGptIntegrationRouteHandlers(
  ENDPOINT,
  CHATGPT_INTEGRATION_ENDPOINT_CAPABILITIES[ENDPOINT],
  composeChatGptPipelineDto,
);
