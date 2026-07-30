const crypto = require('crypto');

const PURPOSES = Object.freeze({
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET'
});

function hashAccountToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function issueAccountToken(pool, {
  userId,
  purpose,
  ttlMinutes
}) {
  if (!Object.values(PURPOSES).includes(purpose)) {
    throw new Error('Unsupported account token purpose.');
  }
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashAccountToken(token);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE account_action_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
      [userId, purpose]
    );
    await client.query(
      `INSERT INTO account_action_tokens (user_id, purpose, token_hash, expires_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP + ($4 * INTERVAL '1 minute'))`,
      [userId, purpose, tokenHash, ttlMinutes]
    );
    await client.query('COMMIT');
    return token;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  PURPOSES,
  hashAccountToken,
  issueAccountToken
};
