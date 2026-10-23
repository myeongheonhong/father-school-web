import published from '@/public/content-b2.json';
import Admin from '@/components/Admin';
import { validateContent } from '@/lib/content';
export default function Page() { return <Admin variant="B" edition="B2" initialData={validateContent(published)} />; }
