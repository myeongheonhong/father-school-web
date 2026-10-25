import type { Content } from '../../lib/content';
export const fixture: Content = {
  schemaVersion: 1, defaultVariant: 'B', updatedAt: '2026-10-25T00:00:00.000Z',
  weeks: [1, 2, 3].map(n => ({ title: `${n}주차 테스트`, date: '2026.10.25', time: '오후 2시', scripture: '테스트 본문', speaker: '테스트 강사', poster: `/posters/week-${n}.png`, worship: '찬양 | 다 함께', questions: ['테스트 질문'] })),
  groupPlace: '5층', groupNotice: '테스트 안내', groups: [
    { id: 'one', name: '1조', leader: '김조장', members: '박조원\n이조원', notice: '', contacts: [{ name: '김조장', phone: '010-0000-0001' }, { name: '박조원', phone: '010-0000-0002' }, { name: '이조원', phone: '' }] },
    { id: 'ten', name: '10조', leader: '정조장', members: '김조원', notice: '', contacts: [{ name: '정조장', phone: '010-0000-0003' }, { name: '김조원', phone: '010-0000-0004' }] },
  ],
};
