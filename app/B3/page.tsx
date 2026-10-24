import type { Metadata } from 'next';
import published from '@/public/content-b3.json';
import Participant from '@/components/Participant';
import { validateContent } from '@/lib/content';

export const metadata: Metadata = { title: '아버지기도학교 · B3 | 옥인교회' };
export default function Page() { return <Participant variant="B" edition="B3" initialData={validateContent(published)} />; }
