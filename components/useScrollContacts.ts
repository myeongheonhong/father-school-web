'use client';
import { useCallback, useEffect, useReducer, useRef, useState, type RefObject } from 'react';
import { readingGroup, type ReadingAnchor, type ReadingPosition } from '@/lib/reading-group';
import { contactRevealReducer, createContactRevealState } from '@/lib/contact-reveal';

export function useScrollContacts(ids: string[], filter: RefObject<HTMLDivElement | null>) {
  const [reveal, dispatch] = useReducer(contactRevealReducer, undefined, createContactRevealState);
  const [readingId, setReadingId] = useState<string | null>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const current = useRef<string | null>(null);
  const signature = JSON.stringify(ids);

  const register = useCallback((id: string, element: HTMLElement | null) => {
    if (element) elements.current.set(id, element);
    else elements.current.delete(id);
  }, []);
  const toggle = useCallback((id: string) => dispatch({ type: 'toggle', id }), []);

  useEffect(() => {
    const orderedIds: string[] = JSON.parse(signature);
    let frame = 0;
    let idle = 0;
    let scrolling = false;
    let lastScroll = window.scrollY;
    let direction: -1 | 0 | 1 = 0;
    current.current = null;
    setReadingId(null);

    function update() {
      frame = 0;
      if (scrolling) return;
      const focused = document.activeElement;
      if (focused?.matches(':focus-visible') && focused.closest('.b3-contact-collapse[data-open=true]')) return;
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
      const next = orderedIds.length === 1 ? orderedIds[0] : readingGroup(anchors, position);
      if (current.current !== next) {
        current.current = next;
        setReadingId(next);
      }
      // Opening adds content below this heading. Previously revealed groups never collapse on scroll.
      if (next) dispatch({ type: 'reveal', id: next });
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    function pause() {
      scrolling = true;
      window.clearTimeout(idle);
      idle = window.setTimeout(() => { scrolling = false; schedule(); }, 160);
    }
    function scroll() {
      const delta = window.scrollY - lastScroll;
      if (Math.abs(delta) < .5) return;
      direction = delta > 0 ? 1 : -1;
      lastScroll = window.scrollY;
      pause();
    }
    function resize() { direction = 0; pause(); }
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
    };
  }, [signature, filter]);

  return { expandedIds: reveal.expanded, readingId, register, toggle };
}
