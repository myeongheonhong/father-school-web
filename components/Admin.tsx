'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { type Content, type Edition, type Variant, type Week, type Group, variants, parseContent, exportContent, posterPath, sitePath, githubUpload, githubRuns, MAX_CONTENT_BYTES } from '@/lib/content';
import { loadDraftRecord, saveDraft, imageData, type DraftRecord } from '@/lib/draft';
import { sameContent, validateDraft } from '@/lib/admin-edit';
import { adminOrigin, participantURL, adminRequest, readRemote, MAX_PUBLISH_BYTES } from '@/lib/admin-client';
import { groupPeople, matchesGroup } from '@/lib/groups';
import { type Category, Header, Tabs, Footer, Icon } from './ui';
import AdminRoster from './AdminRoster';

const online = process.env.NEXT_PUBLIC_ADMIN_SERVER === '1';
function Field({ label, value, onChange, multiline = false, maxLength = 200 }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; maxLength?: number }) {
  return <label className="field"><span>{label}</span>{multiline ? <textarea value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} /> : <input value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} />}</label>;
}
function Confirmation({ label, onConfirm, onClose }: { label: string; onConfirm: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog className="admin-confirm" ref={ref} onCancel={onClose} aria-labelledby="confirm-title"><h2 id="confirm-title">{label}</h2><p>아직 사이트에는 반영되지 않습니다. 내용을 확인한 뒤 저장해주세요.</p><div className="editor-actions"><button autoFocus className="secondary-button" onClick={onClose}>취소</button><button className="save-button" onClick={() => { onConfirm(); onClose(); }}>확인</button></div></dialog>;
}
export default function Admin({ initialData, variant, edition }: { initialData: Content; variant: Variant; edition?: Edition }) {
  const contentFilename = edition ? `content-${edition.toLowerCase()}.json` : 'content.json';
  const draftKey = edition?.toLowerCase() ?? 'current';
  const server = online && edition === 'B3';
  const [data, setData] = useState(initialData);
  const [baseline, setBaseline] = useState(initialData);
  const [revision, setRevision] = useState('');
  const [draft, setDraft] = useState<DraftRecord | null>(null);
  const [theme, setTheme] = useState(variant);
  const [category, setCategory] = useState<Category>('1');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authenticated, setAuthenticated] = useState(!server);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [personEditing, setPersonEditing] = useState(false);
  const [groupId, setGroupId] = useState(initialData.groups[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [undo, setUndo] = useState<Content | null>(null);
  const [confirm, setConfirm] = useState<{ label: string; action: () => void } | null>(null);
  const [deployment, setDeployment] = useState<{ commit: string; state: string } | null>(null);
  const allowNavigation = useRef(false);
  const draftCanRestore = !server || (!!revision && draft?.revision === revision);

  useEffect(() => {
    if (!online && edition === 'B3' && adminOrigin) { location.replace(`${adminOrigin}/admin/`); return; }
    let active = true;
    loadDraftRecord(draftKey).then(value => { if (active) setDraft(value); }).catch(e => { if (active) setError(e.message); });
    if (server) {
      adminRequest<{ authenticated: boolean }>('session').then(async result => {
        if (!active) return;
        setAuthenticated(result.authenticated);
        if (result.authenticated) {
          const remote = await readRemote();
          if (active) { setData(remote.data); setBaseline(remote.data); setRevision(remote.revision); }
        }
      }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setReady(true); });
    } else setReady(true);
    return () => { active = false; };
  }, [draftKey, server, edition]);
  useEffect(() => {
    if (!dirty && !personEditing) return;
    const prevent = (e: BeforeUnloadEvent) => { if (!allowNavigation.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty, personEditing]);
  useEffect(() => {
    if (!server || !deployment || deployment.state !== 'pending') return;
    let active = true;
    const commit = deployment.commit;
    const start = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        const status = await adminRequest<{ status: string; conclusion: string | null }>(`status&commit=${commit}`);
        if (!active) return;
        if (status.status === 'completed') {
          setDeployment({ commit, state: status.conclusion === 'success' ? 'success' : 'failed' });
          setMessage(status.conclusion === 'success' ? '참가자 사이트 배포가 완료됐습니다.' : '저장은 완료됐지만 배포가 실패했습니다. 배포 진행 상황을 확인해주세요.');
          return;
        }
      } catch { if (!active) return; }
      if (Date.now() - start > 10 * 60 * 1000) { setDeployment({ commit, state: 'unknown' }); setMessage('저장은 완료됐습니다. 배포 진행 상황을 확인해주세요.'); return; }
      timer = setTimeout(check, 15000);
    }
    void check();
    return () => { active = false; clearTimeout(timer); };
  }, [server, deployment]);

  function update(next: Content) { allowNavigation.current = false; setData(next); setDirty(true); setUndo(null); setMessage(''); setError(''); }
  const weekIndex = (Number(category) || 1) - 1, week = data.weeks[weekIndex];
  const group = data.groups.find(g => g.id === groupId) ?? data.groups[0];
  function updateWeek(key: keyof Week, value: string | string[]) { update({ ...data, weeks: data.weeks.map((w, i) => i === weekIndex ? { ...w, [key]: value } : w) }); }
  function updateGroup(next: Group) { update({ ...data, groups: data.groups.map(g => g.id === next.id ? next : g) }); }
  function confirmDelete(label: string, action: () => void) {
    setConfirm({ label: `${label} 삭제할까요?`, action: () => { const previous = data; action(); setUndo(previous); setMessage('삭제했습니다. 저장 전에는 삭제 취소가 가능합니다.'); } });
  }
  async function refresh() {
    setBusy(true); setError('');
    try {
      const remote = server ? await readRemote() : { data: parseContent(await (await fetch(sitePath(`/${contentFilename}?t=${Date.now()}`), { cache: 'no-store' })).text()), revision: '' };
      setData(remote.data); setBaseline(remote.data); setRevision(remote.revision); setDirty(false); setUndo(null); setDraft(null); setMessage('최신 내용을 불러왔습니다.');
    } catch (e) { setError(e instanceof Error ? e.message : '최신 내용을 불러오지 못했습니다.'); }
    finally { setBusy(false); }
  }
  async function login() {
    setBusy(true); setError('');
    try {
      await adminRequest('login', { password }); setPassword(''); setAuthenticated(true);
      if (!revision) { const remote = await readRemote(); setData(remote.data); setBaseline(remote.data); setRevision(remote.revision); }
    } catch (e) { setError(e instanceof Error ? e.message : '로그인하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  async function save(preview = false) {
    setBusy(true); setError('');
    try {
      const content = validateDraft(data);
      await saveDraft(content, draftKey, revision || undefined); setData(content); setDirty(false); setDraft(null);
      setMessage('이 기기에 임시 저장했습니다. 사이트에는 아직 반영되지 않았습니다.');
      if (preview) { allowNavigation.current = true; location.assign(sitePath(`/${edition ?? theme}/?preview=1&tab=${category}`)); }
    } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  async function publish() {
    setBusy(true); setError('');
    try {
      const content = validateDraft(data);
      if (new TextEncoder().encode(JSON.stringify(content)).length > MAX_PUBLISH_BYTES) throw new Error('이미지가 너무 큽니다. 전체 안내를 3MB 이하로 줄여주세요.');
      const result = await adminRequest<{ revision: string; commit?: string; content: Content; unchanged?: boolean }>('publish', { revision, content });
      setRevision(result.revision); setData(result.content); setBaseline(result.content); setDirty(false); setUndo(null); setDraft(null);
      setMessage(result.unchanged ? '변경된 내용이 없습니다.' : '저장 완료. 참가자 화면에 반영 중입니다.');
      if (result.commit) setDeployment({ commit: result.commit, state: 'pending' });
      try { await saveDraft(result.content, draftKey, result.revision); } catch { /* Remote save succeeded; do not turn it into a false publish failure. */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.');
      // Re-authentication preserves the current editor and its original revision.
      try { const result = await adminRequest<{ authenticated: boolean }>('session'); if (!result.authenticated) setAuthenticated(false); } catch { /* Keep the edit available during a network failure. */ }
    } finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setError('');
    try { updateWeek('poster', await imageData(file)); setMessage('이미지를 변경했습니다. 글 안내도 확인해주세요.'); }
    catch (e) { setError(e instanceof Error ? e.message : '이미지를 읽지 못했습니다.'); }
    finally { setBusy(false); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      if (file.size > MAX_CONTENT_BYTES) throw new Error('15MB 이하의 안내 파일을 선택해주세요.');
      const content = parseContent(await file.text());
      setConfirm({ label: '백업 내용으로 편집 화면을 바꿀까요?', action: () => update(content) });
    } catch (e) { setError(e instanceof Error ? e.message : '안내 파일을 읽지 못했습니다.'); }
    finally { setBusy(false); }
  }
  function download(content = data) {
    setError('');
    try {
      const url = URL.createObjectURL(new Blob([exportContent(content)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = contentFilename; a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('안내 파일을 내려받았습니다.');
    } catch (e) { setError(e instanceof Error ? e.message : '백업 파일을 만들지 못했습니다.'); }
  }
  const disabled = !ready || busy || personEditing;
  if (server && !authenticated) return <div className="app-shell admin-shell b3-app" data-theme="b"><Header variant="B" admin edition="B3" /><main className="admin-login"><h1>관리자 로그인</h1><p>명단과 주차 안내를 수정하고<br />휴대폰에서 바로 저장하세요.</p><form onSubmit={e => { e.preventDefault(); void login(); }}><label className="field"><span>관리자 비밀번호</span><input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} maxLength={256} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="save-button" disabled={!ready || busy || !password}>{busy ? '로그인 중…' : '로그인'}</button></form><a href={participantURL}>참가자 화면으로 돌아가기</a></main></div>;
  return <div className={`app-shell admin-shell ${edition ? 'b2-app' : ''} ${edition === 'B3' ? 'b3-app' : ''}`} data-theme={theme.toLowerCase()}>
    <div className="admin-topline">{server ? <a href={participantURL}>← 참가자 화면</a> : <Link href={edition === 'B3' ? '/' : `/${edition ?? theme}/`}>← 참가자 화면</Link>}{server ? <button disabled={busy} onClick={() => setConfirm({ label: '로그아웃할까요? 저장하지 않은 수정은 백업해주세요.', action: () => { void adminRequest('logout', {}).then(() => setAuthenticated(false)).catch(e => setError(e.message)); } })}>로그아웃</button> : <Link href="/designs/">디자인 비교</Link>}</div>
    <Header variant={theme} admin edition={edition} />
    {!edition && <div className="admin-variant"><span>미리볼 디자인</span><div>{variants.map(v => <button key={v} aria-pressed={theme === v} onClick={() => setTheme(v)}>{v}안</button>)}</div></div>}
    <Tabs value={category} onChange={setCategory} disabled={disabled} enhanced={edition === 'B3'} />
    <main id="content" role="tabpanel" aria-labelledby={`tab-${category}`} tabIndex={0}>
      <div className="admin-intro"><h1>안내 관리</h1><p>{server ? '내용을 고친 뒤 ‘사이트에 저장’을 눌러주세요.' : '내용을 수정한 뒤 미리보기로 확인하세요.'}</p></div>
      <div className="admin-info"><strong>{server ? '기존 QR의 참가자 화면에 반영됩니다.' : '임시 저장은 이 기기에만 보입니다.'}</strong><p>{server ? '저장 후 자동 배포에 몇 분이 걸립니다. 완료 여부를 이 화면에서 확인할 수 있습니다.' : '현재는 배포 파일을 GitHub에 올려야 전체 참가자에게 반영됩니다.'}</p><button className="text-button" disabled={disabled} onClick={() => setConfirm({ label: '수정 내용을 비우고 최신 안내를 불러올까요?', action: () => { void refresh(); } })}>최신 내용 불러오기</button></div>
      {deployment && <div className={`admin-info deployment-${deployment.state}`} role="status"><strong>{({ pending: '저장 완료 · 사이트에 반영 중', success: '참가자 사이트 배포 완료', failed: '저장은 됐지만 배포가 실패했습니다.', unknown: '배포 상태를 확인해주세요.' })[deployment.state]}</strong><p>{deployment.state === 'success' ? '참가자 화면을 새로고침하면 확인할 수 있습니다.' : '완료 전에는 이전 안내가 보일 수 있습니다.'}</p><a href={deployment.state === 'success' ? participantURL : githubRuns} target="_blank" rel="noreferrer">{deployment.state === 'success' ? '실제 사이트 확인 ↗' : '배포 진행 상황 ↗'}</a></div>}
      {draft && !sameContent(draft.content, baseline) && <div className="admin-info"><strong>이 기기에 보관한 초안이 있습니다.</strong><p>{draftCanRestore ? '불러오면 현재 편집 화면이 초안으로 바뀝니다.' : '최신 명단과 다른 버전입니다. 덮어쓰지 않도록 백업으로만 내려받을 수 있습니다.'}</p>{draftCanRestore && <button disabled={disabled} className="secondary-button" onClick={() => setConfirm({ label: '보관한 초안을 불러올까요?', action: () => { update(draft.content); setDraft(null); } })}>초안 불러오기</button>}<button className="text-button" disabled={disabled} onClick={() => download(draft.content)}>초안 백업 내려받기</button><button className="text-button" onClick={() => setDraft(null)}>현재 내용으로 계속</button></div>}
      {!ready && <p className="loading-state" role="status">최신 안내를 확인하고 있어요…</p>}
      <fieldset className="editor-fields" disabled={!ready || busy}>
        {category !== 'groups' ? <section className="editor-section"><div className="editor-heading"><div><h2>{weekIndex + 1}주차 글 안내</h2><p>참가자에게 처음 보이는 내용입니다.</p></div></div>
          <Field label="주차 제목" value={week.title} onChange={v => updateWeek('title', v)} maxLength={120} />
          <div className="field-row"><Field label="날짜" value={week.date} onChange={v => updateWeek('date', v)} maxLength={80} /><Field label="시간" value={week.time} onChange={v => updateWeek('time', v)} maxLength={80} /></div>
          <Field label="성경 본문" value={week.scripture} onChange={v => updateWeek('scripture', v)} /><Field label="강사" value={week.speaker} onChange={v => updateWeek('speaker', v)} />
          <Field label="예배 순서 (순서 | 담당자)" value={week.worship} onChange={v => updateWeek('worship', v)} multiline maxLength={2000} />
          {week.questions.map((q, i) => <div className="question-editor" key={i}><Field label={`나눔 질문 ${i + 1}`} value={q} onChange={v => updateWeek('questions', week.questions.map((question, j) => i === j ? v : question))} multiline maxLength={2000} /><button className="remove-group" onClick={() => confirmDelete(`나눔 질문 ${i + 1}`, () => updateWeek('questions', week.questions.filter((_, j) => j !== i)))}>질문 {i + 1} 삭제</button></div>)}
          <button className="add-group" disabled={week.questions.length >= 10} onClick={() => updateWeek('questions', [...week.questions, ''])}>+ 나눔 질문 추가</button>
          <details className="editor-details"><summary>안내 이미지 변경</summary><div className="upload-preview"><img src={posterPath(week.poster)} alt={`현재 ${weekIndex + 1}주차 안내 이미지`} /><div><label className="upload-button"><Icon name="upload" />이미지 변경<input type="file" accept="image/png,image/jpeg,image/webp" aria-label={`${weekIndex + 1}주차 안내 이미지 변경`} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label><small>JPG · PNG · WEBP / 최대 10MB</small></div></div><p>이미지에 적힌 글은 자동으로 바뀌지 않습니다. 글 안내와 함께 확인해주세요.</p></details>
        </section> : <>
          <section className="editor-section"><div className="editor-heading"><div><h2>조별 명단</h2><p>전체 {data.groups.reduce((sum, g) => sum + groupPeople(g).length, 0)}명 · 수정할 조를 선택하세요.</p></div></div>
            <label className="field"><span>조 또는 이름 찾기</span><input type="search" placeholder="예: 6조 또는 이름" value={search} disabled={personEditing} onChange={e => setSearch(e.target.value)} /></label>
            <div className="admin-group-picker">{data.groups.filter(g => matchesGroup(g, search)).map(g => <button disabled={personEditing} key={g.id} aria-pressed={group?.id === g.id} onClick={() => setGroupId(g.id)}>{g.name}<small>{groupPeople(g).length}명</small></button>)}</div>
            {search && !data.groups.some(g => matchesGroup(g, search)) && <p role="status">검색 결과가 없습니다.</p>}
            {group ? <div className="selected-group"><AdminRoster key={group.id} group={group} onChange={updateGroup} onEditing={setPersonEditing} confirmDelete={confirmDelete} />
              {!personEditing && <details className="editor-details"><summary>조 이름 · 조장 · 안내 설정</summary><Field label="조 이름" value={group.name} onChange={v => updateGroup({ ...group, name: v })} maxLength={100} />
                <label className="field"><span>조장 선택</span><select value={group.leader} onChange={e => { const name = e.target.value; updateGroup({ ...group, leader: name, members: groupPeople(group).filter(p => p.name !== name).map(p => p.name).join('\n') }); }}><option value="">조장 미지정</option>{groupPeople(group).map(p => <option value={p.name} key={p.name}>{p.name}</option>)}</select></label>
                <Field label="이 조의 안내 (선택)" value={group.notice} onChange={v => updateGroup({ ...group, notice: v })} multiline maxLength={1000} /><button className="remove-group" onClick={() => confirmDelete(`${group.name} 전체 (${groupPeople(group).length}명)`, () => update({ ...data, groups: data.groups.filter(g => g.id !== group.id) }))}>{group.name} 전체 삭제</button>
              </details>}
            </div> : <p className="empty-editor">등록된 조가 없습니다.</p>}
            <button className="add-group add-new-group" disabled={personEditing || data.groups.length >= 100} onClick={() => { let n = 1; while (data.groups.some(g => g.name === `${n}조`)) n++; const g = { id: crypto.randomUUID(), name: `${n}조`, leader: '', members: '', notice: '' }; update({ ...data, groups: [...data.groups, g] }); setGroupId(g.id); setSearch(''); }}>+ 새 조 만들기</button>
          </section>
          <details className="editor-section backup-section"><summary>공통 모임 안내</summary><Field label="나눔 · 식사 장소" value={data.groupPlace} onChange={v => update({ ...data, groupPlace: v })} maxLength={120} /><Field label="공통 안내" value={data.groupNotice} onChange={v => update({ ...data, groupNotice: v })} multiline maxLength={1000} /></details>
        </>}
        {!server && <section className="editor-section publish-section"><h2>전체 참가자에게 반영하기</h2><ol className="publish-steps"><li><strong>배포 파일 내려받기</strong><button className="action-button" disabled={personEditing} onClick={() => download()}>배포 파일 만들기</button></li><li><strong>GitHub에 파일 올리기</strong><p>{contentFilename}을 같은 이름으로 올리고 Commit changes를 눌러주세요.</p><a className="secondary-button" href={githubUpload} target="_blank" rel="noreferrer">GitHub 업로드 열기 ↗</a></li><li><strong>배포 완료 확인</strong><a href={githubRuns} target="_blank" rel="noreferrer">배포 진행 상황 확인 ↗</a></li></ol></section>}
        <details className="editor-section backup-section"><summary>백업 · 임시 저장</summary><p>이 기기의 임시 저장은 실제 사이트를 바꾸지 않습니다.</p><button className="text-button" disabled={personEditing} onClick={() => void save()}>이 기기에 임시 저장</button><button className="text-button" disabled={personEditing} onClick={() => download()}>백업 파일 내려받기</button><label className="upload-button">백업 파일 불러오기<input disabled={personEditing} type="file" accept=".json,application/json" aria-label="백업 파일 불러오기" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} /></label></details>
      </fieldset>
    </main><Footer />
    <div className="save-bar"><div className="save-feedback">{error ? <p className="form-error" role="alert">{error}</p> : <p role="status">{busy ? '처리 중입니다…' : personEditing ? '이름·전화번호를 입력하고 ‘명단에 적용’을 눌러주세요.' : message || (dirty ? '저장하지 않은 변경사항이 있어요.' : '수정할 내용을 선택해주세요.')}</p>}{undo && <button disabled={disabled} className="undo-button" onClick={() => { update(undo); setMessage('삭제를 취소했습니다.'); }}>↶ 방금 삭제 취소</button>}</div><div className="save-actions"><button className="secondary-button" disabled={disabled} onClick={() => void save(true)}>미리보기</button><button className="save-button" disabled={disabled || (server && !revision)} onClick={() => void (server ? publish() : save())}><Icon name="check" />{server ? '사이트에 저장' : '이 기기에 임시 저장'}</button></div></div>
    {confirm && <Confirmation label={confirm.label} onConfirm={confirm.action} onClose={() => setConfirm(null)} />}
  </div>;
}
