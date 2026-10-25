import test from 'node:test';
import assert from 'node:assert/strict';
import { groupPeople, matchesGroup, matchingPeople } from '../lib/groups';
import { fixture as data } from './fixtures/content';

test('all names can find their own group, including leaders', () => {
  for (const g of data.groups) for (const p of groupPeople(g)) {
    assert.ok(matchesGroup(g, p.name));
    assert.ok(matchingPeople(g, p.name).some(result => result.name === p.name));
  }
});
test('search handles partial names and spacing without joining separate names', () => {
  assert.deepEqual(data.groups.filter(g => matchesGroup(g, ' 김 조 장 ')).map(g => g.name), ['1조']);
  assert.deepEqual(data.groups.filter(g => matchesGroup(g, '1조')).map(g => g.name), ['1조']);
  assert.deepEqual(data.groups.filter(g => matchesGroup(g, '10조')).map(g => g.name), ['10조']);
  assert.equal(data.groups.filter(g => matchesGroup(g, '김')).length, 2);
  assert.equal(matchesGroup(data.groups[0], '원이'), false);
});
test('comma and newline separated names do not duplicate the leader', () => {
  assert.deepEqual(groupPeople({id:'test', name:'테스트', leader:'조장', members:'조장, 이름1\n이름2, 이름1',notice:''}), [
    {name:'조장',leader:true}, {name:'이름1',leader:false}, {name:'이름2',leader:false},
  ]);
});
