import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateContent, exportContent, parseContent } from '../lib/content';
import { groupContacts, formatPhone, phoneHref } from '../lib/contacts';

const data = validateContent(JSON.parse(readFileSync('public/content-b3.json', 'utf8')));

test('B3 connects every roster name to one valid phone number', () => {
  const people = data.groups.flatMap(groupContacts);
  assert.equal(data.groups.length, 10);
  assert.equal(people.length, 60);
  assert.equal(people.filter(person => person.leader).length, 10);
  assert.equal(new Set(people.map(person => person.phone)).size, 60);
  assert.ok(people.every(person => /^010-\d{4}-\d{4}$/.test(person.phone)));
  assert.ok(people.every(person => phoneHref(person.phone)?.startsWith('tel:010')));
  for (const group of data.groups) assert.equal(group.contacts?.length, groupContacts(group).length);
});

test('corrected names match their phone numbers in the supplied roster', () => {
  const people = data.groups.flatMap(groupContacts);
  assert.equal(people.find(person => person.phone === '010-4781-7145')?.name, '이건회');
  assert.equal(people.find(person => person.phone === '010-8464-3764')?.name, '노운식');
  assert.equal(people.find(person => person.phone === '010-6449-9122')?.name, '최웅조');
  assert.equal(people.find(person => person.phone === '010-9879-7820')?.name, '정태흥');
  assert.ok(!/이건희|노윤식|최용조|정태홍/.test(JSON.stringify(data)));
});

test('admin export/import preserves the full contact roster and changed phone numbers', () => {
  const draft = structuredClone(data);
  draft.groups[0].contacts![0].phone = '010-0000-0000';
  const imported = parseContent(exportContent(draft));
  assert.deepEqual(imported.groups, draft.groups);
  assert.equal(groupContacts(imported.groups[0])[0].phone, '010-0000-0000');
  assert.notEqual(data.groups[0].contacts![0].phone, '010-0000-0000');
});

test('invalid, duplicate, or unrelated contacts cannot replace the roster', () => {
  for (const phone of ['javascript:alert(1)', 'tel:01012345678', 'https://example.com', '010-12-3456']) {
    const invalid = structuredClone(data);
    invalid.groups[0].contacts![0].phone = phone;
    assert.throws(() => validateContent(invalid));
    assert.equal(phoneHref(phone), undefined);
  }
  const duplicate = structuredClone(data);
  duplicate.groups[0].contacts!.push(duplicate.groups[0].contacts![0]);
  assert.throws(() => validateContent(duplicate));
  const unrelated = structuredClone(data);
  unrelated.groups[0].contacts![0].name = '명단에 없는 이름';
  assert.throws(() => validateContent(unrelated));
});

test('contact formatting works with digits, existing hyphens and incomplete entries', () => {
  assert.equal(formatPhone('01012345678'), '010-1234-5678');
  assert.equal(formatPhone('010-1234-5678'), '010-1234-5678');
  assert.equal(phoneHref('010-1234-5678'), 'tel:01012345678');
  assert.equal(phoneHref(''), undefined);
  const noContacts = { id: 'draft', name: '새 조', leader: '조장', members: '조원', notice: '' };
  assert.deepEqual(groupContacts(noContacts), [{ name: '조장', leader: true, phone: '' }, { name: '조원', leader: false, phone: '' }]);
});
