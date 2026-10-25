// Local-only end-to-end harness. No real GitHub requests or production writes.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { createAdminHandler, hashPassword } from '../server/admin';
import { fixture } from '../tests/fixtures/content';
const port = 4188, origin = `http://localhost:${port}`;
let text = JSON.stringify(fixture);
const sha = () => createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0${text}`).digest('hex');
const handle = createAdminHandler({ origin, passwordHash: hashPassword('local-test-only'), sessionSecret: 'local-preview-secret-'.repeat(3), githubToken: 'local-test-only' }, async (url, options) => {
  if (String(url).includes('/actions/')) return Response.json({ workflow_runs: [{ status: 'completed', conclusion: 'success' }] });
  if (options?.method === 'PUT') {
    const body = JSON.parse(String(options.body));
    if (body.sha !== sha()) return Response.json({}, { status: 409 });
    text = Buffer.from(body.content, 'base64').toString('utf8');
    return Response.json({ content: { sha: sha() }, commit: { sha: 'c'.repeat(40) } });
  }
  return Response.json({ sha: sha(), size: Buffer.byteLength(text), encoding: 'base64', content: Buffer.from(text).toString('base64') });
});
const root = resolve('out');
createServer(async (req, res) => {
  const url = new URL(req.url!, origin);
  if (url.pathname === '/api/admin') {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(chunk);
    const headers = new Headers(); for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
    const result = await handle(new Request(url, { method: req.method, headers, body: req.method === 'POST' ? Buffer.concat(chunks).toString() : undefined }));
    res.writeHead(result.status, Object.fromEntries(result.headers)); res.end(Buffer.from(await result.arrayBuffer())); return;
  }
  // Simulate participant data after a successful deployment, independent of the admin editor.
  if (url.pathname === '/preview-published/') {
    const data = JSON.parse(text);
    const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<h1>로컬 저장 결과</h1><pre>${escape(JSON.stringify(data, null, 2))}</pre>`); return;
  }
  try {
    const file = resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + '/')) { res.writeHead(403); res.end(); return; }
    const bytes = await readFile(file);
    res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'} as Record<string,string>)[extname(file)] ?? 'application/octet-stream');
    res.end(bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Local mock admin: ${origin}/admin/ (password: local-test-only)`));
