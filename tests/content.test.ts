import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateContent, parseContent, exportContent } from '../lib/content';
const original = JSON.parse(readFileSync('public/content.json', 'utf8'));
test('published content preserves all three posters and their accessible reading text', () => {
  const data = validateContent(original);
  assert.equal(data.weeks.length, 3);
  for (const w of data.weeks) { assert.ok(w.questions.length > 0); assert.ok(w.worship.includes('|')); }
});
test('export and import preserve replaced images, rosters, and main design', () => {
  const data = validateContent(original);
  data.weeks[0].poster = 'data:image/png;base64,aGVsbG8=';
  data.groups = [{ id: 'test-only', name: '테스트 조', leader: '담당자', members: '이름1\n이름2', notice: '5층' }];
  data.defaultVariant = 'C';
  const reimported = parseContent(exportContent(data));
  assert.deepEqual(reimported.weeks, data.weeks);
  assert.deepEqual(reimported.groups, data.groups);
  assert.equal(reimported.defaultVariant, 'C');
  assert.notEqual(original.weeks[0].poster, data.weeks[0].poster);
});
test('invalid input is rejected before it can replace published content', () => {
  const changes = [
    { schemaVersion: 99 }, { weeks: [] }, { defaultVariant: 'D' }, { groupPlace: '' }, { updatedAt: 'invalid' },
    { groups: [{ id: 'x', name: '', leader: '', members: '', notice: '' }] },
  ];
  for (const change of changes) assert.throws(() => validateContent({ ...original, ...change }));
  assert.throws(() => parseContent('{broken'));
});
test('external, script, SVG, and traversal image references are rejected', () => {
  for (const poster of ['javascript:alert(1)', 'https://untrusted.example/a.png', '/posters/../secret.png', 'data:image/svg+xml;base64,PHN2Zz4=']) {
    const data = structuredClone(original); data.weeks[0].poster = poster; assert.throws(() => validateContent(data));
  }
});
test('duplicate group IDs and oversized input are rejected', () => {
  const g = { id: 'same', name: '조', leader: '', members: '', notice: '' };
  assert.throws(() => validateContent({ ...original, groups: [g, g] }));
  assert.throws(() => parseContent(' '.repeat(15 * 1024 * 1024 + 1)));
});
