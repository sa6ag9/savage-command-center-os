# Savage Social Control Plane

Internal distribution surface for Savage AI Studios. This is part of Command Center, not a separate commercial product.

## Purpose

Own the queue, account registry, scheduling state, and evidence receipts for social distribution without depending on a paid scheduler as the source of truth.

Supported destination slots:
- Instagram
- YouTube
- X
- LinkedIn
- Reddit

## Security model

OAuth client IDs and secrets are environment variables only. Never commit access tokens, refresh tokens, passwords, or platform secrets.

Environment naming:
- SOCIAL_INSTAGRAM_CLIENT_ID / SOCIAL_INSTAGRAM_CLIENT_SECRET
- SOCIAL_YOUTUBE_CLIENT_ID / SOCIAL_YOUTUBE_CLIENT_SECRET
- SOCIAL_X_CLIENT_ID / SOCIAL_X_CLIENT_SECRET
- SOCIAL_LINKEDIN_CLIENT_ID / SOCIAL_LINKEDIN_CLIENT_SECRET
- SOCIAL_REDDIT_CLIENT_ID / SOCIAL_REDDIT_CLIENT_SECRET
- optional SOCIAL_<NETWORK>_REDIRECT_URI
- optional SOCIAL_STATE_PATH
- optional SOCIAL_TIMEZONE, default America/Los_Angeles

## Operator authorization boundary (review-only)

The HTTP social control plane is **not public**. Configure a dedicated
`SOCIAL_CONTROL_TOKEN` of at least 32 UTF-8 bytes without whitespace in
the server environment. This is separate from WebSocket `ADMIN_TOKEN`,
OAuth state signing, and provider OAuth client credentials. Missing or short
configuration returns HTTP 503. All social reads, account/queue/metric writes,
publish-attempt receipts and OAuth initiation require
`Authorization: Bearer <operator token>`; invalid or missing authorization
returns HTTP 401. Neither cookies nor query parameters are accepted as credentials.

The browser's accessible **Operator access** field holds the credential only
in the page's JavaScript memory, never localStorage, sessionStorage, URL,
or a cookie. Reloads and OAuth round trips require unlocking again.
The OAuth initiation endpoint returns a provider URL to an authenticated
browser request, rather than redirecting an anonymous GET. Only the provider
callback is anonymously reachable; its HMAC-signed state must have been
created by an authenticated initiation in this same running process and is
single-use. A server restart invalidates pending OAuth flows. A multi-instance
deployment needs a shared atomic, expiring nonce store before enabling OAuth
across instances. No callback or provider interaction is part of CI.

**Deployment gate:** TLS must be terminated by a trusted HTTPS edge before
the browser sends this bearer credential. Do not expose the Node HTTP listener
directly to the public internet. Provision the secret through the host's
private environment/secret store, rotate it on exposure, verify reverse-proxy
routing, and independently inspect production authorization before acceptance.
The current review branch does not deploy or configure production secrets.
Local loopback HTTP tests validate only the handler boundary, not TLS,
host custody, provider OAuth completion or actual publication.

## API

Mounted at /api/social.

- GET /status
- GET/POST /accounts
- GET/POST /posts
- PATCH /posts/:id
- POST /posts/:id/publish-attempt
- GET /receipts

The publish-attempt endpoint is intentionally truth-locked. Until a real OAuth provider adapter is configured, it records a blocked or connector-ready receipt and does not claim publication.

## Next implementation slice

Add official OAuth flows and provider adapters one network at a time, beginning with the existing Savage AI Studios Instagram, YouTube, and X identities. Then import the Video Studio 50-post first wave into this queue.


## Savage growth math

The control plane stores raw normalized rates separately from the derived score. Current default inputs are hold rate, completion rate, rewatch rate, share rate, save rate, comment rate, follow rate, click rate, and revenue rate.

Weights are operator-editable and automatically normalized to sum to 1. The current default weighting intentionally emphasizes hold/completion, shares/saves, follows, and direct commercial signal more than comments.

The dashboard exposes three diagnostic composites: depth (hold + completion + rewatch), signal density (shares + saves + comments + follows + clicks), and commercial (clicks + revenue).

The overall Savage Growth Score is a 0-100 weighted score. Current operating bands are scale >= 70, iterate >= 50, test >= 30, cut < 30. These are internal decision rules, not external benchmark claims, and can be changed as evidence accumulates.

Metrics endpoints:
- GET /api/social/metrics/config
- PUT /api/social/metrics/config
- GET /api/social/metrics
- POST /api/social/metrics
