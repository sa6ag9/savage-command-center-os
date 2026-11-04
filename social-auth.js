'use strict';

// Dedicated operator credential for the HTTP social control plane.
// This is intentionally separate from WebSocket ADMIN_TOKEN and OAuth state secrets.
const { timingSafeEqual } = require('node:crypto');

function tokenConfigured(env = process.env) {
  const token = env.SOCIAL_CONTROL_TOKEN;
  return typeof token === 'string' &&
    Buffer.byteLength(token, 'utf8') >= 32 &&
    !/\s/.test(token);
}

function authorized(req, env = process.env) {
  if (!tokenConfigured(env)) return false;
  const value = req.headers.authorization;
  if (typeof value !== 'string' || !value.startsWith('Bearer ')) return false;
  const candidate = value.slice(7);
  if (!candidate || /\s/.test(candidate)) return false;
  const actual = Buffer.from(candidate, 'utf8');
  const expected = Buffer.from(env.SOCIAL_CONTROL_TOKEN, 'utf8');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function requireSocialOperator(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (!tokenConfigured(env)) {
    res.status(503).json({ error: 'social operator authorization not configured' });
    return false;
  }
  if (!authorized(req, env)) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    res.status(401).json({ error: 'social operator authorization required' });
    return false;
  }
  return true;
}

module.exports = { tokenConfigured, authorized, requireSocialOperator };
