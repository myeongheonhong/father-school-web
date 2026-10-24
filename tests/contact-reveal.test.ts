import test from 'node:test';
import assert from 'node:assert/strict';
import { contactRevealReducer, createContactRevealState } from '../lib/contact-reveal';

test('reading the next group leaves previously revealed contacts open', () => {
  const first = contactRevealReducer(createContactRevealState(), { type: 'reveal', id: '1' });
  const second = contactRevealReducer(first, { type: 'reveal', id: '2' });
  assert.deepEqual([...second.expanded], ['1', '2']);
  assert.deepEqual([...first.expanded], ['1']);
  assert.equal(contactRevealReducer(second, { type: 'reveal', id: '1' }), second);
});

test('a manually closed group stays closed when revisited automatically', () => {
  let state = contactRevealReducer(createContactRevealState(), { type: 'reveal', id: '1' });
  state = contactRevealReducer(state, { type: 'toggle', id: '1' });
  state = contactRevealReducer(state, { type: 'reveal', id: '2' });
  assert.equal(contactRevealReducer(state, { type: 'reveal', id: '1' }), state);
  assert.deepEqual([...state.expanded], ['2']);
  assert.equal(state.dismissed.has('1'), true);
});

test('explicitly reopening a dismissed group restores its expanded state', () => {
  let state = contactRevealReducer(createContactRevealState(), { type: 'toggle', id: '9' });
  state = contactRevealReducer(state, { type: 'toggle', id: '9' });
  state = contactRevealReducer(state, { type: 'toggle', id: '9' });
  assert.equal(state.expanded.has('9'), true);
  assert.equal(state.dismissed.has('9'), false);
});

test('closing one group preserves other open groups and does not mutate prior state', () => {
  let state = contactRevealReducer(createContactRevealState(), { type: 'reveal', id: '8' });
  state = contactRevealReducer(state, { type: 'reveal', id: '9' });
  const closed = contactRevealReducer(state, { type: 'toggle', id: '8' });
  assert.deepEqual([...closed.expanded], ['9']);
  assert.deepEqual([...state.expanded], ['8', '9']);
  assert.equal(state.dismissed.size, 0);
});

test('revealing a filtered result preserves the rest of the session state', () => {
  let state = contactRevealReducer(createContactRevealState(), { type: 'toggle', id: '1' });
  state = contactRevealReducer(state, { type: 'toggle', id: '1' });
  state = contactRevealReducer(state, { type: 'reveal', id: '5' });
  state = contactRevealReducer(state, { type: 'reveal', id: '10' });
  assert.deepEqual([...state.expanded], ['5', '10']);
  assert.equal(state.dismissed.has('1'), true);
});
