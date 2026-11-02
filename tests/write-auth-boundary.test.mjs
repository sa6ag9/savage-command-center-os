import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { authorizedWrite, writeTokenConfigured } from '../api/_write-auth.mjs';

// Real loopback HTTP integration only. This is NOT a live Supabase or customer
// receipt and must never be reported as external provider acceptance.
const TOKEN = 'command-center-local-regression-token-20261102';
const ORIGIN = 'https://command-center.example';
const upstreamCalls = [];
const upstream = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  upstreamCalls.push({ method: req.method, path: req.url, body });
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET' && req.url.startsWith('/rest/v1/decisions')) {
    return res.end('[]');
  }
  if (req.method === 'GET' && req.url.startsWith('/rest/v1/organism_status')) {
    return res.end(JSON.stringify([{ status: 'measured', health: 1, active_agents: 2, entropy_index: 3, revenue_signal: 4 }]));
  }
  if (req.method === 'POST' && req.url === '/rest/v1/decisions') {
    return res.end(JSON.stringify([{ id: 7, title: 'local decision', created_at: '2026-11-02T00:00:00Z', accepted: true, context: 'local' }]));
  }
  if (req.method === 'PATCH' && req.url.startsWith('/rest/v1/organism_status')) {
    return res.end(JSON.stringify([{ status: 'local test only' }]));
  }
  res.statusCode = 500;
  res.end(JSON.stringify({ error: 'unexpected loopback request' }));
});
await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
process.env.SUPABASE_URL = 'http://127.0.0.1:' + upstream.address().port;
process.env.SUPABASE_ANON_KEY = 'local-only-not-a-provider-key';
process.env.COMMAND_CENTER_ALLOWED_ORIGINS = ORIGIN;
process.env.COMMAND_CENTER_WRITE_TOKEN = TOKEN;
const { default: decisions } = await import('../api/decisions.js');
const { default: organism } = await import('../api/organism-status.js');
test.after(() => new Promise(resolve => upstream.close(resolve)));

async function serve(handler) {
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try { req.body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
    catch { req.body = {}; }
    res.status = code => { res.statusCode = code; return res; };
    res.json = value => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(value));
      return res;
    };
    try { await handler(req, res); }
    catch (error) { res.statusCode = 500; res.end(JSON.stringify({ error: 'local handler failure' })); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: 'http://127.0.0.1:' + server.address().port };
}

async function withRoute(handler, run) {
  const { server, url } = await serve(handler);
  try { await run(url); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

function options(method, token = null, origin = ORIGIN, body = {}) {
  const headers = { 'Content-Type': 'application/json', Origin: origin };
  if (token !== null) headers.Authorization = 'Bearer ' + token;
  return { method, headers, body: JSON.stringify(body) };
}

test('dedicated write credential is long, exact and rejects ambiguous bearer syntax', () => {
  const env = { COMMAND_CENTER_WRITE_TOKEN: TOKEN };
  assert.equal(writeTokenConfigured({}), false);
  assert.equal(writeTokenConfigured({ COMMAND_CENTER_WRITE_TOKEN: 'short' }), false);
  assert.equal(writeTokenConfigured(env), true);
  assert.equal(authorizedWrite({ headers: {} }, env), false);
  assert.equal(authorizedWrite({ headers: { authorization: 'Bearer wrong' } }, env), false);
  assert.equal(authorizedWrite({ headers: { authorization: 'Basic ' + TOKEN } }, env), false);
  assert.equal(authorizedWrite({ headers: { authorization: 'Bearer ' + TOKEN + ', Bearer ' + TOKEN } }, env), false);
  assert.equal(authorizedWrite({ headers: { authorization: ['Bearer ' + TOKEN] } }, env), false);
  assert.equal(authorizedWrite({ headers: { authorization: 'Bearer ' + TOKEN } }, env), true);
});

test('unauthenticated decision and organism writes never reach upstream', async () => {
  for (const [handler, method, body] of [
    [decisions, 'POST', { title: 'forged', context: 'forged', accepted: true }],
    [organism, 'PUT', { revenue_signal: 999999 }]
  ]) {
    await withRoute(handler, async url => {
      const before = upstreamCalls.length;
      const response = await fetch(url, options(method, null, ORIGIN, body));
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('www-authenticate'), 'Bearer');
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(upstreamCalls.length, before);
    });
  }
});

test('missing server credential disables both mutation routes before any network request', async () => {
  const original = process.env.COMMAND_CENTER_WRITE_TOKEN;
  delete process.env.COMMAND_CENTER_WRITE_TOKEN;
  try {
    for (const [handler, method] of [[decisions, 'POST'], [organism, 'PUT']]) {
      await withRoute(handler, async url => {
        const before = upstreamCalls.length;
        const response = await fetch(url, options(method, TOKEN));
        assert.equal(response.status, 503);
        assert.equal(upstreamCalls.length, before);
      });
    }
  } finally {
    process.env.COMMAND_CENTER_WRITE_TOKEN = original;
  }
});

test('authorized decision creation reaches the real local HTTP integration exactly once', async () => {
  await withRoute(decisions, async url => {
    const before = upstreamCalls.length;
    const response = await fetch(url, options('POST', TOKEN, ORIGIN, {
      title: 'local decision', context: 'local', accepted: true
    }));
    assert.equal(response.status, 201);
    assert.equal((await response.json()).title, 'local decision');
    assert.equal(upstreamCalls.length, before + 1);
    assert.equal(upstreamCalls.at(-1).method, 'POST');
    assert.equal(upstreamCalls.at(-1).path, '/rest/v1/decisions');
  });
});

test('authorized organism update sends real local HTTP PATCH and keeps public GET', async () => {
  await withRoute(organism, async url => {
    const before = upstreamCalls.length;
    const response = await fetch(url, options('PUT', TOKEN, ORIGIN, { status: 'local test only' }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'local test only');
    assert.equal(upstreamCalls.length, before + 1);
    assert.equal(upstreamCalls.at(-1).method, 'PATCH');
    assert.equal(JSON.parse(upstreamCalls.at(-1).body).status, 'local test only');

    const publicRead = await fetch(url, { headers: { Origin: 'https://any-read-client.example' } });
    assert.equal(publicRead.status, 200);
    assert.equal(publicRead.headers.get('access-control-allow-origin'), '*');
    assert.equal((await publicRead.json()).status, 'measured');
  });
});

test('hostile browser origins cannot preflight or mutate organism metrics', async () => {
  await withRoute(organism, async url => {
    const before = upstreamCalls.length;
    const badOrigin = 'https://intruder.example';
    const denied = await fetch(url, options('PUT', TOKEN, badOrigin, { status: 'forged' }));
    assert.equal(denied.status, 403);
    const preflightDenied = await fetch(url, { method: 'OPTIONS', headers: { Origin: badOrigin } });
    assert.equal(preflightDenied.status, 403);
    const preflightAllowed = await fetch(url, { method: 'OPTIONS', headers: { Origin: ORIGIN } });
    assert.equal(preflightAllowed.status, 204);
    assert.equal(preflightAllowed.headers.get('access-control-allow-origin'), ORIGIN);
    assert.match(preflightAllowed.headers.get('access-control-allow-headers'), /Authorization/);
    assert.equal(upstreamCalls.length, before);
  });
});

test('read-only decision replay still uses real local HTTP GET without write token', async () => {
  await withRoute(decisions, async url => {
    const response = await fetch(url, { headers: { Origin: ORIGIN } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
  });
});
