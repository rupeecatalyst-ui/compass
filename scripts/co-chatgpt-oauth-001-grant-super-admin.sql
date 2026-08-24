-- CO-CHATGPT-OAUTH-001 — Grant AI capabilities to approved Super Admin only.
-- Run AFTER migration 20260824120000_co_ai_access_001_user_capabilities is applied.
-- Targets admin@rupeecatalyst.com (bootstrap SUPER_ADMIN). Adjust email if needed.

UPDATE users
SET ai_capabilities_json = jsonb_build_object(
  'AI_ACCESS', true,
  'AI_TEXT', true,
  'AI_VOICE', true,
  'AI_CHANAKYA', true,
  'AI_CATALYST_INTELLIGENCE', true,
  'AI_ACTIONS', false
)
WHERE role = 'SUPER_ADMIN'
  AND is_active = true
  AND email IN ('admin@rupeecatalyst.com', 'admin@compass.com');
