const { spawnSync } = require('child_process');
require('dotenv').config({ quiet: true });

const user = process.env.LUNAR_POSTGRES_USER || 'lunar_admin';
const password = process.env.LUNAR_POSTGRES_PASSWORD;
const database = process.env.LUNAR_POSTGRES_DB || 'lunar_db';
const port = process.env.LUNAR_POSTGRES_PORT || '5433';
if (!password) {
  console.error('LUNAR_POSTGRES_PASSWORD is required for Docker QA.');
  process.exit(1);
}
const databaseUrl = [
  'postgresql://',
  encodeURIComponent(user),
  ':',
  encodeURIComponent(password),
  '@127.0.0.1:',
  port,
  '/',
  encodeURIComponent(database)
].join('');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCommand, ['run', 'qa'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    COOKIE_SECURE: 'false',
    NODE_ENV: 'test'
  }
});

process.exit(result.status ?? 1);
