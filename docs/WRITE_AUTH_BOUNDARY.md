# Command Center server-side write boundary (review only)

The `/api/decisions` POST and `/api/organism-status` PUT handlers previously forwarded anonymous caller-supplied JSON to Supabase using the server's configured `SUPABASE_ANON_KEY`. CORS alone is not authorization: origin-less clients can send the same requests, and the organism status handler also allowed wildcard cross-origin PUT. This allowed unauthenticated attempts to create decisions or replace measured organism/revenue values.

This draft adds a shared, fail-closed server-side authorization gate. Both mutation routes now require `Authorization: Bearer <operator-issued secret>` matching the independent `COMMAND_CENTER_WRITE_TOKEN` environment value. The token must contain at least 32 UTF-8 bytes with no whitespace. It is never supplied by client-side JavaScript, returned in a response, checked into the repository, or reused from `ADMIN_TOKEN`. Missing/short/unconfigured token disables writes (503); absent/incorrect token denies writes (401) before any upstream fetch. Comparison uses Node's constant-time equality when byte lengths match. Cross-origin organism writes require the exact origin to be present in `COMMAND_CENTER_ALLOWED_ORIGINS`, while origin-less server-to-server clients still require the bearer token.

Existing public GETs for organism status and read-only decision replay remain unchanged. Allowed-origin OPTIONS requests are preflight-only, not proof of authorization. Existing interactive dashboard does not submit these writes.

## Operational acceptance gates

1. Provision a distinct high-entropy `COMMAND_CENTER_WRITE_TOKEN` in the server's protected environment and only in authorized upstream writers; do not put it in the PWA, URL, public repository, or browser storage.
2. Restrict `COMMAND_CENTER_ALLOWED_ORIGINS` to exact trusted browser origins. Independently validate Supabase Row Level Security and anon-key grants: direct Supabase REST access must not allow unauthenticated writes even if the application gateway rejects them.
3. Run `npm test` and the exact-commit CI job; the new regression suite performs actual HTTP requests to a loopback-only controlled upstream, NOT live Supabase or production deployment. Verify deployed routes separately before calling the system accepted.
4. Audit the distinct `/api/social` local server router, whose state-mutating endpoints still need an independent authentication/session design. This draft does not claim to secure those routes.

This is an isolated unmerged repair. No provider credentials, paid calls, customer interaction, deployment, or production write was used to create its evidence.
