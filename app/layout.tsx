import type { Metadata, Viewport } from 'next';
import './globals.css';
import './b3.css';
export const metadata: Metadata = { title: '2026 옥인교회 아버지기도학교', description: '1–3주차 예배 안내와 조편성을 확인하세요.', robots: { index: false, follow: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#082d5b' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body><a className="skip-link" href="#content">본문 바로가기</a>{children}</body></html>;
}
