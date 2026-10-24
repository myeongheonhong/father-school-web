import type { Group } from './content';
import { groupPeople } from './groups';

export function groupContacts(group: Group) {
  const contacts = new Map(group.contacts?.map(contact => [contact.name, contact.phone]));
  return groupPeople(group).map(person => ({ ...person, phone: contacts.get(person.name) ?? '' }));
}

export function formatPhone(phone: string): string {
  return phone.replace(/^(01\d)(\d{3,4})(\d{4})$/, '$1-$2-$3');
}

export function phoneHref(phone: string): string | undefined {
  const digits = phone.replace(/-/g, '');
  return /^01[016789]\d{7,8}$/.test(digits) ? `tel:${digits}` : undefined;
}
