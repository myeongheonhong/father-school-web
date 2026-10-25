// Run once locally after the administrator hosting setup is approved.
// Writes only gitignored, owner-readable files. Never prints credentials.
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { hashPassword } from '../server/admin';
const password = randomBytes(24).toString('base64url');
const secret = randomBytes(48).toString('base64url');
writeFileSync('.env.admin-secrets.local', `ADMIN_PASSWORD_HASH=${hashPassword(password)}\nADMIN_SESSION_SECRET=${secret}\n`, { mode: 0o600, flag: 'wx' });
writeFileSync('.env.admin-login.local', `ADMIN_PASSWORD=${password}\n`, { mode: 0o600, flag: 'wx' });
console.log('Created private administrator credential files. Do not commit or share these files.');
