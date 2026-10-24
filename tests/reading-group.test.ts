import test from 'node:test';
import assert from 'node:assert/strict';
import { readingGroup, type ReadingPosition } from '../lib/reading-group';
const position: ReadingPosition = { line: 300, current: null, direction: 1, atBottom: false, viewportHeight: 800 };

test('contacts open as a group reaches the reading area, one group at a time', () => {
  assert.equal(readingGroup([{id:'1',top:500},{id:'2',top:800}], position), null);
  assert.equal(readingGroup([{id:'1',top:250},{id:'2',top:550}], position), '1');
  assert.equal(readingGroup([{id:'1',top:-200},{id:'2',top:250}], {...position,current:'1'}), '2');
  assert.equal(readingGroup([], position), null);
});
test('small scroll changes at a boundary do not toggle two cards repeatedly', () => {
  const anchors = [{id:'1',top:-100},{id:'2',top:295}];
  assert.equal(readingGroup(anchors, {...position,current:'1'}), '1');
  assert.equal(readingGroup([{id:'1',top:-100},{id:'2',top:270}], {...position,current:'1'}), '2');
  assert.equal(readingGroup([{id:'1',top:0},{id:'2',top:310}], {...position,current:'2',direction:-1}), '2');
  assert.equal(readingGroup([{id:'1',top:0},{id:'2',top:340}], {...position,current:'2',direction:-1}), '1');
});
test('position correction cannot send the reader back to an earlier group', () => {
  assert.equal(readingGroup([{id:'1',top:100},{id:'2',top:500}], {...position,current:'2'}), '2');
  assert.equal(readingGroup([{id:'1',top:-300},{id:'2',top:100}], {...position,current:'1',direction:-1}), '1');
});
test('fast scrolling can skip directly to the group being read', () => {
  assert.equal(readingGroup([{id:'1',top:-600},{id:'2',top:-100},{id:'3',top:295}], {...position,current:'1'}), '3');
});
test('the last group still opens when its header cannot reach the upper reading area', () => {
  assert.equal(readingGroup([{id:'9',top:50},{id:'10',top:500}], {...position,current:'9',atBottom:true}), '10');
  assert.equal(readingGroup([{id:'9',top:50},{id:'10',top:900}], {...position,current:'9',atBottom:true}), '9');
});
