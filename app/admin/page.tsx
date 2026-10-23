import published from '@/public/content.json';
import Admin from '@/components/Admin';
import { validateContent } from '@/lib/content';
export default function Page() { return <Admin initialData={validateContent(published)} variant="A" />; }
