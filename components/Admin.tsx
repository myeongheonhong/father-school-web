'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { type Content, type Variant, type Week, type Group, variants, validateContent, parseContent, exportContent, posterPath, sitePath, githubUpload, githubRuns, MAX_CONTENT_BYTES } from '@/lib/content';
import { loadDraft, saveDraft, imageData } from '@/lib/draft';
import { type Category, Header, Tabs, Footer, Icon } from './ui';

function Field({ label, value, onChange, multiline = false, maxLength = 200 }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; maxLength?: number }) {
  return <label className="field"><span>{label}</span>{multiline ? <textarea value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} /> : <input value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} />}</label>;
}
export default function Admin({ initialData, variant }: { initialData: Content; variant: Variant }) {
  const [data, setData] = useState(initialData);
  const [theme, setTheme] = useState(variant);
  const [category, setCategory] = useState<Category>('1');
  const [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [resetting, setResetting] = useState(false);
  useEffect(() => {
    let active = true;
    loadDraft().then(draft => { if (active && draft) { setData(draft); setMessage('이 기기에 임시 저장한 내용을 불러왔습니다.'); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  function update(next: Content) { setData(next); setDirty(true); setDownloaded(false); setMessage(''); setError(''); }
  const number = Number(category) || 1, weekIndex = number - 1, week = data.weeks[weekIndex];
  function updateWeek(key: keyof Week, value: string | string[]) { update({ ...data, weeks: data.weeks.map((w, i) => i === weekIndex ? { ...w, [key]: value } : w) }); }
  function updateGroup(index: number, key: keyof Group, value: string) { update({ ...data, groups: data.groups.map((g, i) => i === index ? { ...g, [key]: value } : g) }); }
  async function save(preview = false) {
    setBusy(true); setError('');
    try {
      const content = validateContent({ ...data, updatedAt: new Date().toISOString() });
      await saveDraft(content); setData(content); setDirty(false);
      setMessage('이 기기에 임시 저장했습니다. 전체 참가자에게 반영하려면 아래 배포 단계를 진행해주세요.');
      if (preview) { window.setTimeout(() => location.assign(sitePath(`/${theme}/?preview=1&tab=${category}`)), 0); }
    } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setError('');
    try { const poster = await imageData(file); updateWeek('poster', poster); setMessage('이미지가 변경됐습니다. 글자로 읽기 내용도 함께 확인해주세요.'); }
    catch (e) { setError(e instanceof Error ? e.message : '이미지를 읽지 못했습니다.'); }
    finally { setBusy(false); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      if (file.size > MAX_CONTENT_BYTES) throw new Error('15MB 이하의 안내 파일을 선택해주세요.');
      const content = parseContent(await file.text()); update(content); setMessage('파일을 불러왔습니다. 내용을 확인한 뒤 임시 저장해주세요.');
    } catch (e) { setError(e instanceof Error ? e.message : '안내 파일을 읽지 못했습니다.'); }
    finally { setBusy(false); }
  }
  function download() {
    setError('');
    try {
      const content = exportContent(data), blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'content.json'; a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000); setDownloaded(true); setMessage('content.json 파일을 내려받았습니다. 다음 단계에서 GitHub에 올려주세요.');
    } catch (e) { setError(e instanceof Error ? e.message : '배포 파일을 만들지 못했습니다.'); }
  }
  return <div className="app-shell admin-shell" data-theme={theme.toLowerCase()}>
    <div className="admin-topline"><Link href={`/${theme}/`}>← 참가자 화면</Link><Link href="/">A · B · C 비교</Link></div><Header variant={theme} admin />
    <div className="admin-variant"><span>미리볼 디자인</span><div>{variants.map(v => <button key={v} aria-pressed={theme === v} onClick={() => setTheme(v)}>{v}안</button>)}</div></div>
    <Tabs value={category} onChange={setCategory} disabled={!ready || busy} />
    <main id="content" role="tabpanel" aria-labelledby={`tab-${category}`} tabIndex={0}>
      <div className="admin-intro"><h1>안내 관리</h1><p>이미지와 명단을 수정하고, 참가자에게 전할 안내를 준비하세요.</p></div>
      <div className="admin-info"><strong>임시 저장은 이 기기에만 보입니다.</strong><p>전체 참가자에게 반영하려면 ‘배포 파일 만들기’ 후 GitHub에 올려주세요. 배포는 저장소 관리 권한이 있는 계정만 할 수 있습니다.</p></div>
      {!ready && <p className="loading-state" role="status">임시 저장한 내용을 확인하고 있어요…</p>}
      <fieldset className="editor-fields" disabled={!ready || busy}>
        {category !== 'groups' ? <section className="editor-section"><div className="editor-heading"><span className="step">1</span><div><h2>{number}주차 안내 이미지</h2><p>이미지와 글자로 읽기 내용을 함께 관리하세요.</p></div></div><div className="upload-preview"><img src={posterPath(week.poster)} alt={`현재 ${number}주차 안내 이미지`} /><div><strong>{number}주차 이미지 등록됨</strong><span>원본 비율을 유지해 표시합니다.</span><label className="upload-button"><Icon name="upload" />이미지 변경<input type="file" accept="image/png,image/jpeg,image/webp" aria-label={`${number}주차 안내 이미지 변경`} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label><small>JPG · PNG · WEBP / 최대 10MB</small></div></div><Field label="주차 제목" value={week.title} onChange={v => updateWeek('title', v)} maxLength={120} /><details className="editor-details"><summary>글자로 읽기 내용 수정</summary><p>이미지를 바꿨다면 아래 내용도 함께 확인해주세요.</p><div className="field-row"><Field label="날짜" value={week.date} onChange={v => updateWeek('date', v)} maxLength={80} /><Field label="시간" value={week.time} onChange={v => updateWeek('time', v)} maxLength={80} /></div><Field label="성경 본문" value={week.scripture} onChange={v => updateWeek('scripture', v)} /><Field label="강사" value={week.speaker} onChange={v => updateWeek('speaker', v)} /><Field label="예배 순서 (순서 | 담당자)" value={week.worship} onChange={v => updateWeek('worship', v)} multiline maxLength={2000} />{week.questions.map((q, i) => <Field key={i} label={`나눔 질문 ${i + 1}`} value={q} onChange={v => updateWeek('questions', week.questions.map((question, j) => i === j ? v : question))} multiline maxLength={2000} />)}</details></section> : <><section className="editor-section"><div className="editor-heading"><span className="step">1</span><div><h2>공통 모임 안내</h2><p>모든 조에 동일하게 보이는 안내입니다.</p></div></div><Field label="나눔 · 식사 장소" value={data.groupPlace} onChange={v => update({ ...data, groupPlace: v })} maxLength={120} /><Field label="공통 안내" value={data.groupNotice} onChange={v => update({ ...data, groupNotice: v })} multiline maxLength={1000} /></section><section className="editor-section"><div className="editor-heading"><span className="step">2</span><div><h2>조별 명단</h2><p>확정된 조부터 하나씩 추가해주세요.</p></div></div>{data.groups.length ? data.groups.map((g, i) => <fieldset className="group-editor" key={g.id}><legend>{i + 1}번째 조</legend><Field label="조 이름" value={g.name} onChange={v => updateGroup(i, 'name', v)} maxLength={100} /><Field label="조장" value={g.leader} onChange={v => updateGroup(i, 'leader', v)} maxLength={100} /><Field label="조원 (쉼표 또는 줄바꿈으로 구분)" value={g.members} onChange={v => updateGroup(i, 'members', v)} multiline maxLength={3000} /><Field label="이 조의 안내 (선택)" value={g.notice} onChange={v => updateGroup(i, 'notice', v)} multiline maxLength={1000} /><button className="remove-group" onClick={() => update({ ...data, groups: data.groups.filter((_, index) => index !== i) })}>{g.name || `${i + 1}번째 조`} 삭제</button></fieldset>) : <p className="empty-editor">등록된 조가 없습니다.<br />참가자 화면에는 ‘조편성 준비 중’으로 표시됩니다.</p>}<button className="add-group" disabled={data.groups.length >= 100} onClick={() => update({ ...data, groups: [...data.groups, { id: crypto.randomUUID(), name: `${data.groups.length + 1}조`, leader: '', members: '', notice: '' }] })}>+ 조 추가하기</button></section></>}
        <section className="editor-section publish-section"><div className="editor-heading"><span className="step">↗</span><div><h2>전체 참가자에게 반영하기</h2><p>아래 3단계를 완료하면 같은 QR 주소에 반영됩니다.</p></div></div><label className="field"><span>메인 주소에서 열릴 디자인</span><select value={data.defaultVariant ?? ''} onChange={e => update({ ...data, defaultVariant: (e.target.value || null) as Variant | null })}><option value="">A · B · C 비교 화면</option>{variants.map(v => <option value={v} key={v}>{v}안으로 바로 열기</option>)}</select></label><ol className="publish-steps"><li><strong>배포 파일 내려받기</strong><p>현재 이미지와 모든 안내가 한 파일에 담깁니다.</p><button className="action-button" onClick={download}><Icon name="upload" />배포 파일 만들기</button>{downloaded && <span className="download-success">✓ content.json 다운로드 완료</span>}</li><li><strong>GitHub에 파일 올리기</strong><p>아래 링크에서 <b>content.json</b>을 올린 뒤 <b>Commit changes</b>를 눌러주세요. 파일 이름에 (1)이 붙었다면 먼저 지워주세요.</p><a className="secondary-button" href={githubUpload} target="_blank" rel="noreferrer">GitHub 업로드 열기 ↗</a></li><li><strong>배포 완료 확인</strong><p>자동 배포에 보통 몇 분이 걸립니다. 초록색 체크가 뜨면 참가자 화면을 새로고침해주세요.</p><a href={githubRuns} target="_blank" rel="noreferrer">배포 진행 상황 확인 ↗</a></li></ol></section>
        <details className="editor-section backup-section"><summary>백업 파일 · 초기화</summary><p>기기를 바꿀 때는 내려받은 content.json을 불러오세요. 현재 편집 중인 내용이 파일 내용으로 바뀝니다.</p><label className="upload-button">안내 파일 불러오기<input type="file" accept=".json,application/json" aria-label="안내 파일 불러오기" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} /></label><button className="text-button" onClick={() => setResetting(!resetting)}>현재 배포된 내용으로 되돌리기</button>{resetting && <div className="reset-confirm"><p>이 화면의 수정 내용을 현재 배포된 안내로 바꿉니다.</p><button onClick={() => { update(initialData); setResetting(false); setMessage('현재 배포된 안내로 되돌렸습니다. 임시 저장하면 이전 초안도 바뀝니다.'); }}>되돌리기</button><button onClick={() => setResetting(false)}>취소</button></div>}</details>
      </fieldset>
    </main><Footer />
    <div className="save-bar"><div className="save-feedback">{error ? <p className="form-error" role="alert">{error}</p> : <p role="status">{busy ? '처리 중입니다…' : message || (dirty ? '저장하지 않은 변경사항이 있어요.' : 'A · B · C가 같은 안내 내용을 사용합니다.')}</p>}</div><div className="save-actions"><button className="secondary-button" disabled={!ready || busy} onClick={() => void save(true)}>미리보기</button><button className="save-button" disabled={!ready || busy} onClick={() => void save()}><Icon name="check" />이 기기에 임시 저장</button></div></div>
  </div>;
}
