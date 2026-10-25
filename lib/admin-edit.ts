import { type Content, type Group, validateContent } from './content';
import { groupContacts, formatPhone } from './contacts';
export { sameContent } from './content';

export function editPerson(group: Group, oldName: string | null, name: string, phone: string): Group {
  name = name.trim();
  phone = formatPhone(phone.trim());
  if (!name || name.length > 100 || /[,，\n]/.test(name)) throw new Error('이름을 한 명씩 입력해주세요.');
  if (phone && !/^01[016789]-\d{3,4}-\d{4}$/.test(phone)) throw new Error('전화번호를 확인해주세요. 예: 010-1234-5678');
  const people = groupContacts(group);
  if (people.some(p => p.name === name && p.name !== oldName)) throw new Error('같은 조에 이미 있는 이름입니다. 동명이인은 이름 뒤에 구분을 붙여주세요.');
  if (oldName !== null && !people.some(p => p.name === oldName)) throw new Error('수정할 조원을 다시 선택해주세요.');
  if (oldName === null && people.length >= 100) throw new Error('한 조에는 최대 100명까지 등록할 수 있습니다.');
  const next = oldName === null ? [...people, { name, phone, leader: false }] : people.map(p => p.name === oldName ? { ...p, name, phone } : p);
  return { ...group, leader: next.find(p => p.leader)?.name ?? '', members: next.filter(p => !p.leader).map(p => p.name).join('\n'), contacts: next.map(({ name, phone }) => ({ name, phone })) };
}

export function removePerson(group: Group, name: string): Group {
  const people = groupContacts(group).filter(p => p.name !== name);
  return { ...group, leader: people.find(p => p.leader)?.name ?? '', members: people.filter(p => !p.leader).map(p => p.name).join('\n'), contacts: people.map(({ name, phone }) => ({ name, phone })) };
}

export function validateDraft(data: Content): Content {
  return validateContent({ ...data, updatedAt: new Date().toISOString() });
}
