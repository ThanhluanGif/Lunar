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

function withoutSslMode(value) {
  try {
    const parsed = new URL(value);
    parsed.searchParams.delete('sslmode');
    return parsed.toString();
  } catch {
    return value;
  }
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

const cleanConnectionString = withoutSslMode(connectionString);
const poolMax = boundedInteger(
  process.env.DATABASE_POOL_MAX,
  process.env.VERCEL ? 2 : 10,
  1,
  50
);

const pool = new Pool({
  connectionString: cleanConnectionString,
  ...(databaseSslEnabled
    ? { ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } }
    : {}),
  max: poolMax,
  idleTimeoutMillis: boundedInteger(process.env.DATABASE_IDLE_TIMEOUT_MS, 30000, 1000, 300000),
  connectionTimeoutMillis: boundedInteger(process.env.DATABASE_CONNECT_TIMEOUT_MS, 3000, 500, 30000)
});

let isPgConnected = false;
let initPromise = null;

async function initializePgDatabase() {
  let client;
  try {
    client = await pool.connect();
    writeSystemLog('INFO', 'PostgreSQL database pool connected.');

    const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
    await client.query(schemaSql);

    // Readiness means both the connection and the complete schema are usable.
    // Setting this before the schema query created a cold-start race where
    // `/ready` returned 200 while application tables did not exist yet.
    isPgConnected = true;
    writeSystemLog('INFO', 'PostgreSQL schema initialized and verified.');
  } catch (error) {
    isPgConnected = false;
    writeSystemLog('WARN', 'PostgreSQL initialization failed; resilient database mode enabled.', error);
  } finally {
    client?.release();
  }
}

function initPgDatabase() {
  if (!initPromise) {
    initPromise = initializePgDatabase().finally(() => {
      initPromise = null;
    });
  }
  return initPromise;
}

async function ensurePgConnected() {
  if (isPgConnected) return true;
  await initPgDatabase();
  return isPgConnected;
}

async function queryDb(text, params) {
  if (!isPgConnected) {
    await ensurePgConnected();
  }
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
  ensurePgConnected,
  getIsPgConnected: () => isPgConnected,
  getPoolConfig: () => ({ max: poolMax })
};
