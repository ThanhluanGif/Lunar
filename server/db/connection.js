const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL Pool Instance
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lunar_db';

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
  queryDb,
  initPgDatabase,
  getIsPgConnected: () => isPgConnected
};
