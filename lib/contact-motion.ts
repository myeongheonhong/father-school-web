export type ContactMotion = {
  element: HTMLElement;
  documentTop: number;
  compensate: boolean;
  panels: { element: HTMLElement; above: boolean }[];
};

type PanelSize = { element: HTMLElement; height: number };
export type ContactMotionLayout = {
  documentTop: (element: HTMLElement) => number;
  observe: (elements: HTMLElement[], onSize: (sizes: PanelSize[]) => void) => () => void;
};

const browserLayout: ContactMotionLayout = {
  documentTop: element => element.getBoundingClientRect().top + window.scrollY,
  observe(elements, onSize) {
    const observer = new ResizeObserver(entries => onSize(entries.map(entry => ({
      element: entry.target as HTMLElement,
      height: entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height,
    }))));
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  },
};

// Read geometry only at the start/end. During the transition, use sizes already calculated by the browser.
export function trackContactMotion(
  motion: ContactMotion,
  onShift: (delta: number) => void,
  onComplete: () => void,
  layout: ContactMotionLayout = browserLayout,
) {
  const animations = motion.panels.flatMap(panel => panel.element.getAnimations());
  const above = motion.panels.filter(panel => panel.above);
  const heights = new Map(above.map(panel => [panel.element, panel.element.getBoundingClientRect().height]));
  let expectedTop = layout.documentTop(motion.element);
  let done = false;
  let unobserve = () => {};

  function shift(delta: number) {
    if (motion.compensate && Math.abs(delta) > .01) onShift(delta);
  }
  function stopObserving() { unobserve(); unobserve = () => {}; }
  function complete() {
    if (done) return;
    done = true;
    stopObserving();
    if (motion.element.isConnected) shift(layout.documentTop(motion.element) - expectedTop);
    onComplete();
  }

  shift(expectedTop - motion.documentTop);
  if (animations.length) {
    if (motion.compensate && above.length) {
      unobserve = layout.observe(above.map(panel => panel.element), sizes => {
        if (done) return;
        let delta = 0;
        for (const { element, height } of sizes) {
          const previous = heights.get(element);
          if (previous === undefined) continue;
          delta += height - previous;
          heights.set(element, height);
        }
        expectedTop += delta;
        shift(delta);
      });
    }
    void Promise.allSettled(animations.map(animation => animation.finished)).then(complete);
  } else complete();

  return {
    finish() {
      if (done) return;
      stopObserving();
      // A new gesture takes priority: settle once before native scrolling continues.
      for (const animation of animations) {
        try { animation.finish(); } catch { /* A detached/cancelled transition may already be idle. */ }
      }
      complete();
    },
    cancel() { done = true; stopObserving(); },
  };
}
