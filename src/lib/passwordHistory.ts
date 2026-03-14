import { sql } from "@vercel/postgres";
import { randomUUID } from "crypto";
import { verifyPassword } from "@/lib/bcrypt";

export async function isPasswordReusedRecently(
  userId: string,
  candidatePassword: string,
  historyLimit = 3
): Promise<boolean> {
  if (!userId || !candidatePassword) return false;

  const result = await sql`
    SELECT password_hash
    FROM password_history
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${historyLimit}
  `;

  for (const row of result.rows as Array<{ password_hash: string }>) {
    const hash = row.password_hash;
    if (!hash) continue;
    const matches = await verifyPassword(candidatePassword, hash);
    if (matches) return true;
  }

  return false;
}

export async function recordPasswordInHistory(
  userId: string,
  passwordHash: string
): Promise<void> {
  if (!userId || !passwordHash) return;

  const id = randomUUID();

  await sql`
    INSERT INTO password_history (id, user_id, password_hash)
    VALUES (${id}, ${userId}, ${passwordHash})
  `;
}
