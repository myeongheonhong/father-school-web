'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { readingGroup, type ReadingAnchor, type ReadingPosition } from '@/lib/reading-group';
import { trackContactMotion, type ContactMotion } from '@/lib/contact-motion';

export function useScrollContacts(ids: string[], filter: RefObject<HTMLDivElement | null>) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const current = useRef<string | null>(null);
  const lastScroll = useRef(0);
  const motion = useRef<ContactMotion | null>(null);
  const animating = useRef(false);
  const scrolling = useRef(false);
  const scheduleUpdate = useRef<() => void>(() => {});
  const finishMotion = useRef<() => void>(() => {});
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
      const card = cardId ? elements.current.get(cardId) : undefined;
      const panel = card?.querySelector<HTMLElement>('.b3-contact-collapse');
      return panel ? [{ element: panel, above: !!(card && element && card !== element && (card.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)) }] : [];
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
    animating.current = true;
    const controller = trackContactMotion(pending, delta => {
      window.scrollBy({ top: delta, behavior: 'instant' });
      lastScroll.current = window.scrollY;
    }, () => {
      animating.current = false;
      scheduleUpdate.current();
    });
    finishMotion.current = controller.finish;
    return () => {
      controller.cancel();
      finishMotion.current = () => {};
      animating.current = false;
    };
  }, [expandedId]);

  useEffect(() => {
    const orderedIds: string[] = JSON.parse(signature);
    let frame = 0;
    let idle = 0;
    let direction: -1 | 0 | 1 = 0;
    manual.current = null;
    motion.current = null;
    current.current = null;
    setExpandedId(null);
    scrolling.current = false;
    lastScroll.current = window.scrollY;

    function update() {
      frame = 0;
      // Keep native scrolling free of layout changes; reveal contacts once the reader pauses.
      if (animating.current || scrolling.current) return;
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
      scrolling.current = true;
      window.clearTimeout(idle);
      finishMotion.current();
      idle = window.setTimeout(() => { scrolling.current = false; schedule(); }, 120);
    }
    function interrupt() { finishMotion.current(); }
    function keydown(event: KeyboardEvent) {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) interrupt();
    }
    function resize() { finishMotion.current(); direction = 0; schedule(); }
    scheduleUpdate.current = schedule;
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('wheel', interrupt, { passive: true });
    window.addEventListener('pointerdown', interrupt, { passive: true });
    window.addEventListener('touchstart', interrupt, { passive: true });
    window.addEventListener('keydown', keydown);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
      window.removeEventListener('wheel', interrupt);
      window.removeEventListener('pointerdown', interrupt);
      window.removeEventListener('touchstart', interrupt);
      window.removeEventListener('keydown', keydown);
      scheduleUpdate.current = () => {};
    };
  }, [signature, measure, change]);

  const toggle = useCallback((id: string) => {
    finishMotion.current();
    const orderedIds: string[] = JSON.parse(signature);
    const { anchors, position } = measure(orderedIds, 0);
    manual.current = { candidate: orderedIds.length === 1 ? orderedIds[0] : readingGroup(anchors, { ...position, current: null }) };
    change(current.current === id ? null : id, false);
  }, [signature, measure, change]);

  return { expandedId, register, toggle };
}
