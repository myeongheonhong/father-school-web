import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateContent, exportContent, parseContent } from '../lib/content';
import { groupContacts, formatPhone, phoneHref } from '../lib/contacts';
import { fixture as data } from './fixtures/content';

test('all published editions validate without fixing participant counts or names', () => {
  for (const file of ['content.json', 'content-b2.json', 'content-b3.json']) {
    const content = validateContent(JSON.parse(readFileSync(`public/${file}`, 'utf8')));
    for (const group of content.groups) {
      for (const person of groupContacts(group)) if (person.phone) assert.ok(phoneHref(person.phone));
      if (group.contacts) assert.equal(group.contacts.length, groupContacts(group).length);
    }
  }
});
test('admin export/import preserves the full roster and changed phone numbers', () => {
  const draft = structuredClone(data);
  draft.groups[0].contacts![0].phone = '010-0000-0099';
  const imported = parseContent(exportContent(draft));
  assert.deepEqual(imported.groups, draft.groups);
  assert.equal(groupContacts(imported.groups[0])[0].phone, '010-0000-0099');
  assert.notEqual(data.groups[0].contacts![0].phone, '010-0000-0099');
});
test('invalid, duplicate, or unrelated contacts are rejected', () => {
  for (const phone of ['javascript:alert(1)', 'tel:01012345678', 'https://example.com', '010-12-3456']) {
    const invalid = structuredClone(data); invalid.groups[0].contacts![0].phone = phone;
    assert.throws(() => validateContent(invalid)); assert.equal(phoneHref(phone), undefined);
  }
  const duplicate = structuredClone(data); duplicate.groups[0].contacts!.push(duplicate.groups[0].contacts![0]);
  assert.throws(() => validateContent(duplicate));
  const unrelated = structuredClone(data); unrelated.groups[0].contacts![0].name = '명단에 없는 이름';
  assert.throws(() => validateContent(unrelated));
});
test('contact formatting works with digits, existing hyphens and missing numbers', () => {
  assert.equal(formatPhone('01012345678'), '010-1234-5678');
  assert.equal(formatPhone('010-1234-5678'), '010-1234-5678');
  assert.equal(phoneHref('010-1234-5678'), 'tel:01012345678');
  assert.equal(phoneHref(''), undefined);
  assert.equal(groupContacts(data.groups[0])[2].phone, '');
});
