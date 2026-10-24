import test from 'node:test';
import assert from 'node:assert/strict';
import { trackContactMotion, type ContactMotionLayout } from '../lib/contact-motion';

function fixture({ above = true, compensate = true, animated = true, initialTop = 1200 } = {}) {
  let height = animated ? 353 : 0;
  let top = initialTop;
  let sizeListener: Parameters<ContactMotionLayout['observe']>[1] | undefined;
  let resolve!: () => void;
  const finished = new Promise<void>(done => { resolve = done; });
  const shifts: number[] = [];
  const stats = { topReads: 0, heightReads: 0, animationQueries: 0, observers: 0, disconnects: 0, complete: 0 };
  function setHeight(next: number) {
    if (above) top += next - height;
    height = next;
  }
  const animation = { finished, finish() { setHeight(0); resolve(); } } as unknown as Animation;
  const panel = {
    getAnimations() { stats.animationQueries++; return animated ? [animation] : []; },
    getBoundingClientRect() { stats.heightReads++; return { height }; },
  } as unknown as HTMLElement;
  const anchor = { isConnected: true } as HTMLElement;
  const layout: ContactMotionLayout = {
    documentTop() { stats.topReads++; return top; },
    observe(elements, listener) {
      assert.deepEqual(elements, [panel]);
      stats.observers++;
      sizeListener = listener;
      return () => { stats.disconnects++; };
    },
  };
  const controller = trackContactMotion({ element: anchor, documentTop: 1200, panels: [{ element: panel, above }], compensate },
    delta => shifts.push(delta), () => { stats.complete++; }, layout);
  return {
    controller, stats, shifts,
    resize(next: number) { setHeight(next); sizeListener?.([{ element: panel, height }]); },
    async settle() {
      setHeight(0);
      resolve();
      await new Promise<void>(done => setImmediate(done));
    },
  };
}

test('accordion size updates preserve position without polling geometry or animations each frame', async () => {
  const f = fixture();
  for (const height of [340, 310, 260, 210, 160, 120, 80, 40, 10, 0]) f.resize(height);
  assert.equal(f.stats.topReads, 1);
  assert.equal(f.stats.heightReads, 1);
  assert.equal(f.stats.animationQueries, 1);
  assert.equal(f.shifts.reduce((sum, shift) => sum + shift, 0), -353);
  await f.settle();
  assert.equal(f.stats.topReads, 2);
  assert.equal(f.stats.complete, 1);
  assert.equal(f.stats.disconnects, 1);
});

test('a new gesture finishes once and releases the observer before native scrolling continues', async () => {
  const f = fixture();
  f.resize(250);
  f.controller.finish();
  assert.equal(f.shifts.reduce((sum, shift) => sum + shift, 0), -353);
  assert.equal(f.stats.disconnects, 1);
  assert.equal(f.stats.complete, 1);
  const corrections = f.shifts.length;
  f.resize(0);
  f.controller.finish();
  await f.settle();
  assert.equal(f.shifts.length, corrections);
  assert.equal(f.stats.complete, 1);
});

test('upward transitions and manual collapse need no size observer or scroll correction', async () => {
  for (const options of [{ above: false }, { compensate: false }]) {
    const f = fixture(options);
    f.resize(160);
    await f.settle();
    assert.equal(f.stats.observers, 0);
    assert.deepEqual(f.shifts, []);
    assert.equal(f.stats.complete, 1);
  }
});

test('unmounting ignores queued size notifications and animation completion', async () => {
  const f = fixture();
  f.controller.cancel();
  f.resize(0);
  await f.settle();
  assert.deepEqual(f.shifts, []);
  assert.equal(f.stats.disconnects, 1);
  assert.equal(f.stats.complete, 0);
});

test('reduced-motion changes compensate immediately without starting an observer', () => {
  const f = fixture({ animated: false, initialTop: 847 });
  assert.deepEqual(f.shifts, [-353]);
  assert.equal(f.stats.observers, 0);
  assert.equal(f.stats.complete, 1);
});
