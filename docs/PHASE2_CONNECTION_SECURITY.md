# Phase 2 Command Center live credential verification and storage repair

The TEST HANDSHAKE action now calls the real server-side API /api/connections/test. Only a positive result from a registered provider tester (GitHub, OpenAI, Stripe, Notion, Slack or Linear) displays VERIFIED. Unknown or untested integrations return HTTP 422, ok:false, verified:false, NOT VERIFIED. Provider authentication does **not** establish a persistent MCP session, and the UI does not pretend it does.

Existing plaintext credentials under localStorage key sas_v3_integrations_creds are deleted when the integrations UI is initialized. No credentials are stored in either localStorage or sessionStorage. Inputs are cleared after the request; browser memory can still contain them during entry, so trusted HTTPS and XSS controls remain essential. Credentials are not available for persistent background work. This PR adds no server-side credential vault.

Set COMMAND_CENTER_ALLOWED_ORIGINS to comma-separated exact origins used by the legitimate website before deployment. Browser requests with unlisted Origin are rejected (403); no wildcard CORS header is returned by the connections or decisions API. CORS is not authentication. The decisions POST operation still requires its own authorization/RLS security review before allowing public mutation.

Run npm ci, npm test, and npm run verify-all. The added test sends actual local HTTP requests to the API handlers and checks unknown ID failure, missing credentials, cross-origin 403 and positive preflight permission. It makes **no** external provider requests and does not claim provider integration verified. Real provider key acceptance requires an independently authorized controlled test, without credentials in logs.
