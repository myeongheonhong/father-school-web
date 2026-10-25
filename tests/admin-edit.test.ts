import test from 'node:test';
import assert from 'node:assert/strict';
import { editPerson, removePerson, sameContent } from '../lib/admin-edit';
import { groupContacts } from '../lib/contacts';
import { validateContent, parseContent, exportContent } from '../lib/content';
import { fixture } from './fixtures/content';

test('renaming a person keeps their phone, role, and other contacts across export', () => {
  for (const originalName of ['김조장', '박조원']) {
    const source = fixture.groups[0];
    const before = groupContacts(source).find(p => p.name === originalName)!;
    const edited = editPerson(source, originalName, '수정한이름', before.phone);
    const result = parseContent(exportContent({ ...fixture, groups: [edited] }));
    assert.deepEqual(groupContacts(result.groups[0]).find(p => p.name === '수정한이름'), { ...before, name: '수정한이름' });
    assert.ok(!edited.contacts?.some(p => p.name === originalName));
    assert.equal(groupContacts(edited).length, 3);
  }
});
test('adding then removing a member keeps the published data valid at either size', () => {
  const added = editPerson(fixture.groups[0], null, '새조원', '01000000005');
  assert.equal(groupContacts(added).length, 4);
  assert.equal(groupContacts(added).at(-1)?.phone, '010-0000-0005');
  validateContent({ ...fixture, groups: [added] });
  const deleted = removePerson(added, '박조원');
  assert.equal(groupContacts(deleted).length, 3);
  assert.ok(!deleted.contacts?.some(c => c.name === '박조원'));
  validateContent({ ...fixture, groups: [deleted] });
});
test('removing leader or all groups is supported without orphan contacts', () => {
  const group = removePerson(fixture.groups[0], '김조장');
  assert.equal(group.leader, '');
  validateContent({ ...fixture, groups: [group] });
  validateContent({ ...fixture, groups: [] });
});
test('invalid and duplicate names are rejected before changing any contact', () => {
  for (const name of ['', '김조장', '두명,이름', '두명\n이름']) assert.throws(() => editPerson(fixture.groups[0], null, name, ''));
  assert.throws(() => editPerson(fixture.groups[0], null, '새사람', '123'));
  assert.throws(() => validateContent({ ...fixture, groups: [{ ...fixture.groups[0], members: '박조원\n박조원' }] }));
});
test('comparison ignores save timestamps but detects real edits', () => {
  assert.ok(sameContent(fixture, { ...fixture, updatedAt: '2026-10-26T00:00:00Z' }));
  assert.ok(!sameContent(fixture, { ...fixture, groups: [] }));
});
