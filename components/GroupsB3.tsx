'use client';
import { useEffect, useRef, useState } from 'react';
import type { Content, Group } from '@/lib/content';
import { groupContacts, formatPhone, phoneHref } from '@/lib/contacts';
import { groupPeople, matchesGroup, matchingPeople, normalizeSearch } from '@/lib/groups';
import { Icon } from './ui';

function Highlight({ name, search }: { name: string; search: string }) {
  const query = normalizeSearch(search), index = normalizeSearch(name).indexOf(query);
  if (!query || index < 0) return <>{name}</>;
  return <>{name.slice(0, index)}<mark>{name.slice(index, index + query.length)}</mark>{name.slice(index + query.length)}</>;
}

function ContactCard({ group, search }: { group: Group; search: string }) {
  const [expanded, setExpanded] = useState(false);
  const people = groupContacts(group);
  const members = people.filter(person => !person.leader);
  return <article className="b3-contact-card b3-roster-card" aria-labelledby={`b3-title-${group.id}`}>
    <header><h2 id={`b3-title-${group.id}`}>{group.name}</h2><div className="b3-card-leader"><span>조장</span><strong><Highlight name={group.leader || '등록 예정'} search={search} /></strong></div><span className="b3-card-count"><Icon name="people" />{people.length}명</span></header>
    <div className="b3-member-summary"><p>함께하는 조원</p><ul className="b2-people" aria-label={`${group.name} 조원 명단`}>{members.map(person => <li key={person.name}><Highlight name={person.name} search={search} /></li>)}</ul>{!members.length && <p className="b3-members-empty">조원 명단을 준비하고 있습니다.</p>}</div>
    <button className="b3-contact-toggle" aria-label={`${group.name} 연락처 ${expanded ? '접기' : '보기'}`} aria-expanded={expanded} aria-controls={`b3-contacts-${group.id}`} onClick={() => setExpanded(!expanded)}><span><Icon name="phone" />연락처 {expanded ? '접기' : '보기'}</span><Icon name="chevron-down" /></button>
    <div className="b3-contact-collapse" data-open={expanded} id={`b3-contacts-${group.id}`} aria-hidden={!expanded} inert={!expanded}><div>
    <div className="b3-contact-labels" aria-hidden="true"><span>이름</span><span>연락처</span></div>
    <ul className="b3-contact-list" aria-label={`${group.name} 연락처 명단`}>
      {people.map(person => <li key={person.name} className={person.leader ? 'is-leader' : ''}>
        <div className="b3-contact-name"><span>{person.leader ? '조장' : '조원'}</span><strong><Highlight name={person.name} search={search} /></strong></div>
        {phoneHref(person.phone) ? <a href={phoneHref(person.phone)} aria-label={`${person.name}님에게 전화 ${formatPhone(person.phone)}`}><span>{formatPhone(person.phone)}</span><Icon name="phone" /></a> : <span className="b3-phone-empty">등록 예정</span>}
      </li>)}
    </ul>
    </div></div>
    {group.notice && <p className="b3-card-notice"><Icon name="pin" />{group.notice}</p>}
  </article>;
}

export default function GroupsB3({ data }: { data: Content }) {
  const [selected, setSelected] = useState('all');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const filter = useRef<HTMLDivElement>(null);
  useEffect(() => { if (searchOpen) input.current?.focus(); }, [searchOpen]);
  const query = normalizeSearch(search);
  const visible = data.groups.filter(group => query ? matchesGroup(group, query) : selected === 'all' || group.id === selected);
  const total = data.groups.reduce((sum, group) => sum + groupPeople(group).length, 0);
  const found = visible.reduce((sum, group) => sum + matchingPeople(group, query).length, 0);
  const selectedName = data.groups.find(group => group.id === selected)?.name ?? '전체';

  function selectGroup(id: string) {
    setSelected(id); setSearch(''); setSearchOpen(false);
    const nav = filter.current;
    if (nav && nav.getBoundingClientRect().top <= 71) requestAnimationFrame(() => nav.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
  }
  function closeSearch() { setSearch(''); setSearchOpen(false); trigger.current?.focus(); }

  return <div className="b3-groups">
    <section className="b3-group-intro"><div className="b3-intro-heading"><span className="b3-section-label"><Icon name="people" />함께하는 기도</span><span>{data.groups.length}개 조 · {total}명</span></div><h1>조편성 안내</h1><p>이름은 한눈에, 연락처는 필요할 때 확인하세요.</p><div className="b3-meeting"><Icon name="pin" /><strong>조별 나눔 · 식사 {data.groupPlace}</strong></div>{data.groupNotice && <p className="b3-meeting-note">{data.groupNotice}</p>}</section>
    <div className="b3-group-filter" ref={filter} role="group" aria-label="조 선택">
      <button className="b3-filter-all" aria-pressed={selected === 'all'} aria-controls="b3-group-results" onClick={() => selectGroup('all')}><Icon name="list" /><strong>전체</strong><small>{total}명</small></button>
      {data.groups.map(group => <button key={group.id} aria-pressed={selected === group.id} aria-controls="b3-group-results" onClick={() => selectGroup(group.id)}>{group.name}</button>)}
    </div>
    <div className="b3-roster-toolbar"><div><h2>{query ? '이름 검색 결과' : selected === 'all' ? '전체 명단' : `${selectedName} 명단`}</h2><p role="status" aria-live="polite" aria-atomic="true">{query ? `전체에서 ${visible.length}개 조${found ? ` · ${found}명` : ''}을 찾았어요` : selected === 'all' ? `${data.groups.length}개 조를 모두 보고 있어요` : '필요하면 연락처 보기를 눌러주세요'}</p></div><button ref={trigger} onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)} aria-expanded={searchOpen} aria-controls="b3-search-panel"><Icon name={searchOpen ? 'close' : 'search'} />{searchOpen ? '닫기' : '이름 찾기'}</button></div>
    {searchOpen && <div className="b3-search-panel" id="b3-search-panel"><label htmlFor="b3-name-search">어느 조에 계신가요?</label><div className="b2-search"><Icon name="search" /><input id="b3-name-search" ref={input} type="search" value={search} onChange={e => { setSearch(e.target.value); setSelected('all'); }} placeholder="전체 명단에서 이름으로 찾기" autoComplete="off" spellCheck={false} maxLength={100} enterKeyHint="search" aria-controls="b3-group-results" onKeyDown={e => { if (e.key === 'Escape') closeSearch(); }} />{search && <button aria-label="검색어 지우기" onClick={() => { setSearch(''); input.current?.focus(); }}><Icon name="close" /></button>}</div></div>}
    <div className="b3-roster-results" id="b3-group-results" key={`${selected}-${query}`}>
      {visible.length ? visible.map(group => <ContactCard key={group.id} group={group} search={search} />) : <div className="b2-no-results"><span><Icon name="search" /></span><h2>{data.groups.length ? '일치하는 이름이 없어요' : '조편성을 준비하고 있어요'}</h2><p>{data.groups.length ? '이름을 다시 확인하거나 전체 명단을 살펴보세요.' : '명단이 확정되면 여기서 확인할 수 있습니다.'}</p>{data.groups.length > 0 && <button onClick={() => { selectGroup('all'); trigger.current?.focus(); }}>전체 명단 보기</button>}</div>}
    </div>
    <p className="b3-roster-help"><Icon name="phone" />연락처를 펼친 뒤 번호를 누르면 전화로 연결됩니다.</p>
  </div>;
}
