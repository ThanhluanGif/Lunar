const PAYMENT_WEBHOOK_MAX_AGE_MS = Math.min(
  Math.max(Number.parseInt(process.env.PAYMENT_WEBHOOK_MAX_AGE_MS, 10) || 5 * 60 * 1000, 30 * 1000),
  15 * 60 * 1000
);

function webhookTimestampIsFresh(value, {
  now = Date.now(),
  maxAgeMs = PAYMENT_WEBHOOK_MAX_AGE_MS
} = {}) {
  if (value === undefined || value === null || value === '') return false;
  const numericValue = typeof value === 'number' ? value : Number(value);
  let timestamp = Number.isFinite(numericValue)
    ? numericValue
    : Date.parse(String(value));
  if (Number.isFinite(timestamp) && timestamp > 0 && timestamp < 1e12) timestamp *= 1000;
  return Number.isFinite(timestamp)
    && timestamp <= now + 30 * 1000
    && now - timestamp <= maxAgeMs;
}

module.exports = {
  PAYMENT_WEBHOOK_MAX_AGE_MS,
  webhookTimestampIsFresh
};
