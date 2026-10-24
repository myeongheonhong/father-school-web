export type ReadingAnchor = { id: string; top: number };
export type ReadingPosition = { line: number; current: string | null; direction: -1 | 0 | 1; atBottom: boolean; viewportHeight: number };

// A small boundary keeps slow scrolling from repeatedly opening adjacent cards.
export function readingGroup(anchors: ReadingAnchor[], position: ReadingPosition): string | null {
  const { line, current, direction, atBottom, viewportHeight } = position;
  if (!anchors.length) return null;
  const last = anchors[anchors.length - 1];
  const previous = anchors.findIndex(anchor => anchor.id === current);
  if (atBottom && direction > 0 && last.top < viewportHeight - 56) {
    // Closing the preceding card creates room to keep scrolling. Read it before opening the last.
    const index = previous < anchors.length - 2 ? Math.max(0, anchors.length - 2) : anchors.length - 1;
    return anchors[index].id;
  }
  let candidate = -1;
  anchors.forEach((anchor, index) => { if (anchor.top <= line) candidate = index; });
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
