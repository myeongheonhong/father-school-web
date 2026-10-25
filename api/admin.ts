import { createAdminHandler } from '../server/admin.js';
const handle = createAdminHandler({
  origin: process.env.ADMIN_ORIGIN ?? '',
  passwordHash: process.env.ADMIN_PASSWORD_HASH ?? '',
  sessionSecret: process.env.ADMIN_SESSION_SECRET ?? '',
  githubToken: process.env.ADMIN_GITHUB_TOKEN ?? '',
});
export const GET = handle;
export const POST = handle;
