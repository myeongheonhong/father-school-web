'use client';
import { useState } from 'react';
import type { Group } from '@/lib/content';
import { groupContacts } from '@/lib/contacts';
import { editPerson, removePerson } from '@/lib/admin-edit';

export default function AdminRoster({ group, onChange, onEditing, confirmDelete }: {
  group: Group; onChange: (group: Group) => void; onEditing: (editing: boolean) => void;
  confirmDelete: (label: string, action: () => void) => void;
}) {
  const [editing, setEditing] = useState<{ oldName: string | null; name: string; phone: string } | null>(null);
  const [error, setError] = useState('');
  function close() { setEditing(null); setError(''); onEditing(false); }
  function begin(oldName: string | null, name = '', phone = '') { setEditing({ oldName, name, phone }); onEditing(true); }
  function apply() {
    if (!editing) return;
    try { onChange(editPerson(group, editing.oldName, editing.name, editing.phone)); close(); }
    catch (e) { setError(e instanceof Error ? e.message : '입력 내용을 확인해주세요.'); }
  }
  return <div className="admin-roster">
    <div className="editor-heading"><div><h3>{group.name} 명단 · {groupContacts(group).length}명</h3><p>이름과 전화번호를 함께 수정합니다.</p></div></div>
    {!editing && <><ul className="admin-people">{groupContacts(group).map(person => <li key={person.name}>
      <div><strong>{person.name}{person.leader && <small>조장</small>}</strong><span>{person.phone || '연락처 없음'}</span></div>
      <button type="button" className="person-edit" aria-label={`${person.name} 수정`} onClick={() => begin(person.name, person.name, person.phone)}>수정</button>
      <button type="button" className="person-delete" aria-label={`${person.name} 삭제`} onClick={() => confirmDelete(`${group.name} ${person.name}`, () => onChange(removePerson(group, person.name)))}>삭제</button>
    </li>)}</ul><button type="button" className="add-group" onClick={() => begin(null)}>+ 조원 추가</button></>}
    {editing && <div className="person-form">
      <h3>{editing.oldName ? `${editing.oldName} 수정` : `${group.name} 조원 추가`}</h3>
      <label className="field"><span>이름</span><input autoFocus value={editing.name} maxLength={100} autoComplete="off" onChange={e => setEditing({ ...editing, name: e.target.value })} /></label>
      <label className="field"><span>전화번호 (선택)</span><input type="tel" inputMode="tel" value={editing.phone} placeholder="010-1234-5678" maxLength={20} autoComplete="off" onChange={e => setEditing({ ...editing, phone: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="editor-actions"><button type="button" className="secondary-button" onClick={close}>취소</button><button type="button" className="save-button" onClick={apply}>명단에 적용</button></div>
      <p className="editor-hint">적용한 뒤 아래 저장 버튼을 눌러주세요.</p>
    </div>}
  </div>;
}
