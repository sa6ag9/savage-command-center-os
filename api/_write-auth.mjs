// Server-side write authorization for Command Center data mutation endpoints.
// Read-only dashboard routes remain available without this credential.
import { timingSafeEqual } from 'node:crypto';

const MIN_TOKEN_BYTES = 32;

export function writeTokenConfigured(env = process.env) {
  return typeof env.COMMAND_CENTER_WRITE_TOKEN === 'string' &&
    Buffer.byteLength(env.COMMAND_CENTER_WRITE_TOKEN, 'utf8') >= MIN_TOKEN_BYTES &&
    !/\s/.test(env.COMMAND_CENTER_WRITE_TOKEN);
}

export function authorizedWrite(req, env = process.env) {
  if (!writeTokenConfigured(env)) return false;
  const authorization = req?.headers?.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return false;
  const candidate = authorization.slice('Bearer '.length);
  if (!candidate || /\s/.test(candidate)) return false;
  const supplied = Buffer.from(candidate, 'utf8');
  const expected = Buffer.from(env.COMMAND_CENTER_WRITE_TOKEN, 'utf8');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function requireWriteAuthorization(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (!writeTokenConfigured(env)) {
    res.status(503).json({ error: 'write authorization not configured' });
    return false;
  }
  if (!authorizedWrite(req, env)) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    res.status(401).json({ error: 'write authorization required' });
    return false;
  }
  return true;
}
