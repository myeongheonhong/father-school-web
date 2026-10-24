import published from '@/public/content-b3.json';
import Participant from '@/components/Participant';
import { validateContent } from '@/lib/content';

export default function Home() {
  return <Participant variant="B" edition="B3" initialData={validateContent(published)} />;
}
