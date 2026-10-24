export type ReadingAnchor = { id: string; top: number };
export type ReadingPosition = { line: number; current: string | null; direction: -1 | 0 | 1; atBottom: boolean; viewportHeight: number };

// A small boundary keeps slow scrolling from repeatedly opening adjacent cards.
export function readingGroup(anchors: ReadingAnchor[], position: ReadingPosition): string | null {
  const { line, current, direction, atBottom, viewportHeight } = position;
  if (!anchors.length) return null;
  const last = anchors[anchors.length - 1];
  if (atBottom && last.top < viewportHeight - 56) return last.id;
  let candidate = -1;
  anchors.forEach((anchor, index) => { if (anchor.top <= line) candidate = index; });
  const previous = anchors.findIndex(anchor => anchor.id === current);
  if (previous >= 0) {
    if (direction > 0 && candidate < previous) return current;
    if (direction < 0 && candidate > previous) return current;
    if (candidate !== previous) {
      const boundary = candidate > previous ? anchors[candidate].top : anchors[previous].top;
      if (Math.abs(candidate - previous) <= 1 && Math.abs(boundary - line) < 24) return current;
    }
  }
  return candidate >= 0 ? anchors[candidate].id : null;
}
