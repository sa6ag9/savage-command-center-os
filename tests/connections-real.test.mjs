import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const { default: connections } = await import('../api/connections.js');
const { default: decisions } = await import('../api/decisions.js');
const allowed = 'https://command-center.example';
process.env.COMMAND_CENTER_ALLOWED_ORIGINS = allowed;

async function serve(handler) {
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const part of request) chunks.push(part);
    try { request.body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
    catch { request.body = {}; }
    response.status = (code) => { response.statusCode = code; return response; };
    response.json = (value) => { response.setHeader('Content-Type','application/json'); response.end(JSON.stringify(value)); return response; };
    try { await handler(request, response); }
    catch { response.statusCode = 500; response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: 'http://127.0.0.1:' + server.address().port };
}

test('unknown integration with plausible token cannot claim connected', async t => {
  const {server,url} = await serve(connections);
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(url,{method:'POST',
    headers:{'Content-Type':'application/json',Origin:allowed},
    body:JSON.stringify({id:'nonexistent_mcp',primary:'plausible-token-long-enough'})});
  assert.equal(response.status,422);
  const body=await response.json();
  assert.equal(body.ok,false);
  assert.equal(body.verified,false);
  assert.equal(body.status,'not-verified');
  assert.equal(response.headers.get('access-control-allow-origin'),allowed);
});
test('known tester requires token, invalid IDs are blocked without an upstream call', async t => {
  const {server,url}=await serve(connections);
  t.after(() => new Promise(resolve => server.close(resolve)));
  for(const body of [{id:'github_mcp',primary:''},{id:'__proto__',primary:'token'},{id:'../github_mcp',primary:'token'}]){
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:allowed},body:JSON.stringify(body)});
    assert.equal(res.status,400,body.id);
    assert.equal((await res.json()).ok,false);
  }
  assert.equal((await fetch(url,{headers:{Origin:allowed}})).status,405);
});
test('CORS for mutation handlers rejects unapproved origins',async t=>{
  for(const handler of [connections,decisions]){
    const {server,url}=await serve(handler);
    t.after(() => new Promise(resolve => server.close(resolve)));
    const denied=await fetch(url,{method:'OPTIONS',headers:{Origin:'https://intruder.example'}});
    assert.equal(denied.status,403);
    assert.equal(denied.headers.get('access-control-allow-origin'),null);
    const permitted=await fetch(url,{method:'OPTIONS',headers:{Origin:allowed}});
    assert.equal(permitted.status,204);
    assert.equal(permitted.headers.get('access-control-allow-origin'),allowed);
  }
});
test('UI uses live API result rather than length or cached plaintext',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  assert.equal(app.includes('primaryVal.length > 3'),false);
  assert.equal(app.includes("localStorage.setItem('sas_v3_integrations_creds'"),false);
  assert.ok(app.includes("localStorage.removeItem('sas_v3_integrations_creds')"));
  assert.ok(app.includes("fetch('/api/connections/test'"));
  assert.ok(app.includes('result.verified === true'));
});
