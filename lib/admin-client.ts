import { type Content, parseContent } from './content';

export const participantURL = 'https://myeongheonhong.github.io/father-school-web/';
export const adminOrigin = process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? '';
export const MAX_PUBLISH_BYTES = 3 * 1024 * 1024;

export async function adminRequest<T>(action: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/admin?action=${action}`, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
  const result = await response.json().catch(() => ({ error: response.status === 413 ? '이미지가 너무 큽니다. 더 작은 이미지로 변경해주세요.' : '관리 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.' }));
  if (!response.ok) throw new Error(result.error ?? '요청을 처리하지 못했습니다.');
  return result as T;
}

export async function readRemote(): Promise<{ data: Content; revision: string }> {
  const result = await adminRequest<{ text: string; revision: string }>('content');
  return { data: parseContent(result.text), revision: result.revision };
}
