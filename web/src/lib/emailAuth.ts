import { randomInt, randomUUID } from "crypto";
import { sql } from "@vercel/postgres";
import { hashPassword, verifyPassword } from "@/lib/bcrypt";
import { sendEmailVerificationEmail, sendLoginMfaEmail } from "@/lib/email";

const EMAIL_VERIFICATION_TTL_HOURS = 24;
const LOGIN_MFA_TTL_MINUTES = 10;
const LOGIN_MFA_MAX_ATTEMPTS = 5;

function getAppBaseUrlForEmail() {
  const raw =
    process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.VERCEL_URL || "";

  if (!raw) {
    return "";
  }

  return raw.startsWith("http") ? raw : `https://${raw}`;
}

function buildEmailPath(pathname: string) {
  const baseUrl = getAppBaseUrlForEmail();
  return baseUrl ? `${baseUrl}${pathname}` : pathname;
}

export async function ensureEmailAuthSchema() {
  try {
    const emailVerifiedColumnResult = await sql<{
      column_name: string;
    }>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'email_verified_at'
      LIMIT 1
    `;

    if (emailVerifiedColumnResult.rows.length === 0) {
      await sql`
        ALTER TABLE users
        ADD COLUMN email_verified_at TIMESTAMPTZ
      `;

      await sql`
        UPDATE users
        SET email_verified_at = created_at
        WHERE email_verified_at IS NULL
      `;
    }

    await sql`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS login_mfa_challenges (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash TEXT NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id_expires_at
      ON email_verification_tokens (user_id, expires_at DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_login_mfa_challenges_user_id_expires_at
      ON login_mfa_challenges (user_id, expires_at DESC)
    `;
  } catch (error) {
    console.error("Error ensuring email auth schema", error);
  }
}

export async function createEmailVerificationChallenge(params: {
  userId: string;
}) {
  await ensureEmailAuthSchema();

  const challengeId = randomUUID();
  const token = randomUUID();
  const tokenHash = await hashPassword(token);
  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  await sql`
    DELETE FROM email_verification_tokens
    WHERE user_id = ${params.userId}
      AND used_at IS NULL
  `;

  await sql`
    INSERT INTO email_verification_tokens (
      id,
      user_id,
      token_hash,
      expires_at
    )
    VALUES (
      ${challengeId},
      ${params.userId},
      ${tokenHash},
      ${expiresAt}
    )
  `;

  return { challengeId, token };
}

export async function sendEmailVerificationChallenge(params: {
  userId: string;
  email: string;
}) {
  const challenge = await createEmailVerificationChallenge({
    userId: params.userId,
  });

  const verifyUrl = buildEmailPath(
    `/verify-email/${encodeURIComponent(challenge.challengeId)}?token=${encodeURIComponent(challenge.token)}`,
  );

  await sendEmailVerificationEmail({
    to: params.email,
    verifyUrl,
  });

  return challenge;
}

export async function createLoginMfaChallenge(params: { userId: string }) {
  await ensureEmailAuthSchema();

  const challengeId = randomUUID();
  const code = randomInt(100000, 1000000).toString();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(
    Date.now() + LOGIN_MFA_TTL_MINUTES * 60 * 1000,
  ).toISOString();

  await sql`
    DELETE FROM login_mfa_challenges
    WHERE user_id = ${params.userId}
      AND used_at IS NULL
  `;

  await sql`
    INSERT INTO login_mfa_challenges (
      id,
      user_id,
      code_hash,
      expires_at
    )
    VALUES (
      ${challengeId},
      ${params.userId},
      ${codeHash},
      ${expiresAt}
    )
  `;

  return { challengeId, code };
}

export async function sendLoginMfaChallenge(params: {
  userId: string;
  email: string;
}) {
  const challenge = await createLoginMfaChallenge({ userId: params.userId });

  await sendLoginMfaEmail({
    to: params.email,
    code: challenge.code,
  });

  return challenge;
}

export async function verifyEmailVerificationChallenge(params: {
  challengeId: string;
  token: string;
}) {
  await ensureEmailAuthSchema();

  const result = await sql<{
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: string;
    used_at: string | null;
    email_verified_at: string | null;
    email: string;
  }>`
    SELECT evt.id, evt.user_id, evt.token_hash, evt.expires_at, evt.used_at, u.email_verified_at, u.email
    FROM email_verification_tokens evt
    JOIN users u ON u.id = evt.user_id
    WHERE evt.id = ${params.challengeId}
    LIMIT 1
  `;

  const row = result.rows[0];

  if (!row) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (row.email_verified_at) {
    return { ok: false as const, reason: "already_verified" as const };
  }

  if (row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false as const, reason: "expired" as const };
  }

  const tokenOk = await verifyPassword(params.token, row.token_hash);

  if (!tokenOk) {
    return { ok: false as const, reason: "invalid" as const };
  }

  await sql`
    BEGIN
  `;

  try {
    await sql`
      UPDATE users
      SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now()
      WHERE id = ${row.user_id}
    `;

    await sql`
      UPDATE email_verification_tokens
      SET used_at = now()
      WHERE id = ${row.id}
    `;

    await sql`
      COMMIT
    `;
  } catch (error) {
    await sql`
      ROLLBACK
    `;
    throw error;
  }

  return {
    ok: true as const,
    userId: row.user_id,
    email: row.email,
    alreadyVerified: false as const,
  };
}

export async function verifyLoginMfaChallenge(params: {
  challengeId: string;
  code: string;
}) {
  await ensureEmailAuthSchema();

  const result = await sql<{
    id: string;
    user_id: string;
    code_hash: string;
    attempts: number | null;
    expires_at: string;
    used_at: string | null;
    email: string;
  }>`
    SELECT lc.id, lc.user_id, lc.code_hash, lc.attempts, lc.expires_at, lc.used_at, u.email
    FROM login_mfa_challenges lc
    JOIN users u ON u.id = lc.user_id
    WHERE lc.id = ${params.challengeId}
    LIMIT 1
  `;

  const row = result.rows[0];

  if (!row) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false as const, reason: "expired" as const };
  }

  const codeOk = await verifyPassword(params.code, row.code_hash);

  if (!codeOk) {
    const attempts = (row.attempts ?? 0) + 1;

    await sql`
      UPDATE login_mfa_challenges
      SET attempts = ${attempts},
          used_at = CASE WHEN ${attempts} >= ${LOGIN_MFA_MAX_ATTEMPTS} THEN now() ELSE used_at END
      WHERE id = ${row.id}
    `;

    return {
      ok: false as const,
      reason:
        attempts >= LOGIN_MFA_MAX_ATTEMPTS
          ? ("expired" as const)
          : ("invalid" as const),
    };
  }

  await sql`
    UPDATE login_mfa_challenges
    SET used_at = now()
    WHERE id = ${row.id}
  `;

  return {
    ok: true as const,
    userId: row.user_id,
    email: row.email,
  };
}

export async function resendEmailVerificationByEmail(email: string) {
  await ensureEmailAuthSchema();

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return { ok: false as const, reason: "missing_email" as const };
  }

  const userResult = await sql<{
    id: string;
    email_verified_at: string | null;
    email: string;
  }>`
    SELECT id, email_verified_at, email
    FROM users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `;

  const user = userResult.rows[0];

  if (!user || user.email_verified_at) {
    return { ok: true as const };
  }

  try {
    await sendEmailVerificationChallenge({
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error("Error resending verification email", error);
    return { ok: false as const, reason: "missing_email_service" as const };
  }

  return { ok: true as const };
}
