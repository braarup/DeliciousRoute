import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { sql } from "@vercel/postgres";

const SESSION_COOKIE_NAME = "dr_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const LOGIN_MFA_CHALLENGE_COOKIE_NAME = "dr_login_mfa_challenge";
const LOGIN_MFA_CHALLENGE_COOKIE_MAX_AGE_SECONDS = 60 * 15; // 15 minutes

export async function createSession(userId: string) {
  const sessionId = randomUUID();

  await sql`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${sessionId}, ${userId}, now() + interval '30 days')
  `;

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getCurrentUser() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE_NAME)?.value;

  if (!session) return null;

  const result = await sql`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ${session}
      AND s.revoked_at IS NULL
      AND (s.expires_at IS NULL OR s.expires_at > now())
    LIMIT 1
  `;

  return result.rows[0] ?? null;
}

export async function destroySession() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE_NAME)?.value;

  if (!session) return;

  await sql`
    UPDATE sessions
    SET revoked_at = now()
    WHERE id = ${session}
  `;

  store.delete(SESSION_COOKIE_NAME);
}

export async function setLoginMfaChallengeCookie(challengeId: string) {
  const store = await cookies();

  store.set(LOGIN_MFA_CHALLENGE_COOKIE_NAME, challengeId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LOGIN_MFA_CHALLENGE_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function getLoginMfaChallengeCookie() {
  const store = await cookies();
  return store.get(LOGIN_MFA_CHALLENGE_COOKIE_NAME)?.value ?? null;
}

export async function clearLoginMfaChallengeCookie() {
  const store = await cookies();
  store.delete(LOGIN_MFA_CHALLENGE_COOKIE_NAME);
}

export async function getAccountLandingPath(userId: string) {
  const rolesResult = await sql`
    SELECT r.name
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ${userId}
  `;

  const roleNames = rolesResult.rows.map((row) =>
    (row.name as string).toLowerCase(),
  );

  const isVendor = roleNames.includes("vendor_admin");

  return isVendor ? "/vendor/profile" : "/customer/profile";
}
