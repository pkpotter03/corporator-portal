import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Single shared-password gate for the /staff section. No user accounts, no
 * session store — the cookie is a constant HMAC of a fixed string, keyed by
 * a server-only secret, so it can't be forged without knowing that secret,
 * but there's nothing to look up on each request either.
 */

export const STAFF_SESSION_COOKIE = "staff_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be set to use the staff login gate.");
  }
  return secret;
}

export function getExpectedSessionToken(): string {
  return createHmac("sha256", getSessionSecret()).update("staff-authenticated").digest("hex");
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.STAFF_PASSWORD;
  if (!expected) {
    throw new Error("STAFF_PASSWORD must be set to use the staff login gate.");
  }
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  // timingSafeEqual requires equal-length buffers; mismatched length is
  // already a "no", so pad to the same length before the real compare.
  if (inputBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(inputBuf, expectedBuf);
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const expected = getExpectedSessionToken();
  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(expected);
  if (tokenBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(tokenBuf, expectedBuf);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
