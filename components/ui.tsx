import type { KeyboardEvent } from 'react';
export type Category = '1' | '2' | '3' | 'groups';
export const categories: Category[] = ['1', '2', '3', 'groups'];
const paths: Record<string, React.ReactNode> = {
  cross: <path d="M12 3v18M5 9h14" />,
  arrow: <path d="m9 5 7 7-7 7" />,
  expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  upload: <path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />,
  people: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v2" /></>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2.3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  book: <path d="M12 5v16M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
};
export function Icon({ name }: { name: string }) { return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name] ?? paths.book}</svg>; }
export function Header({ variant, admin = false }: { variant: string; admin?: boolean }) {
  return <header className="brand-header"><div className="brand-line"><span className="brand-cross"><Icon name="cross" /></span><span>2026 옥인교회</span><span className="term-label">{admin ? '안내 관리' : '10.25 — 11.08'}</span></div><div className="brand-title">아버지<span>기도학교</span></div>{variant === 'B' && !admin && <p className="brand-subtitle">기도하는 아버지, 함께 세워가는 가정</p>}</header>;
}
export function Tabs({ value, onChange, disabled = false }: { value: Category; onChange: (value: Category) => void; disabled?: boolean }) {
  function keydown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? 3 : (index + (e.key === 'ArrowRight' ? 1 : 3)) % 4;
    onChange(categories[next]); document.getElementById(`tab-${categories[next]}`)?.focus();
  }
  return <nav className="category-nav" aria-label="주차 및 조편성"><div role="tablist" aria-label="볼 내용">{categories.map((c, i) => <button key={c} id={`tab-${c}`} role="tab" aria-selected={value === c} aria-controls="content" tabIndex={value === c ? 0 : -1} disabled={disabled} onKeyDown={e => keydown(e, i)} onClick={() => onChange(c)}>{c === 'groups' ? '조편성' : `${c}주차`}</button>)}</div></nav>;
}
export function Footer() { return <footer className="page-footer"><span>옥인교회</span><span>2026 아버지기도학교</span></footer>; }
