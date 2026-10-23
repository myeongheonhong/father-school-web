import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseContent, exportContent } from '../lib/content';
const path = process.argv[2];
if (!path) { console.error('사용법: npm run import-content -- /경로/content.json'); process.exit(1); }
try {
  const data = parseContent(await readFile(resolve(path), 'utf8'));
  for (const w of data.weeks) if (w.poster.startsWith('/posters/')) await access(resolve('public', `.${w.poster}`));
  await writeFile('public/content.json', exportContent(data));
  console.log('public/content.json을 갱신했습니다. npm run check && npm run build 후 커밋·푸시하면 배포됩니다.');
} catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(1); }
