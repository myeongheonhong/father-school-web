import { notFound } from 'next/navigation';
import published from '@/public/content.json';
import Participant from '@/components/Participant';
import { validateContent, variants, type Variant } from '@/lib/content';
export const dynamicParams = false;
export function generateStaticParams() { return variants.map(variant => ({ variant })); }
export default async function Page({ params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  if (!variants.includes(variant as Variant)) notFound();
  return <Participant variant={variant as Variant} initialData={validateContent(published)} />;
}
