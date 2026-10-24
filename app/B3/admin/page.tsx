import published from '@/public/content-b3.json';
import Admin from '@/components/Admin';
import { validateContent } from '@/lib/content';

export default function Page() { return <Admin variant="B" edition="B3" initialData={validateContent(published)} />; }
