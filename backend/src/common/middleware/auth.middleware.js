import jwt from 'jsonwebtoken';
import getConfig from '../../config/configuration.js';

function getJwtSecret() {
  const config = getConfig();
  return config.jwt?.secret || 'fallback_secret_key';
}

function getJwtExpiresIn() {
  const config = getConfig();
  return config.jwt?.expiresIn || '24h';
}

/** Sign access token — payload shape matches legacy Fastify: { email, sub }. */
export function signAccessToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() });
}

/** Decode without verify (optional auth paths). */
export function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

/**
 * Require Bearer JWT. Sets req.user with id = Number(sub).
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = {
      ...payload,
      id:
        payload.id != null
          ? Number(payload.id)
          : payload.sub != null
            ? Number(payload.sub)
            : undefined,
    };
    return next();
  } catch {
    return res.status(401).json({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}
