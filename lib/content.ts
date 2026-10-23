export const variants = ['A', 'B', 'C'] as const;
export type Variant = typeof variants[number];
export type Week = { title: string; date: string; time: string; scripture: string; speaker: string; poster: string; worship: string; questions: string[] };
export type Group = { id: string; name: string; leader: string; members: string; notice: string };
export type Content = { schemaVersion: 1; defaultVariant: Variant | null; updatedAt: string; weeks: Week[]; groupPlace: string; groupNotice: string; groups: Group[] };
export const MAX_CONTENT_BYTES = 15 * 1024 * 1024;
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/father-school-web';
export const sitePath = (path: string) => `${basePath}${path}`;
export const posterPath = (path: string) => path.startsWith('data:') ? path : sitePath(path);
export const githubUpload = 'https://github.com/myeongheonhong/father-school-web/upload/main/public';
export const githubRuns = 'https://github.com/myeongheonhong/father-school-web/actions';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('안내 파일의 형식이 올바르지 않습니다.');
  return value as Record<string, unknown>;
}
function str(value: unknown, label: string, max = 200, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(`${label}을(를) 확인해주세요.`);
  return value;
}
export function validateContent(input: unknown): Content {
  const data = record(input);
  if (data.schemaVersion !== 1) throw new Error('지원하지 않는 안내 파일 버전입니다.');
  if (data.defaultVariant !== null && !variants.includes(data.defaultVariant as Variant)) throw new Error('메인 디자인을 확인해주세요.');
  if (!Array.isArray(data.weeks) || data.weeks.length !== 3) throw new Error('1–3주차 안내가 모두 필요합니다.');
  if (!Array.isArray(data.groups) || data.groups.length > 100) throw new Error('조는 최대 100개까지 등록할 수 있습니다.');
  const weeks = data.weeks.map((item, index): Week => {
    const w = record(item), label = `${index + 1}주차`;
    const poster = str(w.poster, `${label} 이미지`, 5 * 1024 * 1024, true);
    if (!/^\/posters\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(poster) && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(poster)) throw new Error(`${label} 이미지 형식이 올바르지 않습니다.`);
    if (!Array.isArray(w.questions) || w.questions.length > 10) throw new Error(`${label} 나눔 질문을 확인해주세요.`);
    return {
      title: str(w.title, `${label} 제목`, 120, true), date: str(w.date, `${label} 날짜`, 80, true), time: str(w.time, `${label} 시간`, 80, true),
      scripture: str(w.scripture, '성경 본문'), speaker: str(w.speaker, '강사'), poster,
      worship: str(w.worship, '예배 순서', 2000), questions: w.questions.map(q => str(q, '나눔 질문', 2000)),
    };
  });
  const ids = new Set<string>();
  const groups = data.groups.map((item): Group => {
    const g = record(item), id = str(g.id, '조 ID', 100, true);
    if (ids.has(id)) throw new Error('중복된 조 ID가 있습니다.');
    ids.add(id);
    return { id, name: str(g.name, '조 이름', 100, true), leader: str(g.leader, '조장', 100), members: str(g.members, '조원', 3000), notice: str(g.notice, '조별 안내', 1000) };
  });
  const updatedAt = str(data.updatedAt, '저장 날짜', 80, true);
  if (!Number.isFinite(Date.parse(updatedAt))) throw new Error('저장 날짜가 올바르지 않습니다.');
  return { schemaVersion: 1, defaultVariant: data.defaultVariant as Variant | null, updatedAt, weeks, groups, groupPlace: str(data.groupPlace, '모임 장소', 120, true), groupNotice: str(data.groupNotice, '공통 안내', 1000) };
}
export function parseContent(text: string): Content {
  if (new TextEncoder().encode(text).length > MAX_CONTENT_BYTES) throw new Error('15MB 이하의 안내 파일을 선택해주세요.');
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new Error('올바른 JSON 안내 파일을 선택해주세요.'); }
  return validateContent(json);
}
export function exportContent(data: Content): string {
  const text = JSON.stringify(validateContent({ ...data, updatedAt: new Date().toISOString() }), null, 2) + '\n';
  parseContent(text);
  return text;
}
