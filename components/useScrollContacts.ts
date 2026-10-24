'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { readingGroup, type ReadingAnchor, type ReadingPosition } from '@/lib/reading-group';

export function useScrollContacts(ids: string[], filter: RefObject<HTMLDivElement | null>) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const current = useRef<string | null>(null);
  const lastScroll = useRef(0);
  const motion = useRef<{
    element: HTMLElement; documentTop: number; compensate: boolean; panels: HTMLElement[];
  } | null>(null);
  const animating = useRef(false);
  const scheduleUpdate = useRef<() => void>(() => {});
  const captureScroll = useRef<() => void>(() => {});
  const manual = useRef<{ candidate: string | null } | null>(null);
  const signature = JSON.stringify(ids);

  const register = useCallback((id: string, element: HTMLElement | null) => {
    if (element) elements.current.set(id, element);
    else elements.current.delete(id);
  }, []);

  const measure = useCallback((orderedIds: string[], direction: -1 | 0 | 1) => {
    const viewportHeight = window.innerHeight;
    const nav = filter.current?.closest('.b3-app')?.querySelector('.category-nav');
    const covered = Math.min(viewportHeight - 100, Math.max(nav?.getBoundingClientRect().bottom ?? 70, filter.current?.getBoundingClientRect().bottom ?? 70));
    const anchors: ReadingAnchor[] = orderedIds.flatMap(id => {
      const element = elements.current.get(id);
      return element ? [{ id, top: element.getBoundingClientRect().top }] : [];
    });
    const position: ReadingPosition = {
      line: covered + Math.min(112, (viewportHeight - covered) * .25),
      current: current.current, direction, viewportHeight,
      atBottom: document.documentElement.scrollHeight - viewportHeight - window.scrollY < 32,
    };
    return { anchors, position };
  }, [filter]);

  const change = useCallback((id: string | null, auto: boolean) => {
    if (current.current === id) return;
    const compensate = auto || !!(current.current && id);
    const element = elements.current.get(id ?? current.current ?? '');
    const panels = [current.current, id].flatMap(cardId => {
      const panel = cardId ? elements.current.get(cardId)?.querySelector<HTMLElement>('.b3-contact-collapse') : null;
      return panel ? [panel] : [];
    });
    motion.current = element ? {
      element, documentTop: element.getBoundingClientRect().top + window.scrollY, compensate, panels,
    } : null;
    current.current = id;
    setExpandedId(id);
  }, []);

  useLayoutEffect(() => {
    const pending = motion.current;
    motion.current = null;
    if (!pending) return;
    let frame = 0;
    animating.current = true;

    const followMotion = () => {
      if (!pending.element.isConnected) {
        animating.current = false;
        return;
      }
      // Preserve genuine scrolling, then compensate only for the changing height above this card.
      captureScroll.current();
      const documentTop = pending.element.getBoundingClientRect().top + window.scrollY;
      const shift = documentTop - pending.documentTop;
      pending.documentTop = documentTop;
      if (pending.compensate && Math.abs(shift) > .01) {
        window.scrollBy({ top: shift, behavior: 'instant' });
        lastScroll.current = window.scrollY;
      }
      // Use the actual CSS transition lifetime, including reversals and reduced-motion settings.
      const moving = pending.panels.some(panel => panel.getAnimations().some(animation => animation.pending || animation.playState === 'running'));
      if (moving) frame = requestAnimationFrame(followMotion);
      else {
        animating.current = false;
        scheduleUpdate.current();
      }
    };
    followMotion();
    return () => {
      cancelAnimationFrame(frame);
      animating.current = false;
    };
  }, [expandedId]);

  useEffect(() => {
    const orderedIds: string[] = JSON.parse(signature);
    let frame = 0;
    let direction: -1 | 0 | 1 = 0;
    manual.current = null;
    motion.current = null;
    current.current = null;
    setExpandedId(null);
    lastScroll.current = window.scrollY;

    function update() {
      frame = 0;
      // Re-evaluate once the cards settle; intermediate heights must not switch the active group.
      if (animating.current) return;
      const focused = document.activeElement;
      if (focused?.matches(':focus-visible') && focused.closest('.b3-contact-collapse[data-open=true]')) return;
      const { anchors, position } = measure(orderedIds, direction);
      const candidate = orderedIds.length === 1 ? orderedIds[0] : readingGroup(anchors, { ...position, current: null, direction: 0 });
      let releasedManual = false;
      if (manual.current) {
        if (manual.current.candidate === candidate) return;
        manual.current = null;
        releasedManual = true;
      }
      change(orderedIds.length === 1 ? orderedIds[0] : readingGroup(anchors, { ...position, current: releasedManual ? null : current.current }), true);
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    function scroll() {
      const delta = window.scrollY - lastScroll.current;
      if (Math.abs(delta) < .5) return;
      direction = delta > 0 ? 1 : -1;
      lastScroll.current = window.scrollY;
      schedule();
    }
    function resize() { direction = 0; schedule(); }
    scheduleUpdate.current = schedule;
    captureScroll.current = scroll;
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
      scheduleUpdate.current = () => {};
      captureScroll.current = () => {};
    };
  }, [signature, measure, change]);

  function toggle(id: string) {
    const { anchors, position } = measure(ids, 0);
    manual.current = { candidate: ids.length === 1 ? ids[0] : readingGroup(anchors, { ...position, current: null }) };
    change(current.current === id ? null : id, false);
  }

  return { expandedId, register, toggle };
}
