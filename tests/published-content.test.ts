import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './fixtures/content';
import { validateContent } from '../lib/content';
import { readPublishedContent, mergePublishedContent } from '../lib/published-content';

test('published reads bypass cached data and keep each edition separate', async () => {
  const urls: string[] = [];
  const signal = new AbortController().signal;
  const fetcher: typeof fetch = async (url, options) => {
    urls.push(String(url));
    assert.equal(options?.cache, 'no-store');
    assert.equal(options?.signal, signal);
    return Response.json(fixture);
  };
  for (const edition of [undefined, 'B2', 'B3', 'B3'] as const) await readPublishedContent(edition, signal, fetcher);
  assert.match(urls[0], /\/content\.json\?fresh=.+/);
  assert.match(urls[1], /\/content-b2\.json\?fresh=.+/);
  assert.match(urls[2], /\/content-b3\.json\?fresh=.+/);
  assert.notEqual(urls[2], urls[3]);
});

test('an old edge response cannot restore a deleted member after a newer read', () => {
  const old = validateContent(fixture);
  const latest = validateContent({ ...fixture, updatedAt: '2099-01-01T00:00:00Z', groups: [] });
  assert.equal(mergePublishedContent(old, latest), latest);
  assert.equal(mergePublishedContent(latest, old), latest);
  assert.equal(mergePublishedContent(latest, structuredClone(latest)), latest);
});

test('unavailable or invalid published files fail without producing replacement content', async () => {
  const signal = new AbortController().signal;
  await assert.rejects(readPublishedContent('B3', signal, async () => new Response('unavailable', { status: 503 })));
  await assert.rejects(readPublishedContent('B3', signal, async () => Response.json({ ...fixture, groups: 'broken' })));
});
