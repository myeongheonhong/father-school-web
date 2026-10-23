import { type Content, validateContent } from './content';
const STORE = 'drafts';
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('okin-prayer-school', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('이 브라우저에서 임시 저장을 사용할 수 없습니다. 배포 파일을 내려받아 보관해주세요.'));
  });
}
export async function loadDraft(key = 'current'): Promise<Content | null> {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(key);
      request.onsuccess = () => { try { resolve(request.result ? validateContent(request.result) : null); } catch (e) { reject(e); } };
      request.onerror = () => reject(new Error('임시 저장 내용을 불러오지 못했습니다.'));
    });
  } finally { db.close(); }
}
export async function saveDraft(content: Content, key = 'current'): Promise<void> {
  const data = validateContent(content), db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(data, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('저장 공간이 부족하거나 임시 저장이 차단되어 있습니다. 배포 파일을 내려받아 보관해주세요.'));
      transaction.onabort = () => reject(new Error('임시 저장이 완료되지 않았습니다.'));
    });
  } finally { db.close(); }
}
export async function imageData(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('JPG, PNG, WEBP 이미지를 선택해주세요.');
  if (file.size > 10 * 1024 * 1024) throw new Error('10MB 이하의 이미지를 선택해주세요.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('이미지를 읽지 못했습니다. 다른 파일을 선택해주세요.'); }
  try {
    const ratio = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('이미지 처리 기능을 사용할 수 없습니다.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  } finally { bitmap.close(); }
}
