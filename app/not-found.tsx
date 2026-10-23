import Link from 'next/link';
export default function NotFound() { return <main className="error-page" id="content"><p>옥인교회 아버지기도학교</p><h1>페이지를 찾을 수 없어요.</h1><p>아래 버튼을 눌러 안내 화면으로 이동해주세요.</p><Link href="/">안내 화면으로 돌아가기</Link></main>; }
