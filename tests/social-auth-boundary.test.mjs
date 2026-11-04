import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const express = require('express');
const { createSocialControlPlane } = require('../social-control-plane.js');
const { signState } = require('../social-oauth.js');
const { tokenConfigured, authorized } = require('../social-auth.js');

const TOKEN = 'operator-social-token-32-bytes-minimum-2026';
const oauthEnv = {
  SOCIAL_CONTROL_TOKEN: TOKEN,
  SOCIAL_OAUTH_STATE_SECRET: 'only-for-local-test-state-signing',
  SOCIAL_YOUTUBE_CLIENT_ID: 'local-test-client',
  SOCIAL_YOUTUBE_CLIENT_SECRET: 'local-test-secret',
  SOCIAL_YOUTUBE_REDIRECT_URI: 'https://example.test/api/social/oauth/youtube/callback'
};

async function harness(t, env) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'social-boundary-'));
  const app = express();
  app.use(express.json());
  const plane = createSocialControlPlane({ statePath: path.join(dir, 'state.json'), env });
  app.use('/api/social', plane.router);
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const base = 'http://127.0.0.1:' + server.address().port + '/api/social';
  const request = (route, options = {}) => fetch(base + route, { redirect: 'manual', ...options });
  return { request, plane };
}

const bearer = (token = TOKEN) => ({ authorization: 'Bearer ' + token });

test('dedicated social token is required and never falls back to ADMIN_TOKEN', async t => {
  assert.equal(tokenConfigured({ ADMIN_TOKEN: TOKEN }), false);
  assert.equal(tokenConfigured({ SOCIAL_CONTROL_TOKEN: 'short' }), false);
  assert.equal(tokenConfigured({ SOCIAL_CONTROL_TOKEN: TOKEN }), true);
  assert.equal(authorized({ headers: bearer() }, { SOCIAL_CONTROL_TOKEN: TOKEN }), true);
  assert.equal(authorized({ headers: bearer(TOKEN + 'x') }, { SOCIAL_CONTROL_TOKEN: TOKEN }), false);
  const { request } = await harness(t, { ADMIN_TOKEN: TOKEN });
  const get = await request('/status');
  assert.equal(get.status, 503);
  assert.equal(get.headers.get('cache-control'), 'no-store');
  const write = await request('/posts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ networks: ['x'] }) });
  assert.equal(write.status, 503);
});

test('all social reads, writes and metrics fail closed without correct bearer', async t => {
  const { request } = await harness(t, oauthEnv);
  for (const route of ['/status', '/accounts', '/posts', '/metrics', '/receipts', '/metrics/config', '/oauth/youtube/connect']) {
    const r = await request(route);
    assert.equal(r.status, 401, route);
    assert.equal(r.headers.get('www-authenticate'), 'Bearer');
  }
  assert.equal((await request('/status?token=' + TOKEN)).status, 401);
  assert.equal((await request('/status', { headers: bearer(TOKEN + 'x') })).status, 401);
  assert.equal((await request('/status', { headers: { authorization: 'Basic ' + TOKEN } })).status, 401);
  assert.equal((await request('/oauth/youtube/callback', { method: 'OPTIONS' })).status, 401);
  const unauthorized = await request('/accounts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ network: 'x' }) });
  assert.equal(unauthorized.status, 401);
  assert.deepEqual(await (await request('/accounts', { headers: bearer() })).json(), []);
  const metricWrite = await request('/metrics/config', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ weights: { holdRate: 1 } }) });
  assert.equal(metricWrite.status, 401);
});

test('authorized local HTTP API preserves queue mutations and read-only inspection', async t => {
  const { request } = await harness(t, oauthEnv);
  assert.equal((await request('/status', { headers: bearer() })).status, 200);
  const post = await request('/posts', { method: 'POST', headers: { ...bearer(), 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Local only', networks: ['x'] }) });
  assert.equal(post.status, 201);
  const created = await post.json();
  assert.equal(created.title, 'Local only');
  const queue = await (await request('/posts', { headers: bearer() })).json();
  assert.equal(queue.some(item => item.id === created.id), true);
  assert.equal((await request('/posts/' + created.id, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'published' }) })).status, 401);
  const persisted = await (await request('/posts', { headers: bearer() })).json();
  assert.equal(persisted.find(item => item.id === created.id).status, created.status);
});

test('OAuth initiation requires operator; callback rejects forged signed state without provider calls', async t => {
  const { request } = await harness(t, oauthEnv);
  const denied = await request('/oauth/youtube/connect');
  assert.equal(denied.status, 401);
  const started = await request('/oauth/youtube/connect', { headers: bearer() });
  assert.equal(started.status, 200);
  const response = await started.json();
  const destination = new URL(response.url);
  assert.equal(destination.protocol, 'https:');
  assert.equal(destination.hostname, 'accounts.google.com');
  const issuedState = destination.searchParams.get('state');
  assert.ok(issuedState);
  const bad = signState({ network: 'youtube', ts: Date.now(), nonce: 'forged-not-issued' }, oauthEnv);
  assert.equal((await request('/oauth/youtube/callback?state=' + encodeURIComponent(bad) + '&code=not-exchanged')).status, 400);
  assert.equal((await request('/oauth/youtube/callback?state=invalid&code=not-exchanged')).status, 400);
  assert.equal((await request('/oauth/youtube/callback?state=' + encodeURIComponent(issuedState))).status, 400);
  // No callback with a valid authorization code is exercised: that would contact a real provider.
});
