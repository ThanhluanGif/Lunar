const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { writeSystemLog } = require('../middleware/logger');
const { readRuntimeSecret } = require('../services/runtimeSecrets');

const configuredDatabaseUrl = readRuntimeSecret('DATABASE_URL');
const configuredPassword = readRuntimeSecret('POSTGRES_PASSWORD');

if (process.env.NODE_ENV === 'production' && !configuredDatabaseUrl && !configuredPassword) {
  throw new Error(
    'Production database credentials are required via DATABASE_URL(_FILE) or POSTGRES_PASSWORD(_FILE).'
  );
}

const connectionString = configuredDatabaseUrl || [
  'postgresql://',
  encodeURIComponent(process.env.POSTGRES_USER || 'postgres'),
  ':',
  encodeURIComponent(configuredPassword),
  '@',
  process.env.POSTGRES_HOST || 'localhost',
  ':',
  process.env.POSTGRES_PORT || '5432',
  '/',
  encodeURIComponent(process.env.POSTGRES_DB || 'lunar_db')
].join('');

const databaseSslEnabled = process.env.DATABASE_SSL === 'true'
  || /[?&]sslmode=(require|verify-ca|verify-full)\b/i.test(connectionString);

const pool = new Pool({
  connectionString,
  ...(databaseSslEnabled
    ? { ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } }
    : {}),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000
});

let isPgConnected = false;

async function initPgDatabase() {
  let client;
  try {
    client = await pool.connect();
    isPgConnected = true;
    writeSystemLog('INFO', 'PostgreSQL database pool connected.');

    const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
    await client.query(schemaSql);

    writeSystemLog('INFO', 'PostgreSQL schema initialized and verified.');
  } catch (error) {
    isPgConnected = false;
    writeSystemLog('WARN', 'PostgreSQL initialization failed; resilient database mode enabled.', error);
  } finally {
    client?.release();
  }
}

async function queryDb(text, params) {
  if (!isPgConnected) return null;
  try {
    return await pool.query(text, params);
  } catch (error) {
    writeSystemLog('ERROR', 'SQL execution failed.', error);
    throw error;
  }
}

module.exports = {
  pool,
  getPool: () => (isPgConnected ? pool : null),
  queryDb,
  initPgDatabase,
  getIsPgConnected: () => isPgConnected
};
