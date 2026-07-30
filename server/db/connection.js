const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || [
  'postgresql://',
  encodeURIComponent(process.env.POSTGRES_USER || 'postgres'),
  ':',
  encodeURIComponent(process.env.POSTGRES_PASSWORD || 'postgres'),
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
    console.log('PostgreSQL database pool connected.');

    const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
    await client.query(schemaSql);

    console.log('PostgreSQL schema initialized and verified.');
  } catch (error) {
    isPgConnected = false;
    console.warn('PostgreSQL initialization failed. Resilient DB mode enabled:', error.message);
  } finally {
    client?.release();
  }
}

async function queryDb(text, params) {
  if (!isPgConnected) return null;
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('SQL execution error:', error.message);
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
