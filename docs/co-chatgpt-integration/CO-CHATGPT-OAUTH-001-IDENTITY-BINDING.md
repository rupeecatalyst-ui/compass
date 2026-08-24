# CO-CHATGPT-OAUTH-001 — ChatGPT Identity Binding (OAuth)

**Status:** Implementation complete (local) · **Awaiting Product Owner approval**  
**Do NOT deploy** · **Do NOT configure real ChatGPT connector yet**

## Problem

ChatGPT GPT Actions cannot require users to manually paste a Catalyst One employee session JWT.  
Channel security (`X-ChatGPT-Integration-Key`) remains required, but **user identity** must bind through a standard OAuth consent flow.

## Existing infrastructure reused

| Component | Path | Reuse |
|-----------|------|-------|
| Employee JWT signing | `server/services/token.service.ts` | **Consent only** (browser login → approve) |
| Partner audience segregation | `server/services/partner-gateway/partner-token.service.ts` | **Pattern** for integration JWT |
| Prisma auth + AI capabilities | `CO-AI-ACCESS-001` | Unchanged enforcement |
| Pilot org resolution | `resolvePilotOrganizationId()` | Org binding in token + request gate |

**No prior OAuth server existed.** This adds a dedicated OAuth lane without replacing employee or partner auth.

## Recommended architecture

```text
ChatGPT (PKCE)
  → GET /api/integrations/chatgpt/v1/oauth/authorize
  → Browser /integrations/chatgpt/oauth (Catalyst One login + consent)
  → POST /api/integrations/chatgpt/v1/oauth/consent  (employee JWT, one-time)
  → Redirect to ChatGPT with ?code=
  → POST /api/integrations/chatgpt/v1/oauth/token  (code + code_verifier + client_secret)
  → Short-lived integration JWT (aud=catalyst_one_chatgpt)
  → GET /api/integrations/chatgpt/v1/*  (+ X-ChatGPT-Integration-Key + Bearer integration JWT)
  → AI capability checks + org scope + read-only compose
```

## Token model

| Claim | Value |
|-------|--------|
| `aud` | `catalyst_one_chatgpt` |
| `typ` | `chatgpt_integration_access` |
| TTL | 30 minutes |
| `userId` | Authenticated employee |
| `organizationId` | Pilot org at consent time |
| `scopes` | Derived from user AI capabilities |

### Scopes (V1 — read only)

| Scope | Requires |
|-------|----------|
| `chatgpt:read` | `AI_ACCESS` + `AI_TEXT` + `AI_CATALYST_INTELLIGENCE` |
| `chatgpt:chanakya` | Above + `AI_CHANAKYA` |

**No write / action scopes.** `AI_ACTIONS` remains unavailable.

## Isolation

- `verifyAccessToken()` rejects integration tokens → employee APIs blocked  
- `verifyPartnerAccessToken()` rejects integration tokens (wrong audience)  
- Integration routes reject employee JWTs → `EMPLOYEE_TOKEN_NOT_ALLOWED`  
- Integration tokens accepted **only** via `verifyChatGptIntegrationAccessToken()` on `/api/integrations/chatgpt/v1/*`

## Environment variables (not set in repo)

```env
CHATGPT_OAUTH_CLIENT_ID=
CHATGPT_OAUTH_CLIENT_SECRET=
CHATGPT_OAUTH_REDIRECT_URIS=https://chat.openai.com/aip/oauth/callback
CHATGPT_INTEGRATION_API_KEY=
```

## Manual configuration (post-approval)

1. Generate OAuth client id/secret on Hostinger secrets store  
2. Register ChatGPT/OpenAI redirect URI in `CHATGPT_OAUTH_REDIRECT_URIS`  
3. Configure GPT Action OAuth in OpenAI using OpenAPI security scheme  
4. Grant AI capabilities per user in Admin → Users → AI Access  
5. **Do not** connect production connector until PO BAT

## Verification

```bash
npm run verify:co-chatgpt-oauth-001
npm run verify:co-ai-access-001
npm run verify:co-chatgpt-integration-v1
npx tsc --noEmit
npm run build
```

## Security notes

- Authorization codes are single-use, 5-minute TTL, PKCE S256 required  
- Pending OAuth requests expire in 10 minutes  
- In-memory code store is acceptable for single-instance pilot; Redis recommended before multi-instance production  
- Employee JWT never leaves consent exchange for API calls  
- No `userId` query params; spoof headers rejected (existing guard)
