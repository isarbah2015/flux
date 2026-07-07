import type { RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { logger } from "../lib/logger";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

// Firebase signs ID tokens with rotating Google keys published here (JWK set).
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

/**
 * Authenticates a request from a Firebase ID token in `Authorization: Bearer`.
 *
 * When FIREBASE_PROJECT_ID is unset (local dev), auth is disabled and every
 * request is attributed to a single `local-dev` user so the API is usable
 * without Firebase. Set FIREBASE_PROJECT_ID to enforce real per-user auth.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  if (!FIREBASE_PROJECT_ID) {
    req.userId = "local-dev";
    next();
    return;
  }

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    if (!payload.sub) {
      res.status(401).json({ error: "Token has no subject" });
      return;
    }
    req.userId = payload.sub;
    next();
  } catch (err) {
    logger.warn({ err }, "Firebase token verification failed");
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

/** Non-null accessor for the authenticated user id inside a protected route. */
export function userId(req: { userId?: string }): string {
  if (!req.userId) throw new Error("userId accessed on an unauthenticated request");
  return req.userId;
}
