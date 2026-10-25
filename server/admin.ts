import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { parseContent, exportContent, sameContent } from '../lib/content.js';

const REPO = 'https://api.github.com/repos/myeongheonhong/father-school-web';
const FILE = '/contents/public/content-b3.json';
const COOKIE = '__Host-father_admin';
const SESSION_SECONDS = 12 * 60 * 60;
const MAX_BYTES = 3 * 1024 * 1024;
type Config = { origin: string; passwordHash: string; sessionSecret: string; githubToken: string };
class Failure extends Error { constructor(public status: number, message: string) { super(message); } }
export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): string {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function equal(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function sign(value: string, config: Config) { return createHmac('sha256', config.sessionSecret).update(`${config.passwordHash}:${value}`).digest('base64url'); }
function session(config: Config) {
  const value = `${Date.now() + SESSION_SECONDS * 1000}.${randomBytes(24).toString('base64url')}`;
  return `${value}.${sign(value, config)}`;
}
function authenticated(request: Request, config: Config): boolean {
  const value = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? '';
  const [expiry, nonce, signature, extra] = value.split('.');
  return !extra && !!nonce && !!signature && Number(expiry) > Date.now() && Number(expiry) <= Date.now() + SESSION_SECONDS * 1000 && equal(signature, sign(`${expiry}.${nonce}`, config));
}
function cookie(value: string, age: number) { return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`; }
function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}
// Secondary, per-process throttling. The generated administrator password has 192 bits of entropy.
// A shared, human-chosen password additionally requires a persistent edge rate-limit rule.
export function createAdminHandler(config: Config, fetcher: typeof fetch = fetch) {
  const attempts = new Map<string, { count: number; until: number }>();
  async function github(path: string, options: RequestInit = {}) {
    const response = await fetcher(REPO + path, { ...options, headers: {
      Authorization: `Bearer ${config.githubToken}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', ...options.headers,
    }, signal: AbortSignal.timeout(20000), cache: 'no-store' });
    if (!response.ok) {
      if (response.status === 409 || response.status === 422) throw new Failure(409, '다른 변경사항이 먼저 저장됐습니다. 최신 내용을 불러온 뒤 다시 수정해주세요.');
      if (response.status === 401 || response.status === 403) throw new Failure(503, '저장소 연결 권한을 확인해야 합니다. 수정 내용은 백업 파일로 보관해주세요.');
      throw new Failure(502, '저장소에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
    return response;
  }
  async function current() {
    const meta = await (await github(FILE + '?ref=main')).json();
    if (!/^[a-f0-9]{40}$/.test(meta.sha) || meta.size > MAX_BYTES) throw new Failure(413, '안내 파일이 너무 큽니다. 3MB 이하로 줄여주세요.');
    const text = meta.encoding === 'base64' && meta.content
      ? Buffer.from(meta.content, 'base64').toString('utf8')
      : await (await github(FILE + '?ref=main', { headers: { Accept: 'application/vnd.github.raw+json' } })).text();
    // The Contents API can race between metadata and raw reads. Verify bytes against the blob SHA.
    const { createHash } = await import('node:crypto');
    const bytes = Buffer.from(text);
    const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (sha !== meta.sha) throw new Failure(409, '내용이 갱신되는 중입니다. 다시 불러와주세요.');
    return { text, revision: meta.sha as string, data: parseContent(text) };
  }
  return async function handle(request: Request): Promise<Response> {
    const action = new URL(request.url).searchParams.get('action');
    try {
      if (!config.origin || !config.passwordHash || config.sessionSecret.length < 32 || !config.githubToken) throw new Failure(503, '관리자 연결 설정이 아직 완료되지 않았습니다.');
      if (request.method !== 'GET' && request.method !== 'POST') return json({ error: '지원하지 않는 요청입니다.' }, 405, { Allow: 'GET, POST' });
      if (request.method === 'POST' && (request.headers.get('origin') !== config.origin || !request.headers.get('content-type')?.startsWith('application/json'))) throw new Failure(403, '관리자 페이지에서 다시 시도해주세요.');
      if (action === 'session' && request.method === 'GET') return json({ authenticated: authenticated(request, config) });
      let body: Record<string, unknown> = {};
      if (request.method === 'POST') {
        if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES + 1024) throw new Failure(413, '이미지를 줄여 전체 안내를 3MB 이하로 만들어주세요.');
        const text = await request.text();
        if (Buffer.byteLength(text) > MAX_BYTES + 1024) throw new Failure(413, '이미지를 줄여 전체 안내를 3MB 이하로 만들어주세요.');
        try { body = JSON.parse(text); } catch { throw new Failure(400, '요청 형식을 확인해주세요.'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Failure(400, '요청 형식을 확인해주세요.');
      }
      if (action === 'login' && request.method === 'POST') {
        const ip = request.headers.get('x-vercel-forwarded-for') ?? 'local';
        for (const [key, value] of attempts) if (value.until <= Date.now()) attempts.delete(key);
        const attempt = attempts.get(ip);
        if (attempt && attempt.count >= 5) throw new Failure(429, '로그인 시도가 많습니다. 10분 후 다시 시도해주세요.');
        const password = typeof body.password === 'string' ? body.password : '';
        if (password.length > 256) throw new Failure(400, '비밀번호를 확인해주세요.');
        const salt = config.passwordHash.split(':')[0];
        if (!equal(hashPassword(password, salt), config.passwordHash)) {
          if (attempts.size > 10000) throw new Failure(429, '잠시 후 다시 시도해주세요.');
          attempts.set(ip, { count: (attempt?.count ?? 0) + 1, until: attempt?.until ?? Date.now() + 600000 });
          throw new Failure(401, '비밀번호가 맞지 않습니다.');
        }
        attempts.delete(ip);
        return json({ authenticated: true }, 200, { 'Set-Cookie': cookie(session(config), SESSION_SECONDS) });
      }
      if (!authenticated(request, config)) throw new Failure(401, '로그인이 만료됐습니다. 수정 내용은 유지됩니다. 다시 로그인해주세요.');
      if (action === 'logout' && request.method === 'POST') return json({ authenticated: false }, 200, { 'Set-Cookie': cookie('', 0) });
      if (action === 'content' && request.method === 'GET') {
        const { text, revision } = await current();
        return json({ text, revision });
      }
      if (action === 'publish' && request.method === 'POST') {
        if (typeof body.revision !== 'string' || !/^[a-f0-9]{40}$/.test(body.revision)) throw new Failure(400, '최신 내용을 먼저 불러와주세요.');
        let content;
        try { content = parseContent(JSON.stringify(body.content)); } catch (e) { throw new Failure(400, e instanceof Error ? e.message : '내용을 확인해주세요.'); }
        const latest = await current();
        if (latest.revision !== body.revision) throw new Failure(409, '다른 기기에서 먼저 수정했습니다. 초안을 백업하고 최신 내용을 불러온 뒤 다시 수정해주세요.');
        if (sameContent(content, latest.data)) return json({ unchanged: true, revision: latest.revision, content: latest.data });
        const text = exportContent(content);
        if (Buffer.byteLength(text) > MAX_BYTES) throw new Failure(413, '이미지를 줄여 전체 안내를 3MB 이하로 만들어주세요.');
        const saved = await (await github(FILE, { method: 'PUT', body: JSON.stringify({ message: 'Update school content from mobile admin', content: Buffer.from(text).toString('base64'), sha: latest.revision, branch: 'main' }) })).json();
        return json({ revision: saved.content.sha, commit: saved.commit.sha, content: parseContent(text) });
      }
      if (action === 'status' && request.method === 'GET') {
        const commit = new URL(request.url).searchParams.get('commit');
        if (!commit || !/^[a-f0-9]{40}$/.test(commit)) throw new Failure(400, '저장 번호를 확인해주세요.');
        const result = await (await github(`/actions/workflows/pages.yml/runs?head_sha=${commit}&per_page=1`)).json();
        const run = result.workflow_runs?.[0];
        return json({ status: run?.status ?? 'queued', conclusion: run?.conclusion ?? null });
      }
      throw new Failure(404, '요청을 찾을 수 없습니다.');
    } catch (e) {
      if (e instanceof Failure) return json({ error: e.message }, e.status);
      console.error('Admin request failed', { action, kind: e instanceof Error ? e.name : 'unknown' });
      return json({ error: '처리를 완료하지 못했습니다. 수정 내용을 보관하고 다시 시도해주세요.' }, 502);
    }
  };
}
