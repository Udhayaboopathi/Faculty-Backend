// src/utils/jwt.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-.env";
const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || "1h";

/**
 * Create a signed JWT access token.
 * @param {object} payload - Claims to embed (keep it small: sub, role, email, etc.)
 * @param {object} [opts] - jwt.sign options override
 */
export function signAccessToken(payload, opts = {}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL, ...opts });
}

/**
 * Verify an access token. Returns decoded claims or null if invalid/expired.
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Express middleware to protect routes with Bearer token.
 * Sets req.user = decoded claims.
 */
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing Authorization header" });

  const decoded = verifyAccessToken(token);
  if (!decoded) return res.status(401).json({ error: "Invalid or expired token" });

  req.user = decoded;
  return next();
}
