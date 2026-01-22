import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { hashPassword } from "@/lib/bcrypt";
import { validatePasswordComplexity } from "@/lib/passwordPolicy";
import {
  isPasswordReusedRecently,
  recordPasswordInHistory,
} from "@/lib/passwordHistory";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = (body.token || "").toString().trim();
    const password = (body.password || "").toString();

    if (!token || !password) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const complexityErrors = validatePasswordComplexity(password);

    if (complexityErrors.length > 0) {
      return NextResponse.json({ error: "weak_password" }, { status: 400 });
    }

    const tokenResult = await sql`
      SELECT prt.id, prt.user_id
      FROM password_reset_tokens prt
      WHERE prt.token = ${token}
        AND prt.used_at IS NULL
        AND prt.expires_at > now()
      LIMIT 1
    `;

    const row = tokenResult.rows[0];

    if (!row) {
      return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });
    }

    const reused = await isPasswordReusedRecently(row.user_id as string, password, 3);

    if (reused) {
      return NextResponse.json({ error: "recent_password" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    await sql`BEGIN`;
    try {
      await sql`
        UPDATE users
        SET password_hash = ${passwordHash}, failed_login_attempts = 0, locked_at = NULL, status = 'active', updated_at = now()
        WHERE id = ${row.user_id}
      `;

      await recordPasswordInHistory(row.user_id as string, passwordHash);

      await sql`
        UPDATE password_reset_tokens
        SET used_at = now()
        WHERE id = ${row.id}
      `;

      await sql`COMMIT`;
    } catch (e) {
      await sql`ROLLBACK`;
      throw e;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in reset-password handler", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
