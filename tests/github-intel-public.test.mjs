import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// These are real invocations of both HTTP handlers with a controlled GitHub
// upstream. No external GitHub API access or private credentials are needed.
const entrypoints = ['api/github.js', 'artifacts/agent-shell/api/github.js'];

async function invoke(file, responder, method = 'GET') {
  const oldFetch = globalThis.fetch;
  const oldToken = process.env.GITHUB_TOKEN;
  const oldOwner = process.env.GITHUB_OWNER;
  const oldRepo = process.env.GITHUB_REPO;
  const calls = [];
  process.env.GITHUB_TOKEN = 'local-secret-must-never-reach-public-github-reads';
  process.env.GITHUB_OWNER = 'sa6ag9';
  process.env.GITHUB_REPO = 'private-research';
  globalThis.fetch = async (url, options = {}) => {
    const call = { url: String(url), authorization: options.headers?.Authorization };
    calls.push(call);
    return responder(call);
  };
  const response = {
    code: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; return this; }
  };
  try {
    const moduleUrl = pathToFileURL(path.resolve(file)).href +
      '?isolated=' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const { default: handler } = await import(moduleUrl);
    await handler({ method }, response);
    return { response, calls };
  } finally {
    globalThis.fetch = oldFetch;
    for (const [key, value] of [
      ['GITHUB_TOKEN', oldToken], ['GITHUB_OWNER', oldOwner], ['GITHUB_REPO', oldRepo]
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function reply(status, body) {
  return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}

for (const file of entrypoints) {
  test(file + ': private repo is never read with privileged token', async () => {
    const { response, calls } = await invoke(file, ({ url, authorization }) => {
      if (url.endsWith('/user')) {
        assert.ok(authorization?.startsWith('token '));
        return reply(200, { login: 'operator', name: 'Operator' });
      }
      assert.equal(authorization, undefined, 'public GitHub request must not carry token');
      if (url.endsWith('/repos/sa6ag9/private-research')) return reply(404, { message: 'Not Found' });
      if (url.includes('/users/sa6ag9/repos?')) return reply(200, []);
      if (url.includes('/events/public?')) return reply(200, []);
      if (url.includes('/commits?')) throw Error('private commits must never be fetched');
      throw Error('Unexpected endpoint: ' + url);
    });
    assert.equal(response.code, 200);
    assert.equal(response.body.user.login, 'operator');
    assert.equal(response.body.repo, undefined);
    assert.equal(response.body.commits, undefined);
    assert.equal(calls.filter(c => c.url.includes('/commits?')).length, 0);
  });

  test(file + ': private metadata even on HTTP 200 cannot authorize commit feed', async () => {
    const { response, calls } = await invoke(file, ({ url, authorization }) => {
      if (url.endsWith('/user')) return reply(200, { login: 'operator' });
      assert.equal(authorization, undefined);
      if (url.endsWith('/repos/sa6ag9/private-research')) {
        return reply(200, { full_name: 'sa6ag9/private-research', private: true });
      }
      if (url.includes('/users/sa6ag9/repos?')) return reply(200, [
        { name: 'private-research', full_name: 'sa6ag9/private-research', private: true },
        { name: 'public-project', full_name: 'sa6ag9/public-project', private: false }
      ]);
      if (url.includes('/events/public?')) return reply(200, []);
      throw Error('Private commit endpoint or unexpected endpoint: ' + url);
    });
    assert.equal(response.code, 200);
    assert.deepEqual(response.body.repos.map(r => r.name), ['public-project']);
    assert.equal(response.body.commits, undefined);
    assert.equal(calls.filter(c => c.url.includes('/commits?')).length, 0);
  });

  test(file + ': public repo retains commit feed but never sends token', async () => {
    const { response, calls } = await invoke(file, ({ url, authorization }) => {
      if (url.endsWith('/user')) {
        assert.ok(authorization?.startsWith('token '));
        return reply(200, { login: 'operator', public_repos: 3 });
      }
      assert.equal(authorization, undefined);
      if (url.endsWith('/repos/sa6ag9/private-research')) {
        return reply(200, { full_name: 'sa6ag9/private-research', private: false });
      }
      if (url.includes('/commits?')) return reply(200, [{
        sha: 'abcdef0123456789',
        commit: { message: 'Public change\\nbody', author: { name: 'Contributor', date: '2026-11-02' } }
      }]);
      if (url.includes('/users/sa6ag9/repos?')) return reply(200, []);
      throw Error('Unexpected endpoint: ' + url);
    });
    assert.equal(response.code, 200);
    assert.equal(response.body.repo, 'sa6ag9/private-research');
    assert.deepEqual(response.body.commits.map(c => c.message), ['Public change']);
    assert.equal(calls.filter(c => c.url.includes('/commits?')).length, 1);
    assert.equal(calls.filter(c => c.authorization !== undefined).length, 1);
  });

  test(file + ': unsupported methods and preflight make no upstream requests', async () => {
    const responder = () => { throw Error('must not call upstream'); };
    const put = await invoke(file, responder, 'POST');
    assert.equal(put.response.code, 405);
    assert.equal(put.calls.length, 0);
    const options = await invoke(file, responder, 'OPTIONS');
    assert.equal(options.response.code, 200);
    assert.equal(options.calls.length, 0);
  });
}
