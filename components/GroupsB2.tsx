'use client';
import { useEffect, useRef, useState } from 'react';
import { type Content, type Group } from '@/lib/content';
import { groupPeople, matchesGroup, matchingPeople, normalizeSearch } from '@/lib/groups';
import { Icon } from './ui';

function Highlight({ name, search }: { name: string; search: string }) {
  const query = normalizeSearch(search), index = normalizeSearch(name).indexOf(query);
  if (!query || index < 0) return <>{name}</>;
  return <>{name.slice(0, index)}<mark>{name.slice(index, index + query.length)}</mark>{name.slice(index + query.length)}</>;
}
function GroupCard({ group, search }: { group: Group; search: string }) {
  const people = groupPeople(group);
  const members = people.filter(person => !person.leader);
  return <article className="b2-group-card" aria-labelledby={`group-title-${group.id}`}>
    <header className="b2-group-card-heading">
      <h2 id={`group-title-${group.id}`}>{group.name}</h2>
      <div className="b2-card-leader"><span>조장</span><strong>{group.leader ? <Highlight name={group.leader} search={search} /> : '등록 예정'}</strong></div>
      <span className="b2-card-count"><Icon name="people" />{people.length}명</span>
    </header>
    <div className="b2-card-members"><p>함께하는 조원</p><ul className="b2-people" aria-label={`${group.name} 조원 명단`}>{members.map(person => <li key={person.name}><Highlight name={person.name} search={search} /></li>)}</ul>{!members.length && <p className="b2-members-empty">조원 명단을 준비하고 있습니다.</p>}</div>
    {group.notice && <p className="b2-group-notice"><Icon name="pin" />{group.notice}</p>}
  </article>;
}
export default function GroupsB2({ data }: { data: Content }) {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (searchOpen) input.current?.focus(); }, [searchOpen]);
  const query = normalizeSearch(search);
  const visible = data.groups.filter(group => matchesGroup(group, query));
  const total = data.groups.reduce((sum, group) => sum + groupPeople(group).length, 0);
  const foundNames = visible.flatMap(group => matchingPeople(group, query).map(person => person.name));
  function closeSearch() { setSearch(''); setSearchOpen(false); trigger.current?.focus(); }
  return <div className="b2-groups b2-roster-first">
    <section className="b2-group-intro"><div className="b2-eyebrow"><span>함께하는 기도</span><span>{data.groups.length}개 조 · {total}명</span></div><h1>조편성 안내</h1><p>함께 나눌 조와 조원들을 확인하세요.</p></section>
    <aside className="b2-meeting"><span><Icon name="pin" /></span><div><strong>조별 나눔 · 식사 {data.groupPlace}</strong><p>{data.groupNotice}</p></div></aside>
    <div className="b2-roster-toolbar"><h2>전체 명단</h2><button ref={trigger} onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)} aria-expanded={searchOpen} aria-controls="b2-search-panel"><Icon name={searchOpen ? 'close' : 'search'} />{searchOpen ? '검색 닫기' : '이름으로 찾기'}</button></div>
    {searchOpen && <div className="b2-search-area" id="b2-search-panel"><label htmlFor="b2-group-search">찾으시는 분의 이름을 입력해주세요</label><div className="b2-search"><Icon name="search" /><input ref={input} id="b2-group-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 또는 조 이름" autoComplete="off" spellCheck={false} maxLength={100} enterKeyHint="search" aria-controls="b2-group-results" onKeyDown={e => { if (e.key === 'Escape') closeSearch(); }} />{search && <button onClick={() => { setSearch(''); input.current?.focus(); }} aria-label="검색어 지우기"><Icon name="close" /></button>}</div></div>}
    {query && <div className="b2-results-heading" role="status" aria-live="polite" aria-atomic="true"><p><strong>‘{search.trim()}’</strong> 검색 결과 <span>{visible.length}개 조{foundNames.length ? ` · ${foundNames.length}명` : ''}</span></p><button onClick={closeSearch}>전체 보기</button></div>}
    <div id="b2-group-results" className="b2-group-results">{visible.length ? visible.map(group => <GroupCard key={group.id} group={group} search={search} />) : <div className="b2-no-results"><span><Icon name="search" /></span><h2>{data.groups.length ? '일치하는 이름이 없어요' : '조편성을 준비하고 있어요'}</h2><p>{data.groups.length ? '이름을 다시 확인하거나\n전체 명단을 살펴보세요.' : '명단이 확정되면 여기서 확인할 수 있습니다.'}</p>{data.groups.length > 0 && <button onClick={closeSearch}>전체 명단 보기</button>}</div>}</div>
  </div>;
}
