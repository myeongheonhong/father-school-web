import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createAdminHandler, hashPassword } from '../server/admin';
import { fixture } from './fixtures/content';

const origin = 'https://admin.example.test';
const password = 'test-only-admin-password';
const config = { origin, passwordHash: hashPassword(password), sessionSecret: 'test-secret-'.repeat(5), githubToken: 'test-token' };
const blobSHA = (text: string) => createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0${text}`).digest('hex');
function setup() {
  let text = JSON.stringify(fixture), writes = 0;
  let conflict = false;
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input); calls.push(url);
    assert.ok(url.startsWith('https://api.github.com/repos/myeongheonhong/father-school-web/'));
    if (url.includes('/actions/')) return Response.json({ workflow_runs: [{ status: 'completed', conclusion: 'success' }] });
    if (init?.method === 'PUT') {
      const body = JSON.parse(String(init.body));
      if (conflict || body.sha !== blobSHA(text)) return Response.json({}, { status: 409 });
      assert.equal(body.branch, 'main');
      text = Buffer.from(body.content, 'base64').toString('utf8'); writes++;
      return Response.json({ content: { sha: blobSHA(text) }, commit: { sha: 'b'.repeat(40) } });
    }
    return Response.json({ sha: blobSHA(text), content: Buffer.from(text).toString('base64'), size: Buffer.byteLength(text), encoding: 'base64' });
  };
  const handle = createAdminHandler(config, fetcher);
  const req = (action: string, body?: unknown, cookie = '', requestOrigin = origin) => handle(new Request(`${origin}/api/admin?action=${action}`, { method: body === undefined ? 'GET' : 'POST', headers: { origin: requestOrigin, 'content-type': 'application/json', cookie }, body: body === undefined ? undefined : JSON.stringify(body) }));
  const login = async () => { const r = await req('login', { password }); assert.equal(r.status, 200); return r.headers.get('set-cookie')!.split(';')[0]; };
  return { req, login, calls, get text() { return text; }, get writes() { return writes; }, set conflict(v: boolean) { conflict = v; } };
}
test('authentication is required for reads and writes; no upstream requests before login', async () => {
  const s = setup();
  assert.equal((await s.req('content')).status, 401);
  assert.equal((await s.req('publish', {})).status, 401);
  assert.deepEqual(await (await s.req('session')).json(), { authenticated: false });
  assert.equal(s.calls.length, 0);
});
test('password login sets an HttpOnly secure strict cookie and rejects forged cookies', async () => {
  const s = setup();
  assert.equal((await s.req('login', { password: 'wrong' })).status, 401);
  const response = await s.req('login', { password });
  const cookie = response.headers.get('set-cookie')!;
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(cookie.includes(flag));
  assert.ok(!cookie.includes(password));
  assert.equal((await s.req('content', undefined, cookie.split(';')[0] + 'forged')).status, 401);
  assert.equal((await s.req('content', undefined, cookie.split(';')[0])).status, 200);
});
test('cross-origin mutations, invalid JSON, and failed password floods are rejected', async () => {
  const s = setup();
  assert.equal((await s.req('login', { password }, '', 'https://other.example')).status, 403);
  for (let i = 0; i < 5; i++) assert.equal((await s.req('login', { password: 'wrong' })).status, 401);
  assert.equal((await s.req('login', { password })).status, 429);
});
test('adding and deleting people persists the exact new content with optimistic concurrency', async () => {
  const s = setup(), cookie = await s.login();
  const latest = await (await s.req('content', undefined, cookie)).json();
  const edited = structuredClone(fixture);
  edited.groups = [];
  const saved = await s.req('publish', { revision: latest.revision, content: edited }, cookie);
  assert.equal(saved.status, 200);
  const result = await saved.json();
  assert.equal(result.commit, 'b'.repeat(40));
  assert.deepEqual(JSON.parse(s.text).groups, []);
  assert.equal(s.writes, 1);
  const read = await (await s.req('content', undefined, cookie)).json();
  assert.deepEqual(JSON.parse(read.text).groups, []);
  assert.equal(read.revision, result.revision);
  assert.equal((await s.req('publish', { revision: latest.revision, content: fixture }, cookie)).status, 409);
  assert.equal(s.writes, 1);
});
test('unchanged save does not create a deployment and concurrent GitHub writes are preserved', async () => {
  const s = setup(), cookie = await s.login();
  const latest = await (await s.req('content', undefined, cookie)).json();
  const unchanged = await s.req('publish', { revision: latest.revision, content: fixture }, cookie);
  assert.equal((await unchanged.json()).unchanged, true);
  assert.equal(s.writes, 0);
  s.conflict = true;
  const response = await s.req('publish', { revision: latest.revision, content: { ...fixture, groupNotice: '변경' } }, cookie);
  assert.equal(response.status, 409);
  assert.equal(s.writes, 0);
});
test('invalid payloads never reach GitHub write and status reports the matching workflow', async () => {
  const s = setup(), cookie = await s.login();
  const revision = blobSHA(s.text);
  assert.equal((await s.req('publish', { revision, content: { ...fixture, weeks: [] } }, cookie)).status, 400);
  assert.equal((await s.req('publish', { revision: 'invalid', content: fixture }, cookie)).status, 400);
  assert.equal(s.writes, 0);
  const status = await s.req(`status&commit=${'b'.repeat(40)}`, undefined, cookie);
  assert.deepEqual(await status.json(), { status: 'completed', conclusion: 'success' });
});
test('logout clears the cookie and missing server secrets fail closed', async () => {
  const s = setup(), cookie = await s.login();
  assert.ok((await s.req('logout', {}, cookie)).headers.get('set-cookie')!.includes('Max-Age=0'));
  const handler = createAdminHandler({ ...config, githubToken: '' });
  assert.equal((await handler(new Request(`${origin}/api/admin?action=session`))).status, 503);
});
