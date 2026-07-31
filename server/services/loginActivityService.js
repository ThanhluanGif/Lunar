const VALID_AUTH_METHODS = new Set(['PASSWORD', 'GITHUB']);

function trimNullable(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

async function recordSuccessfulLogin(db, {
  userId,
  authMethod,
  ipAddress,
  userAgent,
  correlationId
}) {
  if (!db || !userId) throw new Error('A database connection and user ID are required.');
  if (!VALID_AUTH_METHODS.has(authMethod)) throw new Error('Unsupported login activity method.');

  await db.query(
    `WITH updated_user AS (
       UPDATE users
          SET last_login_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id
     )
     INSERT INTO user_login_events (
       user_id, auth_method, ip_address, user_agent, correlation_id
     )
     SELECT id, $2, $3, $4, $5
       FROM updated_user`,
    [
      userId,
      authMethod,
      trimNullable(ipAddress, 64),
      trimNullable(userAgent, 1000),
      trimNullable(correlationId, 128)
    ]
  );
}

module.exports = { recordSuccessfulLogin };
