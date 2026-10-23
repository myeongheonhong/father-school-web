import type { Group } from './content';

export type GroupPerson = { name: string; leader: boolean };
export const normalizeSearch = (value: string) => value.normalize('NFC').replace(/\s/g, '').toLocaleLowerCase('ko-KR');
export function groupPeople(group: Group): GroupPerson[] {
  const leader = group.leader.trim();
  const members = [...new Set(group.members.split(/[,，\n]+/).map(name => name.trim()).filter(Boolean))].filter(name => name !== leader);
  return [...(leader ? [{ name: leader, leader: true }] : []), ...members.map(name => ({ name, leader: false }))];
}
export function matchingPeople(group: Group, search: string): GroupPerson[] {
  const query = normalizeSearch(search);
  return query ? groupPeople(group).filter(person => normalizeSearch(person.name).includes(query)) : [];
}
export function matchesGroup(group: Group, search: string): boolean {
  const query = normalizeSearch(search);
  return !query || normalizeSearch(group.name).includes(query) || matchingPeople(group, query).length > 0;
}
