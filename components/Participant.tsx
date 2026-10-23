'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import GroupsB2 from './GroupsB2';
import { type Content, type Variant, type Week, posterPath } from '@/lib/content';
import { loadDraft } from '@/lib/draft';
import { categories, type Category, Header, Tabs, Footer, Icon } from './ui';

function Summary({ week: w, number: n, variant }: { week: Week; number: number; variant: Variant }) {
  if (variant === 'A') return <div className="compact-meta"><h1 className="week-label">{n}주차 안내</h1><span>{w.date} <strong>{w.time}</strong></span></div>;
  if (variant === 'B') return <section className="week-summary"><span className="week-label">{n}주차 · {w.date}</span><h1>{w.title}</h1><p>{w.scripture}</p><div className="summary-bottom"><span>{w.speaker}</span><span><Icon name="clock" />{w.time}</span></div></section>;
  return <section className="paper-heading"><span className="week-number">0{n}</span><div><span className="week-label">{n}주차 예배 안내</span><h1>{w.date}</h1><p>{w.time} · {w.speaker}</p></div><span className="paper-seal" aria-hidden="true">기도<br />학교</span></section>;
}
function Reader({ week: w, number, notice }: { week: Week; number: number; notice: string }) {
  return <article className="reader"><div className="reader-heading"><span>{number}주차 말씀</span><h2>{w.title}</h2><p>{w.scripture}</p><strong>{w.speaker}</strong></div><h3>예배 순서</h3><dl className="worship-list">{w.worship.split('\n').filter(Boolean).map((line, i) => { const [name, ...person] = line.split('|'); return <div key={i}><dt>{name.trim()}</dt><dd>{person.join('|').trim()}</dd></div>; })}</dl><h3>나눔 질문</h3><p className="reading-location"><Icon name="pin" />{notice}</p><ol className="questions">{w.questions.filter(Boolean).map((q, i) => <li key={i}>{q}</li>)}</ol></article>;
}
function Viewer({ week, number, onClose }: { week: Week; number: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal(); document.body.classList.add('dialog-open');
    return () => { dialog?.close(); document.body.classList.remove('dialog-open'); };
  }, []);
  return <dialog ref={ref} aria-labelledby="viewer-heading" onCancel={onClose} onClose={onClose}><div className="viewer-toolbar"><h2 id="viewer-heading">{number}주차 안내</h2><button onClick={() => setZoom(!zoom)} aria-pressed={zoom}>{zoom ? '화면에 맞추기' : '두 배로 확대'}</button><button className="close-viewer" onClick={onClose} aria-label="이미지 닫기" autoFocus><Icon name="close" /></button></div><div className={`viewer-scroll ${zoom ? 'zoomed' : ''}`}><img src={posterPath(week.poster)} alt={`${number}주차 안내 원본`} /></div><p className="viewer-hint">{zoom ? '좌우·위아래로 움직여 읽어보세요.' : '두 배로 확대하거나 휴대폰의 확대 기능을 사용하세요.'}</p></dialog>;
}
function Groups({ data }: { data: Content }) {
  const [search, setSearch] = useState('');
  const [mine, setMine] = useState('');
  const [remembered, setRemembered] = useState(true);
  useEffect(() => { try { setMine(localStorage.getItem('okin-my-group') ?? ''); } catch { setRemembered(false); } }, []);
  const term = search.trim().replace(/\s/g, '').toLocaleLowerCase();
  const filtered = data.groups.filter(g => `${g.name}${g.leader}${g.members}`.replace(/\s/g, '').toLocaleLowerCase().includes(term));
  function select(id: string) {
    const next = mine === id ? '' : id; setMine(next);
    try { localStorage.setItem('okin-my-group', next); } catch { setRemembered(false); }
  }
  return <div className="groups-content"><div className="section-heading"><span className="week-label">함께 나누는 시간</span><h1>조편성 안내</h1><p>함께할 조와 나눔 장소를 확인하세요.</p></div><div className="location-notice"><Icon name="pin" /><div><strong>조별 나눔 · 식사 {data.groupPlace}</strong><p>{data.groupNotice}</p></div></div>{data.groups.length ? <><label className="search-label" htmlFor="group-search">이름으로 내 조 찾기</label><div className="search-field"><Icon name="search" /><input id="group-search" type="search" placeholder="이름 또는 조 이름 입력" value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" /></div><div aria-live="polite">{filtered.length ? filtered.map(g => <article key={g.id} className={`group-card ${mine === g.id ? 'is-mine' : ''}`}><div className="group-card-head"><h2>{g.name}</h2><button onClick={() => select(g.id)} aria-pressed={mine === g.id}>{mine === g.id ? <><Icon name="check" />내 조</> : '내 조로 선택'}</button></div>{g.leader && <p className="group-leader">조장 · {g.leader}</p>}<p className="member-label">조원</p><p className="member-list">{g.members || '명단 등록 예정'}</p>{g.notice && <p className="group-specific">{g.notice}</p>}</article>) : <div className="no-results">검색한 이름이 명단에 없습니다.<br />이름을 다시 확인해주세요.</div>}</div><p className="group-save-note">{remembered ? '선택한 조는 이 브라우저에서 기억합니다.' : '이 브라우저에서는 선택한 조를 저장할 수 없습니다.'}</p></> : <div className="groups-empty"><span><Icon name="people" /></span><h2>조편성을 준비하고 있어요</h2><p>명단이 확정되면 이곳에서<br />우리 조를 확인하실 수 있습니다.</p><div>조별 나눔 장소 <strong>{data.groupPlace}</strong></div></div>}</div>;
}
export default function Participant({ variant, initialData, edition }: { variant: Variant; initialData: Content; edition?: 'B2' }) {
  const [data, setData] = useState(initialData);
  const [category, setCategory] = useState<Category>('1');
  const [reading, setReading] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [preview, setPreview] = useState('');
  useEffect(() => {
    const readTab = () => {
      const tab = new URLSearchParams(location.search).get('tab') as Category;
      setCategory(categories.includes(tab) ? tab : '1'); setReading(false); setViewer(false);
    };
    readTab(); window.addEventListener('popstate', readTab);
    let active = true;
    if (new URLSearchParams(location.search).get('preview') === '1') {
      setPreview('임시 저장한 내용을 불러오는 중입니다.');
      loadDraft(edition === 'B2' ? 'b2' : 'current').then(draft => {
        if (!active) return;
        if (draft) { setData(draft); setPreview('임시 저장 미리보기 · 전체 참가자에게는 아직 보이지 않습니다.'); }
        else setPreview('저장한 초안이 없어 현재 배포된 안내를 보여드립니다.');
      }).catch(() => { if (active) setPreview('초안을 불러오지 못해 현재 배포된 안내를 보여드립니다.'); });
    }
    return () => { active = false; window.removeEventListener('popstate', readTab); };
  }, [edition]);
  function changeTab(next: Category) {
    setCategory(next); setReading(false);
    const url = new URL(location.href); url.searchParams.set('tab', next); history.pushState(null, '', url);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  const number = Number(category) || 1, week = data.weeks[number - 1];
  return <div className={`app-shell ${edition ? 'b2-app' : ''}`} data-theme={variant.toLowerCase()}>
    {preview && <aside className="preview-banner" role="status">{preview}<Link href={`/${edition ?? variant}/admin/`}>관리자로 돌아가기 →</Link></aside>}
    <Header variant={variant} edition={edition} /><Tabs value={category} onChange={changeTab} />
    <main id="content" role="tabpanel" aria-labelledby={`tab-${category}`} tabIndex={0}>
      {category === 'groups' ? (edition ? <GroupsB2 data={data} /> : <Groups data={data} />) : <div className="week-content"><Summary week={week} number={number} variant={variant} /><div className="view-tools"><button onClick={() => setReading(!reading)} aria-pressed={reading}><Icon name="book" />{reading ? '이미지로 보기' : '글자로 읽기'}</button><button onClick={() => setViewer(true)}><Icon name="expand" />크게 보기</button></div>{reading ? <Reader week={week} number={number} notice={data.groupNotice} /> : <><button className="poster-button" onClick={() => setViewer(true)} aria-label={`${number}주차 안내 이미지 확대`}><img className="week-poster" src={posterPath(week.poster)} alt={`${number}주차 안내. ${week.date} ${week.time}, ${week.title}, ${week.speaker}. 예배 순서와 나눔 질문은 글자로 읽기에서 확인하세요.`} width={887} height={1774} fetchPriority="high" /></button><p className="image-hint"><Icon name="expand" />이미지를 누르면 확대해서 볼 수 있어요.</p></>}<button className="group-shortcut" onClick={() => changeTab('groups')}><span className="shortcut-icon"><Icon name="people" /></span><span><strong>조편성 확인하기</strong><small>조별 나눔 · 식사 {data.groupPlace}</small></span><Icon name="arrow" /></button></div>}
    </main><Footer />{viewer && <Viewer week={week} number={number} onClose={() => setViewer(false)} />}
  </div>;
}
