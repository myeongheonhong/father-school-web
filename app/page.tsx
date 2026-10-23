import published from '@/public/content-b2.json';
import Participant from '@/components/Participant';
import { validateContent } from '@/lib/content';

export default function Home() {
  return <Participant variant="B" edition="B2" initialData={validateContent(published)} />;
}
