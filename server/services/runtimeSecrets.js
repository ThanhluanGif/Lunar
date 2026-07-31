const fs = require('fs');

const MAX_SECRET_BYTES = 64 * 1024;

function readRuntimeSecret(name, {
  env = process.env,
  readFileSync = fs.readFileSync,
  statSync = fs.statSync
} = {}) {
  const directValue = typeof env[name] === 'string' ? env[name] : '';
  const secretFile = typeof env[`${name}_FILE`] === 'string'
    ? env[`${name}_FILE`].trim()
    : '';

  if (directValue && secretFile) {
    throw new Error(`${name} and ${name}_FILE cannot both be configured.`);
  }
  if (!secretFile) return directValue;

  const stats = statSync(secretFile);
  if (!stats.isFile() || stats.size <= 0 || stats.size > MAX_SECRET_BYTES) {
    throw new Error(`${name}_FILE must point to a non-empty regular file smaller than 64KB.`);
  }

  const value = String(readFileSync(secretFile, 'utf8')).replace(/[\r\n]+$/, '');
  if (!value || value.includes('\0')) {
    throw new Error(`${name}_FILE contains an invalid secret value.`);
  }
  return value;
}

module.exports = {
  MAX_SECRET_BYTES,
  readRuntimeSecret
};
