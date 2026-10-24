'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { readingGroup, type ReadingAnchor, type ReadingPosition } from '@/lib/reading-group';

export function useScrollContacts(ids: string[], filter: RefObject<HTMLDivElement | null>) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [automatic, setAutomatic] = useState(true);
  const elements = useRef(new Map<string, HTMLElement>());
  const current = useRef<string | null>(null);
  const lastScroll = useRef(0);
  const anchor = useRef<{ element: HTMLElement; documentTop: number } | null>(null);
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
    const element = id ? elements.current.get(id) : undefined;
    anchor.current = compensate && element ? { element, documentTop: element.getBoundingClientRect().top + window.scrollY } : null;
    current.current = id;
    setAutomatic(compensate);
    setExpandedId(id);
  }, []);

  useLayoutEffect(() => {
    const pending = anchor.current;
    anchor.current = null;
    if (!pending?.element.isConnected) return;
    const shift = pending.element.getBoundingClientRect().top + window.scrollY - pending.documentTop;
    if (Math.abs(shift) > .5) window.scrollBy({ top: shift, behavior: 'instant' });
    // Ignore the scroll event produced by our own position correction.
    lastScroll.current = window.scrollY;
  }, [expandedId]);

  useEffect(() => {
    const orderedIds: string[] = JSON.parse(signature);
    let frame = 0;
    let direction: -1 | 0 | 1 = 0;
    manual.current = null;
    anchor.current = null;
    current.current = null;
    setExpandedId(null);
    setAutomatic(true);
    lastScroll.current = window.scrollY;

    function update() {
      frame = 0;
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
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
    };
  }, [signature, measure, change]);

  function toggle(id: string) {
    const { anchors, position } = measure(ids, 0);
    manual.current = { candidate: ids.length === 1 ? ids[0] : readingGroup(anchors, { ...position, current: null }) };
    change(current.current === id ? null : id, false);
  }

  return { expandedId, automatic, register, toggle };
}
