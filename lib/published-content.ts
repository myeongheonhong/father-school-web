import { type Content, type Edition, parseContent, sitePath } from './content';

export async function readPublishedContent(edition: Edition | undefined, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<Content> {
  const filename = edition ? `content-${edition.toLowerCase()}.json` : 'content.json';
  // A fresh URL also avoids previously stored responses in intermediary caches.
  const response = await fetcher(sitePath(`/${filename}?fresh=${Date.now()}-${Math.random().toString(36).slice(2)}`), {
    cache: 'no-store', signal,
  });
  if (!response.ok) throw new Error('최신 안내를 확인하지 못했습니다.');
  return parseContent(await response.text());
}

export function mergePublishedContent(current: Content, incoming: Content): Content {
  // A delayed response or an edge still serving an older deployment must not undo a newer read.
  if (Date.parse(incoming.updatedAt) < Date.parse(current.updatedAt)) return current;
  return JSON.stringify(current) === JSON.stringify(incoming) ? current : incoming;
}
