import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateContent } from '../lib/content';
import { groupPeople, matchesGroup, matchingPeople } from '../lib/groups';
const data = validateContent(JSON.parse(readFileSync('public/content-b2.json', 'utf8')));

test('B2 contains 10 groups and all 60 names, with no phone numbers', () => {
  assert.equal(data.groups.length, 10);
  assert.equal(data.groups.reduce((sum, g) => sum + groupPeople(g).length, 0), 60);
  assert.ok(data.groups.every(g => groupPeople(g).filter(p => p.leader).length === 1));
  assert.equal(/010[-\s]?\d{4}[-\s]?\d{4}/.test(JSON.stringify(data)), false);
  assert.deepEqual(data.groups.map(g => g.leader), ['이건희','노윤식','강정수','임은성','임양순','장래천','인금환','정현기','최영우','백무열']);
});
test('all roster names can find their own group, including leaders', () => {
  for (const g of data.groups) for (const p of groupPeople(g)) {
    assert.ok(matchesGroup(g, p.name), `${p.name} should find ${g.name}`);
    assert.ok(matchingPeople(g, p.name).some(result => result.name === p.name));
  }
});
test('search handles partial names and spacing without joining separate names', () => {
  assert.deepEqual(data.groups.filter(g => matchesGroup(g, ' 김 정 헌 ')).map(g => g.name), ['5조']);
  assert.deepEqual(data.groups.filter(g => matchesGroup(g, '1조')).map(g => g.name), ['1조']);
  assert.deepEqual(data.groups.filter(g => matchesGroup(g, '10조')).map(g => g.name), ['10조']);
  assert.ok(data.groups.filter(g => matchesGroup(g, '김')).length > 1);
  assert.equal(matchesGroup(data.groups[0], '휘장'), false);
  assert.equal(data.groups.filter(g => matchesGroup(g, '없는이름')).length, 0);
});
test('comma and newline separated names do not duplicate the leader', () => {
  assert.deepEqual(groupPeople({id:'test', name:'테스트', leader:'조장', members:'조장, 이름1\n이름2, 이름1',notice:''}), [
    {name:'조장',leader:true}, {name:'이름1',leader:false}, {name:'이름2',leader:false},
  ]);
});
test('original A/B/C content remains separate from B2 roster', () => {
  const original = validateContent(JSON.parse(readFileSync('public/content.json', 'utf8')));
  assert.equal(original.groups.length, 0);
  assert.deepEqual(original.weeks, data.weeks);
});
