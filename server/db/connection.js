const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL Pool Instance
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

const pool = new Pool({
  connectionString,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

let isPgConnected = false;

// Attempt Database Connection & Auto Migration
async function initPgDatabase() {
  try {
    const client = await pool.connect();
    isPgConnected = true;
    console.log('🐘 PostgreSQL Database Pool connected successfully.');

    // Execute schema migration DDL
    const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('✅ PostgreSQL Schema tables initialized/verified.');

    client.release();
  } catch (err) {
    isPgConnected = false;
    console.warn('⚠️  PostgreSQL Database connection failed or offline. Operating in Resilient DB Mode.');
  }
}

async function queryDb(text, params) {
  if (isPgConnected) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('SQL Execution Error:', err.message);
      throw err;
    }
  }
  return null; // Fallback handled by service
}

module.exports = {
  pool,
  getPool: () => (isPgConnected ? pool : null),
  queryDb,
  initPgDatabase,
  getIsPgConnected: () => isPgConnected
};
